const { getWeather } = require('../utils');
const { getAgentByPhoneNumber, getDefaultAgent } = require('../db/agents');
const { getToolsByAgentId } = require('../db/tools');
const { createCallLog, endCallLog, appendTranscription } = require('../db/call-logs');
const { getItemByCallSid, updateBatchItemResult, incrementBatchCounter } = require('../db/batch-calls');
const { logEvent } = require('../db/error-logs');
const { generateCallSummary } = require('../utils/summarize');
const supabase = require('../db/supabase');

const builtinHandlers = {
  get_weather: async (args, logger) => {
    const { location, scale = 'celsius' } = args;
    return await getWeather(location, scale, logger);
  }
};

const service = ({ logger: parentLogger, makeService }) => {
  const svc = makeService({ path: '/google-s2s' });

  svc.on('session:new', async (session, path) => {
    const logger = parentLogger.child({ call_sid: session.call_sid });
    logger.info({ session, path }, `new incoming call: ${session.call_sid}`);
    session.locals.logger = logger;

    const apiKey = process.env.GOOGLE_API_KEY;

    session
      .on('/event', onEvent.bind(null, session))
      .on('/toolCall', onToolCall.bind(null, session))
      .on('/final', onFinal.bind(null, session))
      .on('close', onClose.bind(null, session))
      .on('error', onError.bind(null, session));

    if (!apiKey) {
      logger.info('missing env GOOGLE_API_KEY, hanging up');
      session.hangup().send();
      return;
    }

    // Load agent config from Supabase
    const calledNumber = session.to || session.calledNumber;
    let agent = null;

    if (calledNumber) {
      agent = await getAgentByPhoneNumber(calledNumber);
      logger.info({ calledNumber, found: !!agent }, 'looked up agent by phone number');
    }

    if (!agent) {
      agent = await getDefaultAgent();
      logger.info({ found: !!agent }, 'using default agent');
    }

    if (!agent) {
      logger.error('no agent found in database, hanging up');
      logEvent({ type: 'call_flow', severity: 'error', message: 'No agent found', callSid: session.call_sid, metadata: { calledNumber } });
      session.hangup().send();
      return;
    }

    // Load tools for this agent
    const tools = await getToolsByAgentId(agent.id);
    logger.info({ agentName: agent.name, toolCount: tools.length }, 'loaded agent config');

    // Store agent info and tools in session for use in handlers
    session.locals.agent = agent;
    session.locals.tools = tools;
    session.locals.sequenceNum = 0;

    // Create call log
    const callLog = await createCallLog({
      agentId: agent.id,
      callSid: session.call_sid,
      caller: session.from || '',
      callee: calledNumber || ''
    });
    if (callLog) {
      session.locals.callLogId = callLog.id;
    }

    // Check if this is an outbound batch call with variables
    let systemPrompt = agent.system_prompt;
    let batchItem = null;
    try {
      batchItem = await getItemByCallSid(session.call_sid);
    } catch (err) {
      logger.warn({ err: err.message }, 'batch item lookup failed, ignoring');
    }
    if (batchItem) {
      session.locals.batchItem = batchItem;
      await updateBatchItemResult(session.call_sid, { status: 'answered', started_at: new Date().toISOString() });
    }
    if (batchItem && batchItem.vars) {
      const vars = batchItem.vars;
      const varLines = Object.entries(vars)
        .map(([key, val]) => `- ${key}: ${val}`)
        .join('\n');
      systemPrompt += `\n\nVariables de esta llamada:\n${varLines}\n\nIMPORTANTE: Esta es una llamada saliente. Ya se reprodujo un saludo pregrabado que presentó el motivo de la llamada. Cuando la persona hable por primera vez, responde de inmediato continuando la conversación de forma natural usando las variables.

DETECCIÓN DE BUZÓN DE VOZ: Si detectas que estás hablando con un buzón de voz o sistema automático (escuchas "deja tu mensaje después del tono", "grabe su mensaje", "marque uno para escuchar", "Para escuchar el mensaje marca uno", o cualquier menú automático), llama INMEDIATAMENTE la herramienta hang_up_call. No digas nada, no dejes mensaje, solo llama hang_up_call de inmediato.`;
      logger.info({ vars }, 'injected batch call variables into prompt');
    }

    // Build tool declarations from database + built-in hang_up_call
    const functionDeclarations = [
      {
        name: 'hang_up_call',
        description: 'Termina la llamada inmediatamente. Usar cuando se detecta buzón de voz o sistema automático.',
        parameters: { type: 'object', properties: {}, required: [] }
      },
      ...tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }))
    ];

    // Determine which greeting URL to use
    const greetingUrl = (batchItem && batchItem.greeting_url) || agent.initial_greeting_url;

    const s = session
      .answer()
      .pause({ length: 1 });

    // Play greeting before llm — user hears it immediately while Gemini connects
    if (greetingUrl) {
      s.play({ url: greetingUrl });
    }

    s.llm({
        vendor: 'google',
        model: agent.model,
        auth: { apiKey },
        actionHook: '/final',
        eventHook: '/event',
        toolHook: '/toolCall',
        ...(process.env.MCP_SERVER_URL && {
          mcpServers: [{ url: process.env.MCP_SERVER_URL }]
        }),
        llmOptions: {
          setup: {
            generationConfig: {
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: agent.voice_name
                  }
                },
                languageCode: agent.language_code
              }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            ...(functionDeclarations.length > 0 && !process.env.MCP_SERVER_URL && {
              tools: [{
                functionDeclarations
              }]
            })
          }
        }
      })
      .hangup()
      .send();
  });
};

