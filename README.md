Multivoice node app.

Project: MultiVoice App
Objective: Develop an application that translates audio files into multiple languages while preserving the original voice quality.
Technologies Used:
ElevenLabs: Employed for voice cloning to retain the original voice in the translated audio.
Deepgram: Utilized for precise extraction of text from audio files.
OpenAI: Applied for efficient translation of extracted text into the desired language.

How to Run?
1. Clone/Download  the repository open in any editor like VCS
2. Install FFMPEG for audio extraction and Merging based on time stamps.
3. Install all the necessary node pakages using "npm install"
4. set up an .env file and store ElevenLabs and Open AI API keys.
5. After setup run the app using npm app.js command.
6. Using postman hit the "/upload" api and give the input files i.e, audio and json file in the body.

Input files
1. we need an audio file in .mp3 format
2. we need json file with the extracted dialoges of each speaker from the auido file along with the timestamps.

Generate JSON file.
1. To get json file use Deepgram API or use the Deegram website (https://deepgram.com/)  to generate json file.
2.Uplaod the audio file and select sumamrization and Diarization to recognize speakers from the audio file.
3. After generating save it to the file.
4. Use this file for further filteration which can be done internally.

Format of json file should be like below (This not original deep gram json file it is further filtered such that ot use only required fields from the deep gram generated json file)
Do not worry filteration is taken care by the application it self. You just need to upload the json file generated by deep gram.  <br>

[
    {
        "user": "Speaker 0",
        "text": "I've got a question for Andrew Weissman. And and this was something that I that I noticed in the in the in during the arguments. I believe it was justice Gorsuch. He was presenting a hypothetical, to, Dreeben. And he said, what if a president organizes a peaceful sit in at the capitol and one that disrupts legislation, disrupts the lawful proceeding of votes, would that be criminal?",
        "start_time": 320,
        "end_time": 24970
    },
    {
        "user": "Speaker 0",
        "text": "That seemed to be a hypothetical that that just sits right next to what happened on January 6th, and and it felt like Dreeben didn't quite have an answer for that.",
        "start_time": 25030,
        "end_time": 34055
    }
]

How the app works
1. Once the audio and json file is given the audio segments are extracted based on the time stamps this is handled by extractaAudio function in audiohandler.js file which uses FFMPEG tool internally.
2. After extracting each speaker audio it merges the speaker dialouges audio into one file and saved to voice_Clones folder for further cloning process.
3. Now using the eleven labs the voice is added to the elevenlabs using api and a vocie id is generated for each speaker. We will store that vocie id in a map data structer for further process. This logic is handled in clone.js file.
4. Inorder to translate it to other language we need to convert the dialogues. To do that we use the original JSON file and pass to open AI api where it converts original text to the required language text. For instance if we select spanish it is translated to  spanish and returned that converted json. This is handled in translate.js file
5. Now using this voice ids that is generated by clone and translated text json that is generated by translante.js  we use this and pass it to elevenlabs to do  tts( text to speech) conversion. This will generate the translated language for each speaker that is similar to original audio speaker voice. we will merge this coverted audio into one file based on timestamps of json file and generate a output.mp3 audio file.
6. Merging is handled using FFMPEG and fluent-ffmpeg modules.

