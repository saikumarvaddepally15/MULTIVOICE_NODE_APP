const axios = require('axios');

async function translation(orgDialogues, lang, openaiToken) {
    const prompt = `Translate the following conversations to "${lang}" while maintaining relevant context and ensuring that the output duration matches the start_time and end_time. Add special characters like .... or ---- where necessary based on the context. Provide the output in JSON code format for easy copying and pasting. My goal is to use this text for TTS (Text-to-Speech) purposes. Please make sure the translations are accurate and fluent.
    Input format : 
    ${JSON.stringify(orgDialogues)}
    Output format = [dialogue, dialogue,..]
    Don't include time stamps in output`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4",
        messages: [
            { "role": "system", "content": "Translate the dialogues." },
            { "role": "user", "content": prompt }
        ],
        max_tokens: 1500
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiToken}`
        }
    });

    const translatedText = response.data.choices[0].message.content;
    const dialogueLines = translatedText.match(/"([^"]*)"/g).map(str => str.replace(/"/g, ''));

    const translatedDialogues = orgDialogues.map((dialogue, index) => {
        dialogue.text = dialogueLines[index];
        return dialogue;
    });

    return translatedDialogues;
}

module.exports = { translation };
