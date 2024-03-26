const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function millisecondsToFFmpegTime(milliseconds) {
    const totalSeconds = milliseconds / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millisecondsFormatted = Math.floor(milliseconds % 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millisecondsFormatted.toString().padStart(3, '0')}`;
}

async function extractAudio(segmentsData, outputDir, audioFilePath) {
    const userAudioMap = new Map(); // Map to store user-wise audio segments

    // Aggregate audio segments for each user
    segmentsData.forEach(segment => {
        const { user, start_time: startTimeMs, end_time: endTimeMs } = segment;
        if (!userAudioMap.has(user)) {
            userAudioMap.set(user, []);
        }
        userAudioMap.get(user).push({ startTimeMs, endTimeMs });
    });

    // Extract and save audio segments for each user
    for (const [user, segments] of userAudioMap.entries()) {
        for (const segment of segments) {
            const { startTimeMs, endTimeMs } = segment;
            const outputFileName = `${user}_${startTimeMs}-${endTimeMs}.mp3`;
            const outputPath = path.join(outputDir, outputFileName);

            const startTimeFFmpeg = millisecondsToFFmpegTime(startTimeMs);
            const endTimeFFmpeg = millisecondsToFFmpegTime(endTimeMs);

            await new Promise((resolve, reject) => {
                ffmpeg(audioFilePath)
                    .setStartTime(startTimeFFmpeg)
                    .setDuration((endTimeMs - startTimeMs) / 1000) // Convert duration to seconds
                    .output(outputPath)
                    .on('end', () => {
                        console.log(`Segment processed for user ${user}: ${outputFileName}`);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error(`Error processing segment for user ${user}:`, err);
                        reject(err);
                    })
                    .run();
            });
        }
    }
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
