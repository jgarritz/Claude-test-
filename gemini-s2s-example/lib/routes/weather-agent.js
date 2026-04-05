const { text } = require("express");
const { getWeather } = require("../utils");

const service = ({logger: parrentLogger, makeService}) => {
  const svc = makeService({path: '/google-s2s'});

  svc.on('session:new', (session, path) => {
    const logger = parrentLogger.child({call_sid: session.call_sid});
    logger.info({session, path}, `new incoming call: ${session.call_sid}`);
    session.locals.logger = logger;

    const apiKey = process.env.GOOGLE_API_KEY;

    session
      .on('/event', onEvent.bind(null, session))
      .on('/toolCall', onToolCall.bind(null, session))
      .on('/final', onFinal.bind(null, session))
      .on('close', onClose.bind(null, session))
      .on('error', onError.bind(null, session));


      if (!apiKey) {
        session.locals.logger.info('missing env GOOGLE_API_KEY, hanging up');
        session
          .hangup()
          .send();

        return;
      }

      session
        .answer()
        .pause({length: 1})
        .llm({
          vendor: 'google',
          model: 'models/gemini-3.1-flash-live-preview',
          auth: {
            apiKey
          },
          actionHook: '/final',
          eventHook: '/event',
          toolHook: '/toolCall',
          ...(process.env.MCP_SERVER_URL && {
            mcpServers: [
              {
                url: process.env.MCP_SERVER_URL,
              }
            ]
          }),
          llmOptions: {
            setup: {
              generationConfig: {
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Kore'
                    }
                  },
                  languageCode: 'es'
                }
              },
              systemInstruction: {
                parts: [
                  {
                    text: `Eres un agente conversacional amigable llamado Luna que habla exclusivamente en español.
Puedes ayudar con información del clima cuando el usuario lo solicite.
Reglas:
- IMPORTANTE: Al iniciar la conversación, saluda inmediatamente diciendo "¡Hola! Soy Luna, ¿en qué te puedo ayudar?" No esperes a que el usuario hable primero.
- Siempre responde en español, sin importar en qué idioma te hablen.
- Sé conciso y natural, como en una conversación telefónica real.
- Usa un tono cálido y profesional.
- Si no entiendes algo, pide que lo repitan amablemente.
- Cuando consultes el clima, da la temperatura en grados Celsius.
- Si el usuario quiere terminar la conversación, despídete amablemente.`,
                  }
                ]
              },
              ...(!process.env.MCP_SERVER_URL && {
                tools: [
                  {
                    functionDeclarations: [
                      {
                        name: 'get_weather',
                        description: 'Obtener el clima actual de una ubicación. Usa esta función cuando el usuario pregunte por el clima o temperatura de algún lugar.',
                        parameters: {
                          type: 'object',
                          properties: {
                            location: {
                              type: 'string',
                              description: 'La ciudad o ubicación para consultar el clima'
                            },
                            scale: {
                              type: 'string',
                              enum: ['celsius', 'fahrenheit'],
                              description: 'La escala de temperatura (por defecto celsius)'
                            }
                          },
                          required: ['location']
                        }
                      }
                    ]
                  }
                ]
              })
            }
          }
        })
        .hangup()
        .send();
  });
}

const onToolCall = async(session, evt) => {
  const {logger} = session.locals;

  logger.info({evt}, `got toolHook `);
  const {function_calls, tool_call_id} = evt;
  
  const functionResponses = [];
  for (const functionCall of function_calls) {
    const {name, args, id} = functionCall;
    if (name === 'get_weather') {
      try {
        const {location, scale = 'celsius'} = args;
        const weather = await getWeather(location, scale, logger);
        logger.info({weather}, 'got response from weather API');
        functionResponses.push({
          response: {
            output: weather,
          },
          id,
        });
      } catch (err) {
        functionResponses.push( {
          response: {
            output: {
              text: `No se pudo obtener el clima para ${location}. Por favor, intenta más tarde.`,
            },
          },
          id,
        });
      }
    } else {
      functionResponses.push( {
        response: {
          text: 'ok',
        },
        id,
      });
    }
  }

  session.sendToolOutput(tool_call_id, {
    toolResponse: {
      functionResponses,
  }});
};

const onFinal = async(session, evt) => {
  const {logger} = session.locals;
  logger.info(`got actionHook: ${JSON.stringify(evt)}`);
   
  session
    .say({text: 'Lo siento, tu sesión ha terminado. ¡Hasta luego!'})
    .hangup()
    .reply();
};

const onEvent = async(session, evt) => {
  const {logger} = session.locals;
  logger.info(`got eventHook: ${JSON.stringify(evt)}`);
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  logger.info({code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.error({err}, `session ${session.call_sid} received error`);
};


module.exports = service;