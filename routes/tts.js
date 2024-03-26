const axios = require('axios');
const { Readable } = require('stream');
const { spawn } = require('child_process');

async function tts(id, text, elToken) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${id}`;

    const headers = {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elToken
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
        const response = await axios.post(url, data, { headers: headers, responseType: 'stream' });
        if (response.status === 200) {
            const audioStream = response.data;
            const audioBuffer = await streamToBuffer(audioStream);
            return audioBuffer;
        } else {
            throw new Error('Failed to fetch TTS audio');
        }
    } catch (error) {
        throw new Error('Failed to fetch TTS audio');
    }
}

async function streamToBuffer(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
            chunks.push(chunk);
        });
        stream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        stream.on('error', (error) => {
            reject(error);
        });
    });
}

module.exports = { tts };
