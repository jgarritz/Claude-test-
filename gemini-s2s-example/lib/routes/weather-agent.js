const { getWeather } = require('../utils');
const { getAgentByPhoneNumber, getDefaultAgent } = require('../db/agents');
const { getToolsByAgentId } = require('../db/tools');
const { createCallLog, endCallLog, appendTranscription } = require('../db/call-logs');
const { getItemByCallSid } = require('../db/batch-calls');

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
    const batchItem = await getItemByCallSid(session.call_sid);
    if (batchItem && batchItem.vars) {
      const vars = batchItem.vars;
      const varLines = Object.entries(vars)
        .map(([key, val]) => `- ${key}: ${val}`)
        .join('\n');
      systemPrompt += `\n\nVariables de esta llamada:\n${varLines}\n\nIMPORTANTE: Ya se reprodujo un saludo inicial pregrabado. NO repitas el saludo. Espera a que la persona hable y continúa la conversación naturalmente usando las variables.`;
      logger.info({ vars }, 'injected batch call variables into prompt');
    }

    // Build tool declarations from database
    const functionDeclarations = tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));

    // Determine which greeting URL to use
    const greetingUrl = (batchItem && batchItem.greeting_url) || agent.initial_greeting_url;

    const s = session
      .answer();

    // dub is non-blocking: starts audio and immediately continues to llm
    // Gemini begins connecting while greeting plays
    if (greetingUrl) {
      s.dub({ action: 'addTrack', track: 'greeting', play: greetingUrl });
      logger.info({ greetingUrl }, 'dub greeting queued before llm');
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
  const { logger, callLogId } = session.locals;
  logger.info({ code, reason }, `session ${session.call_sid} closed`);

  if (callLogId) {
    await endCallLog(callLogId);
  }
};

const onError = (session, err) => {
  const { logger } = session.locals;
  logger.error({ err }, `session ${session.call_sid} received error`);
};

module.exports = service;
