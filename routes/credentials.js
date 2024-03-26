const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

 const credentials= async (req, res) => {
    const el_token = "9cc80a1ca55d633d0f39ff7fd14013dc";
    const openai_token = "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";
    console.log(openai_token,el_token);

    if (!openai_token || !el_token) {
        return res.status(400).json({ error: 'Missing API keys in environment variables' });
    }

    try {
        await validateOpenAIToken(openai_token);
        await validateElevenLabsToken(el_token);
       // res.status(200).json({ success: 'API Keys are valid' });
       next();
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

async function validateOpenAIToken(token) {
    try {
        const response = await axios.get('https://api.openai.com/v1/engines', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status !== 200) {
            throw new Error('Enter valid OpenAI token');
        }
    } catch (error) {
        throw new Error('Enter valid OpenAI token');
    }
}

async function validateElevenLabsToken(token) {
    try {
        const response = await axios.get('https://api.elevenlabs.io/v1/models', {
            headers: {
                'Accept': 'application/json',
                'xi-api-key': token
            }
        });
        if (response.status !== 200) {
            throw new Error('Enter valid ElevenLabs token');
        }
    } catch (error) {
        throw new Error('Enter valid ElevenLabs token');
    }
}

module.exports = { credentials };