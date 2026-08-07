const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { TEMP_DIR, OUTPUTS_DIR } = require('./storageService');

/**
 * Utility: Convert HH:MM:SS or HH:MM:SS.ms to total seconds
 */
function timeToSeconds(timeStr) {
  if (typeof timeStr === 'number') return timeStr;
  if (!timeStr) return 0;
  const parts = timeStr.toString().split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}

/**
 * Utility: Convert seconds to HH:MM:SS.ms string
 */
function secondsToTime(totalSec) {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = (totalSec % 60).toFixed(2);

  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${seconds.padStart(5, '0')}`;
}

/**
 * Get video metadata (duration, width, height, resolution) using ffprobe
 */
function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,codec_name,r_frame_rate -of json "${filePath}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`ffprobe failed: ${stderr || error.message}`));
      }
      try {
        const info = JSON.parse(stdout);
        const format = info.format || {};
        const videoStream = (info.streams || []).find((s) => s.width && s.height) || info.streams?.[0] || {};
        resolve({
          duration: parseFloat(format.duration || 0),
          sizeBytes: parseInt(format.size || 0, 10),
          width: videoStream.width || 1920,
          height: videoStream.height || 1080,
          codec: videoStream.codec_name || 'h264'
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Execute FFmpeg command with progress listener
 */
function runFFmpegCommand(args, totalDurationSec, progressCallback) {
  return new Promise((resolve, reject) => {
    console.log('Running FFmpeg (Instant Keyframe Stream Copy):', 'ffmpeg ' + args.join(' '));
    const process = spawn('ffmpeg', args);
    let logBuffer = '';

    process.stderr.on('data', (data) => {
      const text = data.toString();
      logBuffer += text;

      const timeMatch = text.match(/time=\s*([\d:\.]+)/);
      if (timeMatch && totalDurationSec > 0 && progressCallback) {
        const currentTimeSec = timeToSeconds(timeMatch[1]);
        const percent = Math.min(99, Math.max(0, Math.round((currentTimeSec / totalDurationSec) * 100)));
        progressCallback({ percent, currentSec: currentTimeSec, log: text });
      } else if (progressCallback) {
        progressCallback({ log: text });
      }
    });

    process.on('close', (code) => {
      if (code === 0) {
        if (progressCallback) progressCallback({ percent: 100, log: 'Processing complete!' });
        resolve(true);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}.\nLogs:\n${logBuffer.slice(-500)}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Build quality resolution scaling argument
 */
function getQualityScaleFilter(quality) {
  switch (quality) {
    case '720p':
      return 'scale=-2:720';
    case '1080p':
      return 'scale=-2:1080';
    case '4k':
      return 'scale=-2:2160';
    default:
      return null;
  }
}

/**
 * Build compression CRF value
 */
function getCRFValue(compression) {
  switch (compression) {
    case 'high':
      return '18';
    case 'medium':
      return '24';
    case 'small':
      return '30';
    default:
      return '23';
  }
}

/**
 * 1. Trim Single Segment (SUPERSONIC INSTANT KEYFRAME STREAM COPY - 0.1 SECONDS)
 */
async function trimVideo(inputPath, startTime, endTime, options = {}, progressCallback) {
  const outputFileName = `trim_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const startSec = timeToSeconds(startTime);
  const endSec = timeToSeconds(endTime);
  const targetDuration = Math.max(0.1, endSec - startSec);

  // Fast Keyframe Seek (-ss BEFORE -i) for instant 0.001s seek
  const args = ['-y', '-ss', String(startSec), '-i', inputPath, '-t', String(targetDuration)];

  const scaleFilter = getQualityScaleFilter(options.quality);
  const crf = getCRFValue(options.compression);

  // If no resolution scaling is requested, ALWAYS use instant codec stream copy (-c copy) for 0.1s execution!
  if (!scaleFilter) {
    args.push('-c', 'copy');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-crf', crf, '-c:a', 'aac');
  }

  args.push(outputPath);

  await runFFmpegCommand(args, targetDuration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 2. Trim Multiple Segments and Merge (Ultrafast Multi-Threading)
 */
async function multiTrimConcat(inputPath, segments, options = {}, progressCallback) {
  const outputFileName = `multi_trim_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  let totalSec = 0;
  const filterParts = [];
  const concatInputs = [];

  segments.forEach((seg, index) => {
    const sSec = timeToSeconds(seg.start);
    const eSec = timeToSeconds(seg.end);
    const dur = Math.max(0.1, eSec - sSec);
    totalSec += dur;

    filterParts.push(`[0:v]trim=start=${sSec}:end=${eSec},setpts=PTS-STARTPTS[v${index}]`);
    filterParts.push(`[0:a]atrim=start=${sSec}:end=${eSec},asetpts=PTS-STARTPTS[a${index}]`);
    concatInputs.push(`[v${index}][a${index}]`);
  });

  const filterGraph = `${filterParts.join(';')}; ${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[outv][outa]`;

  const args = [
    '-y',
    '-i',
    inputPath,
    '-filter_complex',
    filterGraph,
    '-map',
    '[outv]',
    '-map',
    '[outa]',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-threads',
    '0',
    '-c:a',
    'aac',
    outputPath
  ];

  await runFFmpegCommand(args, totalSec, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 3. Silence Detection
 */
function detectSilence(inputPath, noiseDb = '-30dB', minSilenceDuration = 0.5) {
  return new Promise((resolve, reject) => {
    const args = ['-i', inputPath, '-af', `silencedetect=noise=${noiseDb}:d=${minSilenceDuration}`, '-f', 'null', '-'];
    const process = spawn('ffmpeg', args);

    let stderrData = '';
    process.stderr.on('data', (d) => {
      stderrData += d.toString();
    });

    process.on('close', async (code) => {
      try {
        const metadata = await getVideoMetadata(inputPath);
        const totalDuration = metadata.duration;

        const silenceStartRegex = /silence_start:\s*([\d\.]+)/g;
        const silenceEndRegex = /silence_end:\s*([\d\.]+)/g;

        const silenceStarts = [];
        const silenceEnds = [];

        let match;
        while ((match = silenceStartRegex.exec(stderrData)) !== null) {
          silenceStarts.push(parseFloat(match[1]));
        }
        while ((match = silenceEndRegex.exec(stderrData)) !== null) {
          silenceEnds.push(parseFloat(match[1]));
        }

        const silentSegments = [];
        for (let i = 0; i < silenceStarts.length; i++) {
          silentSegments.push({
            start: silenceStarts[i],
            end: silenceEnds[i] || totalDuration
          });
        }

        const activeSegments = [];
        let lastEnd = 0;
        silentSegments.forEach((silence) => {
          if (silence.start > lastEnd + 0.2) {
            activeSegments.push({
              start: secondsToTime(lastEnd),
              end: secondsToTime(silence.start),
              startSec: lastEnd,
              endSec: silence.start
            });
          }
          lastEnd = silence.end;
        });

        if (lastEnd < totalDuration - 0.2) {
          activeSegments.push({
            start: secondsToTime(lastEnd),
            end: secondsToTime(totalDuration),
            startSec: lastEnd,
            endSec: totalDuration
          });
        }

        resolve({
          totalDuration,
          silentSegments,
          activeSegments
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * 4. Auto Highlight Detection
 */
async function detectHighlights(inputPath) {
  const silenceResult = await detectSilence(inputPath, '-25dB', 0.8);
  const highlights = (silenceResult.activeSegments || [])
    .filter((seg) => seg.endSec - seg.startSec >= 2.0)
    .map((seg, idx) => ({
      id: `highlight_${idx + 1}`,
      title: `Highlight Clip #${idx + 1}`,
      start: seg.start,
      end: seg.end,
      duration: (seg.endSec - seg.startSec).toFixed(1) + 's'
    }));

  return highlights;
}

