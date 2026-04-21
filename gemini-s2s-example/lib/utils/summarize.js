const axios = require('axios');

async function generateCallSummary(transcriptions) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || !transcriptions || transcriptions.length === 0) return { summary: null, tipificacion: null };

  // If the agent spoke but the caller never responded, it's voicemail
  const userTurns = transcriptions.filter(t => t.role === 'user');
  const modelTurns = transcriptions.filter(t => t.role === 'model');
  if (modelTurns.length > 0 && userTurns.length === 0) {
    return { summary: 'Llamada contestada por buzón de voz, sin respuesta humana.', tipificacion: 'buzon_de_voz' };
  }

  const transcript = transcriptions
    .sort((a, b) => a.sequence_num - b.sequence_num)
    .map(t => `${t.role === 'user' ? 'Cliente' : 'Agente'}: ${t.content}`)
    .join('\n');

  const prompt = `Analiza esta transcripción de una llamada de cobro y responde SOLO con JSON válido, sin markdown, sin explicaciones.

Transcripción:
${transcript}

Responde exactamente con este formato JSON:
{
  "tipificacion": "<uno de: buzon_de_voz | contacto_exitoso | contacto_no_exitoso | contacto_parcial>",
  "resumen": "<resumen en máximo 3 oraciones: qué dijo el cliente y cuál fue el resultado>"
}

Criterios de tipificación:
- buzon_de_voz: la llamada fue contestada por un buzón de voz o sistema automático. Señales: "deja tu mensaje después del tono", "grabe su mensaje", "marque uno para escuchar", menús de opciones numéricas del buzón, el cliente nunca habla directamente, el agente repite el mismo mensaje varias veces
- contacto_exitoso: el cliente (persona real) prometió pagar, dio fecha de pago, o realizó un compromiso concreto
- contacto_parcial: hubo contacto con persona real pero pidió llamar después, no tenía información, o la llamada fue muy breve
- contacto_no_exitoso: el cliente (persona real) se negó a pagar, colgó, o no hubo acuerdo`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const parsed = JSON.parse(raw);
    console.log('[summarize] tipificacion:', parsed.tipificacion, '| summary:', parsed.resumen?.substring(0, 60));
    return { summary: parsed.resumen || null, tipificacion: parsed.tipificacion || null };
  } catch (err) {
    console.error('[summarize] failed:', err.response?.data || err.message);
    return { summary: null, tipificacion: null };
  }
}

module.exports = { generateCallSummary };