const onToolCall = async (session, evt) => {
  const { logger, tools } = session.locals;
  logger.info({ evt }, 'got toolHook');

  const { function_calls, tool_call_id } = evt;
  const functionResponses = [];

  for (const functionCall of function_calls) {
    const { name, args, id } = functionCall;

    // Built-in: hang up immediately (used for voicemail detection)
    if (name === 'hang_up_call') {
      // If a real human has already spoken, this is a false positive — ignore it
      if (session.locals.humanConfirmed) {
        logger.warn('hang_up_call blocked — human already confirmed, not voicemail');
        session.sendToolOutput(tool_call_id, {
          toolResponse: { functionResponses: [{ response: { output: { text: 'Esta es una persona real, continúa la conversación.' } }, id }] }
        });
        return;
      }
      logger.info('hang_up_call triggered — voicemail detected, hanging up');
      // Mark buzon_de_voz immediately — don't wait for onClose + generateCallSummary
      const batchItem = session.locals.batchItem;
      if (batchItem) {
        session.locals.tipificacionOverride = 'buzon_de_voz';
        await updateBatchItemResult(session.call_sid, { tipificacion: 'buzon_de_voz' });
      }
      session.sendToolOutput(tool_call_id, {
        toolResponse: { functionResponses: [{ response: { output: { text: 'ok' } }, id }] }
      });
      setTimeout(() => session.hangup().send(), 300);
      return;
    }

    // Find the tool config from database
    const tool = tools.find(t => t.name === name);

    if (tool && tool.handler_type === 'builtin' && builtinHandlers[tool.handler_config.builtin]) {
      try {
        const result = await builtinHandlers[tool.handler_config.builtin](args, logger);
        logger.info({ result }, `builtin tool ${name} executed`);
        functionResponses.push({ response: { output: result }, id });
      } catch (err) {
        logger.error({ err }, `builtin tool ${name} failed`);
        functionResponses.push({
          response: { output: { text: `Error ejecutando ${name}. Intenta más tarde.` } },
          id
        });
      }
    } else if (tool && tool.handler_type === 'webhook') {
      try {
        const axios = require('axios');
        const { url, method = 'POST' } = tool.handler_config;
        const res = await axios({ method, url, data: args });
        logger.info({ result: res.data }, `webhook tool ${name} executed`);
        functionResponses.push({ response: { output: res.data }, id });
      } catch (err) {
        logger.error({ err }, `webhook tool ${name} failed`);
        functionResponses.push({
          response: { output: { text: `Error ejecutando ${name}. Intenta más tarde.` } },
          id
        });
      }
    } else {
      functionResponses.push({ response: { text: 'ok' }, id });
    }
  }

  session.sendToolOutput(tool_call_id, { toolResponse: { functionResponses } });
};