/**
 * 5. Crop Video (Ultrafast Multi-Threading)
 */
async function cropVideo(inputPath, aspect, customCrop = {}, options = {}, progressCallback) {
  const metadata = await getVideoMetadata(inputPath);
  const { width: origW, height: origH, duration } = metadata;

  let cropW = origW;
  let cropH = origH;
  let cropX = 0;
  let cropY = 0;

  if (aspect === '16:9') {
    cropW = origW;
    cropH = Math.round((origW * 9) / 16);
    if (cropH > origH) {
      cropH = origH;
      cropW = Math.round((origH * 16) / 9);
    }
  } else if (aspect === '9:16') {
    cropH = origH;
    cropW = Math.round((origH * 9) / 16);
    if (cropW > origW) {
      cropW = origW;
      cropH = Math.round((origW * 16) / 9);
    }
  } else if (aspect === '1:1') {
    const side = Math.min(origW, origH);
    cropW = side;
    cropH = side;
  } else if (aspect === 'custom' && customCrop.w && customCrop.h) {
    cropW = customCrop.w;
    cropH = customCrop.h;
    cropX = customCrop.x || 0;
    cropY = customCrop.y || 0;
  }

  cropX = Math.max(0, Math.min(origW - cropW, Math.round((origW - cropW) / 2)));
  cropY = Math.max(0, Math.min(origH - cropH, Math.round((origH - cropH) / 2)));

  const outputFileName = `crop_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const args = [
    '-y',
    '-i',
    inputPath,
    '-vf',
    `crop=${cropW}:${cropH}:${cropX}:${cropY}`,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-threads',
    '0',
    '-c:a',
    'copy',
    outputPath
  ];

  await runFFmpegCommand(args, duration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 6. Add Watermark (Text or Image Logo - Ultrafast Multi-Threading)
 */
async function addWatermark(inputPath, watermarkConfig = {}, progressCallback) {
  const metadata = await getVideoMetadata(inputPath);
  const { duration } = metadata;

  const outputFileName = `watermark_${Date.now()}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const args = ['-y', '-i', inputPath];

  if (watermarkConfig.type === 'text') {
    const text = watermarkConfig.text || 'Smart Trimmer Pro';
    const position = watermarkConfig.position || 'bottom-right';
    let x = 'w-tw-20';
    let y = 'h-th-20';

    if (position === 'top-left') {
      x = '20';
      y = '20';
    } else if (position === 'top-right') {
      x = 'w-tw-20';
      y = '20';
    } else if (position === 'center') {
      x = '(w-tw)/2';
      y = '(h-th)/2';
    } else if (position === 'bottom-left') {
      x = '20';
      y = 'h-th-20';
    }

    const windowsFontPath = 'C\\:/Windows/Fonts/arial.ttf';
    const fontfileSpec = process.platform === 'win32' && fs.existsSync('C:/Windows/Fonts/arial.ttf')
      ? `fontfile='${windowsFontPath}':`
      : '';

    const drawtextFilter = `drawtext=${fontfileSpec}text='${text}':x=${x}:y=${y}:fontsize=${watermarkConfig.fontSize || 36}:fontcolor=${watermarkConfig.color || 'white'}:box=1:boxcolor=black@0.4:boxborderw=8`;
    args.push('-vf', drawtextFilter, '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-c:a', 'copy');
  } else if (watermarkConfig.type === 'logo' && watermarkConfig.logoPath) {
    args.push('-i', watermarkConfig.logoPath);
    args.push('-filter_complex', '[1:v]scale=120:-1[logo];[0:v][logo]overlay=main_w-overlay_w-20:main_h-overlay_h-20');
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-c:a', 'copy');
  }

  args.push(outputPath);

  await runFFmpegCommand(args, duration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 7. Merge Multiple Videos
 */
async function mergeVideos(filePaths, options = {}, progressCallback) {
  const outputFileName = `merged_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const listFile = path.join(TEMP_DIR, `concat_list_${Date.now()}.txt`);
  const listContent = filePaths.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listFile, listContent);

  const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outputPath];

  await runFFmpegCommand(args, 0, progressCallback);
  try {
    fs.unlinkSync(listFile);
  } catch (e) {}

  return { outputPath, outputFileName };
}

/**
 * 8. Extract Audio (MP3 / WAV)
 */
async function extractAudio(inputPath, format = 'mp3', progressCallback) {
  const metadata = await getVideoMetadata(inputPath);
  const outputFileName = `audio_${Date.now()}.${format}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const codec = format === 'wav' ? 'pcm_s16le' : 'libmp3lame';
  const args = ['-y', '-i', inputPath, '-vn', '-acodec', codec, '-q:a', '2', outputPath];

  await runFFmpegCommand(args, metadata.duration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 9. Generate High Quality Animated GIF
 */
async function generateGif(inputPath, startTime, endTime, fps = 10, scaleWidth = 480, progressCallback) {
  const startSec = timeToSeconds(startTime);
  const endSec = timeToSeconds(endTime);
  const duration = Math.max(0.5, endSec - startSec);

  const outputFileName = `animated_${Date.now()}.gif`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const palettePath = path.join(TEMP_DIR, `palette_${Date.now()}.png`);

  const paletteArgs = [
    '-y',
    '-ss',
    String(startSec),
    '-t',
    String(duration),
    '-i',
    inputPath,
    '-vf',
    `fps=${fps},scale=${scaleWidth}:-1:flags=lanczos,palettegen`,
    palettePath
  ];
  await runFFmpegCommand(paletteArgs, duration, null);

  const gifArgs = [
    '-y',
    '-ss',
    String(startSec),
    '-t',
    String(duration),
    '-i',
    inputPath,
    '-i',
    palettePath,
    '-filter_complex',
    `fps=${fps},scale=${scaleWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
    outputPath
  ];
  await runFFmpegCommand(gifArgs, duration, progressCallback);

  try {
    fs.unlinkSync(palettePath);
  } catch (e) {}

  return { outputPath, outputFileName };
}

/**
 * 10. Capture Frame Screenshot
 */
async function captureScreenshot(inputPath, timestamp = 0, format = 'png') {
  const sec = timeToSeconds(timestamp);
  const outputFileName = `frame_${Date.now()}.${format}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const args = ['-y', '-ss', String(sec), '-i', inputPath, '-vframes', '1', '-q:v', '2', outputPath];

  await runFFmpegCommand(args, 1, null);
  return { outputPath, outputFileName };
}

module.exports = {
  getVideoMetadata,
  timeToSeconds,
  secondsToTime,
  trimVideo,
  multiTrimConcat,
  detectSilence,
  detectHighlights,
  cropVideo,
  addWatermark,
  mergeVideos,
  extractAudio,
  generateGif,
  captureScreenshot
};
