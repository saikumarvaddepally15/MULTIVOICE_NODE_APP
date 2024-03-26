const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const { tts } = require('./tts'); // Import the TTS function from your tts module

ffmpeg.setFfmpegPath(require('@ffmpeg-installer/ffmpeg').path);

// Function to extract and save audio segments for each user
function millisecondsToFFmpegTime(milliseconds) {
    const totalSeconds = milliseconds / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millisecondsFormatted = Math.floor(milliseconds % 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millisecondsFormatted.toString().padStart(3, '0')}`;
}

async function extractAudio(segmentsData, outputDir, audioFilePath) {
    for (const segment of segmentsData) {
        const { user, start_time: startTimeMs, end_time: endTimeMs } = segment;
        const outputFileName = `${user}.mp3`;
        const outputPath = path.join(outputDir, outputFileName);

        const startTimeFFmpeg = millisecondsToFFmpegTime(startTimeMs);
        const endTimeFFmpeg = millisecondsToFFmpegTime(endTimeMs);

        await new Promise((resolve, reject) => {
            ffmpeg(audioFilePath)
                .setStartTime(startTimeFFmpeg)
                .setDuration((endTimeMs - startTimeMs) / 1000) // Convert duration to seconds
                .output(outputPath)
                .on('end', () => {
                    console.log('Segment processed for user:', user);
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Error processing segment:', err);
                    reject(err);
                })
                .run();
        });
    }
}


async function combineAudioFiles(inputFiles, outputFilePath) {
    // Generate FFmpeg command to concatenate audio files
    let ffmpegCommand = 'ffmpeg';
    inputFiles.forEach((file) => {
        ffmpegCommand += ` -i "${file.path}"`;
    });
    ffmpegCommand += ' -filter_complex "concat=n=' + inputFiles.length + ':v=0:a=1[out]" -map "[out]" -acodec libmp3lame -q:a 4 -y ' + outputFilePath;

    // Execute FFmpeg command
    return new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error combining audio files: ${error}`);
                reject(error);
            }
            console.log(`Audio files combined successfully: ${outputFilePath}`);
            resolve();
        });
    });
}

async function generateAudio(dialogsJson, outputFilePath, audioFilePath) {
    const dialogs = JSON.parse(dialogsJson);
    let prevEnd = 0;
    let tempFiles = [];
    for (const dialog of dialogs) {
        const { start_time: start, end_time: end, user, text } = dialog;
        const ttsAudioPath = await tts(user, text); // Assuming this function exists and returns the path to the TTS audio file
        // Generate silence audio for the gap
        if (start > prevEnd) {
            const silenceFilePath = `silence_${prevEnd}_${start}.mp3`;
            // Generate silence file here or handle gap as per your requirement
            tempFiles.push({ start: prevEnd, end: start, path: silenceFilePath });
        }
        tempFiles.push({ start, end, path: ttsAudioPath });
        prevEnd = end;
    }
    
    // Add original audio outside dialogues to the tempFiles array (if any)
    // Assuming audioFilePath points to the original audio
    tempFiles.push({ start: prevEnd, end: Infinity, path: audioFilePath });

    // Combine all audio parts including original audio outside dialogues
    await combineAudioFiles(tempFiles, outputFilePath);
}

module.exports = { extractAudio, generateAudio };
