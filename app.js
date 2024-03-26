const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { initSessionState, voiceFolder } = require('./routes/utils');
const { credentials } = require('./routes/credentials');
const { extractAudio, generateAudio } =  require('./routes/audiohandler');
const { clone } = require('./routes/voiceclone');
const { translation } = require('./routes/translate');

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware for parsing JSON bodies
app.use(express.json());

// Middleware for handling file uploads
app.use(fileUpload());

// Initialize session state
initSessionState();

// Set page configuration
app.locals.title = "Multivoice";

// Routes
app.post('/credentials', credentials);

app.post('/upload',  async (req, res) => {
    try {
        // Handle file uploads
        const audioFile = req.files?.audio_file;
        const jsonFile = req.files?.json_file;
        console.log(audioFile,jsonFile);


        if (!audioFile || !jsonFile) {
            return res.status(400).send('Both audio file and JSON file are required');
        }

        // Save files to disk
        const audioFilePath = path.join(__dirname, '/public/data', audioFile.name);
        const jsonFilePath = path.join(__dirname, '/public/data', jsonFile.name);
        const outputDir = path.join(__dirname, '/public/voice_clones');
        console.log(__dirname);
        console.log(jsonFilePath);
        audioFile.mv(audioFilePath);
        jsonFile.mv(jsonFilePath);
        // Store file paths in session state
        //req.session.jsonFilePath = jsonFilePath;
        //req.session.audioFilePath = audioFilePath;
        //var jsonData;
        //var jsonData;
        const jsonString = fs.readFileSync(jsonFilePath, 'utf8');
        const jsonData = JSON.parse(jsonString);

        console.log(jsonData)
       
        await extractAudio(jsonData, outputDir,audioFilePath);
        //console.log(jsonData);
        // Extract audio
     

        // Clone voices
        await clone();
    

        res.status(200).send('Files uploaded and processed successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

app.post('/translate', async (req, res) => {
    try {
        const selectedLang = req.body.selected_lang;

        // Perform translation
        const translations = await translation(req.session.jsonFilePath, selectedLang, req.session.openaiToken);

        // Store translated dialogues in session state
        req.session.dialogueTranslated = translations;

        res.status(200).send('Dialogues translated successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

// async function generateAudio  (req, res) {
//     try {
//         // Generate audio
//         await generateAudio(req.session.dialogueTranslated);

//         // Send generated audio file
//         const audioFilePath = path.join(__dirname, 'output.mp3');
//         res.sendFile(audioFilePath);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal server error');
//     }
// };
// app.get('/get',async(req,res)=>{
//     res.send("Its working");
// })

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
