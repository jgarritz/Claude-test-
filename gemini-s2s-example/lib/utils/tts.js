const axios = require('axios');
const supabase = require('../db/supabase');

/**
 * Generate TTS audio via Gemini, build WAV, upload to Supabase Storage.
 * Returns the public URL of the uploaded WAV file.
 */
async function generateTtsUrl({ text, voiceName, filePrefix = 'tts', logger }) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');

  if (logger) logger.info({ text, voiceName }, 'generating TTS audio');

  const ttsResponse = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: { voice_name: voiceName }
          }
        }
      }
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  const audioBase64 = ttsResponse.data.candidates[0].content.parts[0].inlineData.data;
  const pcmBuffer = Buffer.from(audioBase64, 'base64');
  const wavBuffer = buildWav(pcmBuffer);

  const fileName = `${filePrefix}-${Date.now()}.wav`;

  const { error: uploadError } = await supabase.storage
    .from('greetings')
    .upload(fileName, wavBuffer, {
      contentType: 'audio/wav',
      upsert: true
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('greetings')
    .getPublicUrl(fileName);

  if (logger) logger.info({ url: urlData.publicUrl }, 'TTS audio uploaded');

  return urlData.publicUrl;
}

function buildWav(pcmBuffer) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuffer.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(24000, 24);
  header.writeUInt32LE(48000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmBuffer.length, 40);
  return Buffer.concat([header, pcmBuffer]);
}

module.exports = { generateTtsUrl };