const onFinal = async (session, evt) => {
  const { logger, callLogId } = session.locals;
  logger.info(`got actionHook: ${JSON.stringify(evt)}`);

  // Capture SIP cause from jambonz event
  const sipStatus = evt?.sip_status || evt?.call_status || null;
  const sipReason = evt?.sip_reason || evt?.call_termination_by || null;
  session.locals.sipStatus = sipStatus;
  session.locals.sipReason = sipReason;

  if (callLogId) {
    await endCallLog(callLogId);
  }

  session
    .say({ text: 'Lo siento, tu sesión ha terminado. ¡Hasta luego!' })
    .hangup()
    .reply();
};

const onEvent = async (session, evt) => {
  const { logger, callLogId } = session.locals;

  if (!callLogId) return;

  let role = null;
  let content = null;

  // Gemini input transcription (what the user said)
  if (evt.server_content?.input_transcription?.text) {
    role = 'user';
    content = evt.server_content.input_transcription.text;
  }
  // Gemini output transcription (what the agent said) - comes in chunks, accumulate
  else if (evt.server_content?.output_transcription?.text) {
    role = 'model';
    content = evt.server_content.output_transcription.text;
  }

  if (role && content && content.trim()) {
    if (role === 'user') session.locals.humanConfirmed = true;
    session.locals.sequenceNum = (session.locals.sequenceNum || 0) + 1;
    await appendTranscription({
      callLogId,
      role,
      content: content.trim(),
      sequenceNum: session.locals.sequenceNum
    });
    logger.info({ role, content: content.trim() }, 'transcription saved');
  }
};

const onClose = async (session, code, reason) => {
  const { logger, callLogId, sipStatus, sipReason, agent } = session.locals;
  logger.info({ code, reason }, `session ${session.call_sid} closed`);

  if (callLogId) {
    await endCallLog(callLogId);
  }

  if (code !== 1000 && code !== 1001) {
    logEvent({
      type: 'gemini',
      severity: 'warn',
      message: `Session closed unexpectedly: code=${code} reason=${reason}`,
      callSid: session.call_sid,
      agentId: agent?.id
    });
  }

  // Generate summary and save results for batch calls
  const batchItem = session.locals.batchItem;
  if (batchItem) {
    try {
      let summary = null;
      let tipificacion = session.locals.tipificacionOverride || null;

      if (callLogId && !tipificacion) {
        const { data: transcriptions } = await supabase
          .from('transcriptions')
          .select('role, content, sequence_num')
          .eq('call_log_id', callLogId)
          .order('sequence_num');

        ({ summary, tipificacion } = await generateCallSummary(transcriptions || []));
      }

      // Fallback: SIP 504 on answered calls = voicemail timeout
      if (!tipificacion && sipStatus === 504) {
        tipificacion = 'buzon_de_voz';
      }

      const update = {
        status: 'completed',
        sip_status: sipStatus,
        sip_reason: sipReason,
        ended_at: new Date().toISOString(),
        ...(summary && { summary }),
        ...(tipificacion && { tipificacion })
      };

      await updateBatchItemResult(session.call_sid, update);

      await incrementBatchCounter(batchItem.batch_id, 'completed');
      logger.info({ callSid: session.call_sid, tipificacion, summary }, 'batch call result saved');
    } catch (err) {
      logger.warn({ err: err.message }, 'failed to save batch call result');
    }
  }
};

const onError = (session, err) => {
  const { logger } = session.locals;
  logger.error({ err }, `session ${session.call_sid} received error`);

  const errMsg = err?.message || err?.reason || JSON.stringify(err);
  const isRateLimit = errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429') || errMsg.includes('rate');

  logEvent({
    type: isRateLimit ? 'gemini_rate_limit' : 'gemini',
    severity: isRateLimit ? 'warn' : 'error',
    message: errMsg,
    callSid: session.call_sid,
    agentId: session.locals.agent?.id,
    metadata: { error: errMsg }
  });
};

module.exports = service;
