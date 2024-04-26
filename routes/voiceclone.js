const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function getStream(filePath) {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath);
        stream.on('open', () => resolve(stream));
        stream.on('error', error => reject(error));
    });
}

async function clone() {
    const voiceClonesDir = path.join(__dirname, '../public/voice_clones');
    const audioFiles = fs.readdirSync(voiceClonesDir);
    const voiceIdMap = {};

    for (const file of audioFiles) {
        const filePath = path.join(voiceClonesDir, file);

        try {
            const fileStream = await getStream(filePath);
            console.log(`Preparing to clone ${file.split('.')[0]} voice`);

            const addUrl = "https://api.elevenlabs.io/v1/voices/add";
            const formData = new FormData();
            formData.append('files', fs.createReadStream(filePath));
            formData.append('name', file);
            formData.append('labels', JSON.stringify({ accent: "American" }));
            formData.append('description', `Cloned from ${file}`);

            const response = await axios.post(addUrl, formData, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'multipart/form-data',
                    'xi-api-key': process.env.ELEVEN_LABS, // Ideally use process.env.EL_TOKEN for security
                    ...formData.getHeaders()
                },
                timeout: 30000
            });
            console.log("what is the response??");
            console.log(response);
           
            if (response.status === 200) {
                const clonedVoiceId = response.data.voice_id;
                voiceIdMap[file.split('.')[0]] = clonedVoiceId;
                console.log(`Successfully cloned ${file.split('.')[0]}: ID ${clonedVoiceId}`);
            } else {
                console.error(`Failed to clone ${file}: HTTP status code ${response.status}`);
            }
        } catch (error) {
            console.error(`Error while cloning ${file}: ${error.message}`);
        }
    }

    console.log("Completed cloning all voices.");
    console.log("Voice ID Map:", voiceIdMap);
    return voiceIdMap;
}





module.exports = { clone };
