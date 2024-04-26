const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { initSessionState, voiceFolder } = require('./routes/utils');
const { credentials } = require('./routes/credentials');
const { extractAudio} =  require('./routes/audiohandler');
const { clone } = require('./routes/voiceclone');
const { translation } = require('./routes/translate');
const {generateAudio}=require('./routes/replaceAudio');
const session = require('express-session');

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

app.use(session({
    secret: 'changeThisToARandomSecretBeforeDeployment', // Change this secret in a real app
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto', maxAge: 24 * 60 * 60 * 1000 } // Adjust settings according to your security requirements
  }));

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
        req.session.jsonFilePath = jsonFilePath;
        req.session.audioFilePath = audioFilePath;
        req.session.openaiToken=process.env.OPEN_AI;
        //var jsonData;
        //var jsonData;
        const jsonString = fs.readFileSync(jsonFilePath, 'utf8');
        const jsonData = JSON.parse(jsonString);

        console.log(jsonData)
       
        await extractAudio(jsonData, outputDir,audioFilePath);
        //console.log(jsonData);
        // Extract audio
     

        // Clone voices
         const voiceID= await clone();
         console.log("app.js voice ID--------------"+ JSON.stringify(voiceID));
        await translate(req,res,JSON.stringify(voiceID));
       // await generateAudio2(req,res);
     //  await generateAudio(req.session.dialogueTranslated,audioFilePath);


        res.status(200).send('Files uploaded and processed successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
    
    
});
const translate= async (req, res,voiceID) => {
    try {
        console.log("inside transalte function"+ voiceID);
        const selectedLang = req.body.selected_lang || "Spanish";
        const jsonFile = req.files?.json_file;
        const audioFile = req.files?.audio_file;
        const audioFilePath = path.join(__dirname, '/public/data', audioFile.name);
        const jsonFilePath = path.join(__dirname, '/public/data', jsonFile.name);

       
     
        // Perform translation
        const translations = await translation(req.session.jsonFilePath, selectedLang);
       // console.log("what is there in translations??????");
       // console.log("here are translations"+translations);
        // Store translated dialogues in session state
         // Ensure translations is an array
         //const jsonArray = JSON.parse(`[${translations}]`);
         const jsonArray=translations;
         //const formattedTranslations = Array.isArray(translations) ? translations : [translations];

         // Store translated dialogues in session state
         //req.session.dialogueTranslated = formattedTranslations;
        
        //console.log(jsonArray);
        //const audioFilePath = path.join(__dirname,'/public/data', '');
       // console.log("app.js translation"+req.session.dialogueTranslated);
        await generateAudio(audioFilePath,jsonArray,voiceID);
        //res.status(200).send('Dialogues translated successfully');
    } catch (error) {
        console.error(error);
        throw new Error(error);
        //res.status(500).send('Internal server error');
    }
};
app.post('/translate',translate);



async function generateAudio2  (req, res) {
    try {
        // Generate audio
        await generateAudio(req.session.dialogueTranslated);

        // Send generated audio file
        const audioFilePath = path.join(__dirname, 'output.mp3');
        res.sendFile(audioFilePath);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
};
app.get('/get',async(req,res)=>{
    res.send("Its working");
})

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
