const fs = require('fs');
const path = require('path');
const axios = require('axios');

function clone() {
    
    const voiceClonesDir = 'voice_clones';
    const audioFiles = fs.readdirSync(voiceClonesDir);
    const voiceIdMap = {};
    let count = 0;

    for (const file of audioFiles) {
        count++;
        const filePath = path.join(voiceClonesDir, file);
        const fileData = fs.readFileSync(filePath);

        console.log(`Cloning ${file.split('.')[0]} Voice`);

        const addUrl = "https://api.elevenlabs.io/v1/voices/add";
        const headers = {
            "Accept": "application/json",
            "xi-api-key":"9cc80a1ca55d633d0f39ff7fd14013dc" // Assuming EL_TOKEN is stored as an environment variable
        };

        const data = {
            name: file,
            labels: '{"accent": "American"}',
            description: `Cloned from ${file}`
        };

        const formData = new FormData();
        formData.append('files', fileData, file);

        axios.post(addUrl, formData, {
            headers: {
                ...headers,
                ...formData.getHeaders()
            },
            data: data
        })
        .then(response => {
            if (response.status === 200) {
                const clonedVoiceId = response.data.voice_id;
                voiceIdMap[file.split('.')[0]] = clonedVoiceId;
            } else {
                console.error(`Failed to clone ${file}: HTTP status code ${response.status}`);
            }
        })
        .catch(error => {
            console.error(`Failed to clone ${file}: ${error.message}`);
        });
    }

    if (count === audioFiles.length && count !== 0) {
        console.log("Cloned all the voices.");
        return voiceIdMap;
    }
}

module.exports = { clone };
