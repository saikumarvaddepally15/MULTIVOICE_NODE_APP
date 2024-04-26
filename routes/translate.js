const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();
const openaiToken = process.env.OPEN_AI; // Ensure you manage this securely

async function translation(jsonFilePath, lang) {
    const fileContent = await fs.readFile(jsonFilePath, 'utf8');   
    const orgDialogues = JSON.parse(fileContent);
   // console.log(orgDialogues);
    const prompt = `Translate the following conversations to "${lang}" while maintaining relevant context and ensuring that the output duration matches the start_time and end_time. Add special characters like .... or ---- where necessary based on the context. Provide the output in JSON code format for easy copying and pasting. My goal is to use this text for TTS (Text-to-Speech) purposes. Please make sure the translations are accurate and fluent.
    Input format : 
    ${JSON.stringify(orgDialogues.map(dialogue => [dialogue.text, dialogue.start_time, dialogue.end_time]))}
    Output format = [dialogue, dialogue,..]
    Don't include time stamps in output`;

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4",
            messages: [
                {"role": "system", "content": "Translate the dialogues."},
                {"role": "user", "content": prompt}
            ],
            max_tokens: 1500
        }, {
            headers: {
                'Authorization': `Bearer ${openaiToken}`
            }
        });

        const translatedText = response.data.choices[0].message.content;
        //console.log(translatedText);
        const dialogueLines = translatedText.match(/"([^"]*)"/g).map(str => str.replace(/"/g, ''));
       // console.log(dialogueLines);

        const translatedDialogues = orgDialogues.map((dialogue, index) => {
            return {...dialogue,
            text: dialogueLines[index] ? dialogueLines[index] : dialogue.text // Fallback to original if no translation is found
            }
        });
        return translatedDialogues;
    } catch (error) {
        console.error('Error during translation:', error);
        throw error; // Or handle error appropriately
    }
}
module.exports = { translation };
