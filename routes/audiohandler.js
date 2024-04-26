const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const {tts} = require('./tts');



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
        const outputFileName = `${user}.mp3`;
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


// function mapUsers(jsonArray, userMap) {
//     console.log('Original JSON:', JSON.stringify(jsonArray));
  
//     jsonArray.forEach(item => {
//       const userKey = `${item.user}`;
  
//       if (userMap.hasOwnProperty(userKey)) {
//         console.log(`Mapping found for ${item.user}: ${userMap[userKey]}`);
//         item.user = userMap[userKey];
//       } else {
//         console.warn(`No mapping found for user: ${item.user} (looking for ${userKey})`);
//       }
//     });
  
//     console.log('Updated JSON:', JSON.stringify(jsonArray));
//     return jsonArray;
//   }
  

// Assuming tts is an asynchronous function that takes a userID and text, and generates audio

async function generateAudio(translatedDialogJson,audioOutputDir,userMap) {
    try {
        // Step 1: Read the JSON file
        const dialogs = JSON.stringify(translatedDialogJson);

        // Step 2: Update the JSON data with the new user IDs from userMap
        const updatedDialogs = dialogs.userMap(dialog => ({
            ...dialog,
            user: userMap[dialog.user] || dialog.user // Update user ID or keep original if not in map
        }));
        console.log("Updated dialogs"+JSON.stringify(updatedDialogs));

        // Optionally save the updated JSON data back to a file
        // await fs.writeFile(jsonFilePath, JSON.stringify(updatedDialogs, null, 2), 'utf8');

        // Step 3: Iterate over the updated dialogs and generate audio using tts function
        for (const dialog of updatedDialogs) {
            const { user, text } = dialog;
            console.log(`Processing text for user ${user}`);

            // Generate audio using the tts function
            // Assuming tts returns a Promise<void> and actually saves the audio file
            await tts(user, text, path.join(audioOutputDir, `${user}.mp3`));
        }

        console.log('All audio files have been generated successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

async function getUserText(userId) {
    // Assuming the JSON file is already loaded into memory as jsonData
    const dialog = jsonData.find(item => item.user === userId);
    return dialog ? dialog.text : null;
}

module.exports = { extractAudio};
