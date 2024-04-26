const fs = require("fs/promises");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");
const { tts } = require("./tts"); // Assuming this is your tts module

function msToTimeFormat(milliseconds) {
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  const ms = milliseconds % 1000;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

async function generateAudio(audioFilePath, translatedJson, userVoiceIDMap) {
  userVoiceIDMap = JSON.parse(userVoiceIDMap);
  const dialogs = translatedJson;
  let prevEnd = 0;
  let currentAudioPath = audioFilePath;
  const outputPath = "output.mp3";
  const tempSegments = [];

  for (const [index, dialog] of dialogs.entries()) {
    const { start_time: start, end_time: end, user, text } = dialog;
    const voiceId = userVoiceIDMap[dialog.user];
    if (!voiceId) {
      console.error(`No voice ID found for user ${user}.`);
      continue;
    }

    const ttsBuffer = await tts(voiceId, text);
    const ttsAudioPath = await writeBufferToFile(ttsBuffer, `tts_audio_${index}`);

    // Extract original audio up to the start of TTS, unless it's the first segment
    if (start > prevEnd) {
      const segmentPath = await extractSegment(currentAudioPath, prevEnd, start - prevEnd);
      tempSegments.push(segmentPath);
    }
    tempSegments.push(ttsAudioPath); // Add the TTS audio
    prevEnd = end;
  }

  // Handle any remaining original audio after the last TTS segment
  if (prevEnd < (await getDuration(currentAudioPath))) {
    const remainingDuration = (await getDuration(currentAudioPath)) - prevEnd;
    const remainingSegmentPath = await extractSegment(currentAudioPath, prevEnd, remainingDuration);
    tempSegments.push(remainingSegmentPath);
  }

  // Merge all segments into final output
  await mergeAudioSegments(tempSegments, outputPath);

  console.log(`Generated audio saved to ${outputPath}`);
}

async function writeBufferToFile(buffer, prefix) {
  const filePath = path.join(__dirname, `${prefix}_${Date.now()}.mp3`);
  const stream = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    },
  });
  return new Promise((resolve, reject) => {
    const ff = ffmpeg(stream)
      .audioCodec("libmp3lame")
      .save(filePath)
      .on("error", (err) => reject(err))
      .on("end", () => resolve(filePath));
  });
}

async function mergeAudioSegments(segmentPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    segmentPaths.forEach((path) => command.input(path));
    command
      .on("error", (err) => reject(err))
      .on("end", () => {
        segmentPaths.forEach((p) => fs.unlink(p)); // Cleanup
        resolve(outputPath);
      })
      .mergeToFile(outputPath, path.dirname(outputPath));
  });
}

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration * 1000); // Convert seconds to milliseconds
      }
    });
  });
}

async function extractSegment(audioPath, startTimeMs, durationMs) {
  const outputSegmentPath = path.join(path.dirname(audioPath), `extracted_segment_${Date.now()}.mp3`);
  return new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .setStartTime(msToTimeFormat(startTimeMs))
      .duration(durationMs / 1000) // ffmpeg duration is in seconds
      .output(outputSegmentPath)
      .on("error", (err) => reject(err))
      .on("end", () => resolve(outputSegmentPath))
      .run();
  });
}

module.exports = { generateAudio };
