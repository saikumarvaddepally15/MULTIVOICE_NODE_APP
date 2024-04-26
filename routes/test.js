const fs = require('fs/promises');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { tts } = require('./tts'); // Assuming this is your tts module

async function generateAudio(audioFilePath, translatedJson, userVoiceIDMap) {
    // Load the original audio file
    const dialogs = translatedJson;
    //const map={"":"W6hgsBfCmqr5sTQHxFZR","Speaker 3":"jMnO5fKbdBsEyZp5NB6E","Speaker 4":"sj4k5yjE2qZ3X3eeMjc0","Speaker 2":"YG044I7fDe2kcbitdJCl","Speaker 5":"edYg9zwOMzmckto65Y8q","Speaker 0":"QeIS3dmJSh1KhOd0ChnI","Speaker 1":"kEvvjtGr4yaRRCdk37Uf"};
    console.log("translated dialogs"+dialogs);
    console.log("voice ID"+userVoiceIDMap);
    //let map = userVoiceIDMap;

    // Object.keys(map).forEach(key => {
    //     if (key.trim() === "") {
    //       delete map[key];
    //     }
    //   });
    
    // Path to save the final output audio
    const outputPath = "output.mp3";

    // Use ffmpeg to convert the audio file to a compatible format if necessary
    //let compatibleAudioPath = await convertToCompatibleFormat(audioFilePath);

    // Initialize variables for the loop
   // let outputAudioPath = compatibleAudioPath; // Start with the original (or compatible) audio file
    //let prevEnd = 0;

    for (const dialog of dialogs) {
        const { start_time: start, end_time: end, user, text } = dialog;
        const map = userVoiceIDMap;
        console.log("User:", user);
        const voiceId = map[user];
        console.log("voiceId of the user"+voiceId)
        if (!voiceId) {
            console.error(`No voice ID found for user ${user}.`);
            continue; // Skip if no voice ID is found
        }

        // Generate TTS audio for the dialog
       // const ttsAudioPath = await tts(voiceId, text);

        // Merge the original audio with the TTS audio at the correct timings
       // outputAudioPath = await mergeAudio(outputAudioPath, ttsAudioPath, prevEnd, start, outputPath);

        //prevEnd = end; // Update prevEnd for the next iteration
    }

    // Add remaining original audio if there's any left
    // if (prevEnd < await getDuration(compatibleAudioPath)) {
    //     await appendRemainingAudio(outputAudioPath, compatibleAudioPath, prevEnd, outputPath);
    // }

    console.log(`Generated audio saved to ${outputPath}`);
}

function getDuration(audioPath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata.format.duration * 1000); // Duration in milliseconds
        });
    });
}

// Convert audio file to a consistent format if necessary (optional based on your TTS output)
async function convertToCompatibleFormat(audioFilePath) {
    const outputFilePath = audioFilePath.replace(/\.mp3$/, '_compatible.mp3');
    return new Promise((resolve, reject) => {
        ffmpeg(audioFilePath)
            .audioCodec('libmp3lame') // Example: convert audio to MP3
            .on('end', () => resolve(outputFilePath))
            .on('error', reject)
            .save(outputFilePath);
    });
}

// Merge TTS audio into the original track at the correct position
async function mergeAudio(originalAudioPath, ttsAudioPath, prevEnd, start, outputPath) {
    const tempOutputPath = path.join(path.dirname(outputPath), `temp_merged_${Date.now()}.mp3`);

    return new Promise(async (resolve, reject) => {
        // Calculate duration to extract from original audio up to the start of TTS audio
        const durationMs = start - prevEnd;
        const originalSegmentPath = await extractSegment(originalAudioPath, prevEnd, durationMs);

        ffmpeg()
            .input(originalSegmentPath)
            .input(ttsAudioPath)
            .on('error', reject)
            .on('end', () => {
                fs.unlinkSync(originalSegmentPath); // Cleanup temporary file
                resolve(tempOutputPath);
            })
            .mergeToFile(tempOutputPath, path.dirname(tempOutputPath));
    });
}

// Extract a segment from the original audio
async function extractSegment(audioPath, startTimeMs, durationMs) {
    const tempSegmentPath = path.join(path.dirname(audioPath), `temp_segment_${Date.now()}.mp3`);
    return new Promise((resolve, reject) => {
        ffmpeg(audioPath)
            .setStartTime(startTimeMs / 1000)
            .duration(durationMs / 1000)
            .on('end', () => resolve(tempSegmentPath))
            .on('error', reject)
            .saveToFile(tempSegmentPath);
    });
}

// Append any remaining original audio after the last dialogue
async function appendRemainingAudio(outputAudioPath, originalAudioPath, prevEnd, outputPath) {
    const originalDurationMs = await getDuration(originalAudioPath);
    if (prevEnd < originalDurationMs) {
        const remainingDurationMs = originalDurationMs - prevEnd;
        const remainingSegmentPath = await extractSegment(originalAudioPath, prevEnd, remainingDurationMs);

        // Merge remaining segment to the current output audio
        return new Promise((resolve, reject) => {
            ffmpeg()
                .input(outputAudioPath)
                .input(remainingSegmentPath)
                .on('error', reject)
                .on('end', () => {
                    fs.unlinkSync(remainingSegmentPath); // Cleanup temporary file
                    fs.renameSync(outputAudioPath, outputPath); // Rename temp output to final output
                    resolve(outputPath);
                })
                .mergeToFile(outputPath, path.dirname(outputPath));
        });
    }
    return outputAudioPath;
}
module.exports = { generateAudio};