const axios = require('axios');
const fs = require('fs').promises;
const el_token = process.env.ELEVEN_LABS;
const os = require('os');
const path = require('path');
async function tts(id, text) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}`;

    const headers = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': el_token
    };

    const data = {
        text: text,
        model_id: 'eleven_multilingual_v1',
        voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
        }
    };

    try {
        const response = await axios.post(url, data, { headers: headers, responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (error) {
        console.error('Failed to fetch TTS audio:', error);
        throw new Error('Failed to fetch TTS audio');
    }
}

module.exports = { tts };
