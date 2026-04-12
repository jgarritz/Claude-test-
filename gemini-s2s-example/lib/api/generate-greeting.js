const express = require('express');
const axios = require('axios');
const supabase = require('../db/supabase');
const router = express.Router();

router.post('/', async (req, res) => {
  const { logger } = req.app.locals;

  try {
    const { voice_name, text, agent_id } = req.body;

    if (!voice_name || !text || !agent_id) {
      return res.status(400).json({ error: 'voice_name, text, and agent_id are required' });
    }

    logger.info({ voice_name, text, agent_id }, 'generating greeting audio');

    // 1. Call Gemini TTS to generate audio
    const apiKey = process.env.GOOGLE_API_KEY;
    const ttsResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          response_modalities: ['AUDIO'],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name
              }
            }
          }
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const audioBase64 = ttsResponse.data.candidates[0].content.parts[0].inlineData.data;
    const pcmBuffer = Buffer.from(audioBase64, 'base64');

    // 2. Build WAV file from PCM data (16bit, 24kHz, mono)
    const wavBuffer = buildWav(pcmBuffer);

    // 3. Upload to Supabase Storage
    const fileName = `greeting-${agent_id}-${Date.now()}.wav`;

    const { error: uploadError } = await supabase.storage
      .from('greetings')
      .upload(fileName, wavBuffer, {
        contentType: 'audio/wav',
        upsert: true
      });

    if (uploadError) {
      logger.error({ uploadError }, 'failed to upload to Supabase Storage');
      return res.status(500).json({ error: 'Failed to upload audio' });
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from('greetings')
      .getPublicUrl(fileName);

    const url = urlData.publicUrl;

    // 5. Update agent record with greeting URL
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        initial_greeting: text,
        initial_greeting_url: url
      })
      .eq('id', agent_id);

    if (updateError) {
      logger.error({ updateError }, 'failed to update agent');
      return res.status(500).json({ error: 'Failed to update agent' });
    }

    logger.info({ url, agent_id }, 'greeting generated and saved');
    res.json({ url });

  } catch (err) {
    const { logger } = req.app.locals;
    logger.error({ err: err.message }, 'error generating greeting');
    res.status(500).json({ error: err.message });
  }
});

function buildWav(pcmBuffer) {
  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);       // chunk size
  header.writeUInt16LE(1, 20);        // PCM format
  header.writeUInt16LE(1, 22);        // mono
  header.writeUInt32LE(24000, 24);    // sample rate
  header.writeUInt32LE(48000, 28);    // byte rate
  header.writeUInt16LE(2, 32);        // block align
  header.writeUInt16LE(16, 34);       // bits per sample

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([header, pcmBuffer]);
}

module.exports = router;
