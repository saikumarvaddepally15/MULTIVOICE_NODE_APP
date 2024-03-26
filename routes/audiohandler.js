const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

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

    // Temporary directory for storing individual audio segments
    const tempDir = path.join(outputDir, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Extract and merge audio segments for each user
    for (const [user, segments] of userAudioMap.entries()) {
        let tempFiles = [];
        for (const segment of segments) {
            const { startTimeMs, endTimeMs } = segment;
            const tempFileName = `${user}_${startTimeMs}-${endTimeMs}.mp3`;
            const tempFilePath = path.join(tempDir, tempFileName);

            const startTimeFFmpeg = millisecondsToFFmpegTime(startTimeMs);
            const endTimeFFmpeg = millisecondsToFFmpegTime(endTimeMs);

            // Extract segment to temporary file
            await new Promise((resolve, reject) => {
                ffmpeg(audioFilePath)
                    .setStartTime(startTimeFFmpeg)
                    .setDuration((endTimeMs - startTimeMs) / 1000) // Convert duration to seconds
                    .output(tempFilePath)
                    .on('end', () => {
                        console.log(`Temporary segment processed for user ${user}: ${tempFileName}`);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error(`Error processing temporary segment for user ${user}:`, err);
                        reject(err);
                    })
                    .run();
            });

            tempFiles.push(tempFilePath);
        }

        // Merge temporary files into a single output file for the user
        const outputFileName = `${user}_merged.mp3`;
        const outputPath = path.join(outputDir, outputFileName);

        await mergeAudioFiles(tempFiles, outputPath);

        // Cleanup temporary files
        tempFiles.forEach(file => fs.unlinkSync(file));
    }

    // Remove the temporary directory
    fs.rmdirSync(tempDir);
}

// Helper function to merge audio files
async function mergeAudioFiles(inputFiles, outputFile) {
    return new Promise((resolve, reject) => {
        let ffmpegCommand = ffmpeg();

        inputFiles.forEach(file => {
            ffmpegCommand = ffmpegCommand.input(file);
        });

        ffmpegCommand
            .on('error', (err) => {
                console.error('Error merging audio files:', err);
                reject(err);
            })
            .on('end', () => {
                console.log(`Merged audio file created: ${outputFile}`);
                resolve();
            })
            .mergeToFile(outputFile, path.dirname(outputFile));
    });
}

// Convert milliseconds to FFmpeg-compatible time format
function millisecondsToFFmpegTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const ms = milliseconds % 1000;
    const formatted = new Date(seconds * 1000).toISOString().substr(11, 8) + '.' + ms.toString().padStart(3, '0');
    return formatted;
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
