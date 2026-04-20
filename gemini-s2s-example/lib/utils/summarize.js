const axios = require('axios');

async function generateCallSummary(transcriptions) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || !transcriptions || transcriptions.length === 0) return null;

  const transcript = transcriptions
    .sort((a, b) => a.sequence_num - b.sequence_num)
    .map(t => `${t.role === 'user' ? 'Cliente' : 'Agente'}: ${t.content}`)
    .join('\n');

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: `Resume esta llamada de cobro en máximo 3 oraciones. Indica: si contestó, qué dijo el cliente, y el resultado de la llamada.\n\nTranscripción:\n${transcript}\n\nResumen:`
          }]
        }]
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

module.exports = { generateCallSummary };
