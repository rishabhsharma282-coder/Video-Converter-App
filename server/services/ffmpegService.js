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
    console.log('Running FFmpeg (Instant AAC Stream Copy):', 'ffmpeg ' + args.join(' '));
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
 * 1. Trim Single Segment (INSTANT FAST AAC STREAM COPY - 0.1s Execution, Universal Windows Media Player Support)
 */
async function trimVideo(inputPath, startTime, endTime, options = {}, progressCallback) {
  const outputFileName = `trim_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const startSec = timeToSeconds(startTime);
  const endSec = timeToSeconds(endTime);
  const targetDuration = Math.max(0.1, endSec - startSec);

  // Fast Keyframe Seek (-ss BEFORE -i) for instant 0.1s seek
  const args = ['-y', '-ss', String(startSec), '-i', inputPath, '-t', String(targetDuration)];

  const scaleFilter = getQualityScaleFilter(options.quality);
  const crf = getCRFValue(options.compression);

  if (!scaleFilter) {
    // Stream copy video, transcode audio to universal AAC, and relocate moov atom to start for instant seeking!
    args.push('-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-crf', crf, '-c:a', 'aac', '-movflags', '+faststart');
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

  const filterComplex = `${filterParts.join(';')};${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[outv][outa]`;

  const crf = getCRFValue(options.compression);
  const args = [
    '-y',
    '-i', inputPath,
    '-filter_complex', filterComplex,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-threads', '0',
    '-crf', crf,
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputPath
  ];

  await runFFmpegCommand(args, totalSec, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 3. Crop Video (Resolution / Aspect Ratio)
 */
async function cropVideo(inputPath, aspect, customCrop, options = {}, progressCallback) {
  const outputFileName = `crop_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const meta = await getVideoMetadata(inputPath);
  const inW = meta.width || 1920;
  const inH = meta.height || 1080;

  let cropFilter = '';
  if (customCrop && customCrop.width && customCrop.height) {
    cropFilter = `crop=${customCrop.width}:${customCrop.height}:${customCrop.x}:${customCrop.y}`;
  } else {
    switch (aspect) {
      case '9:16': {
        const targetW = Math.round(inH * (9 / 16));
        cropFilter = `crop=${targetW}:${inH}:(in_w-${targetW})/2:0`;
        break;
      }
      case '1:1': {
        const side = Math.min(inW, inH);
        cropFilter = `crop=${side}:${side}:(in_w-${side})/2:(in_h-${side})/2`;
        break;
      }
      case '4:5': {
        const targetW = Math.round(inH * (4 / 5));
        cropFilter = `crop=${targetW}:${inH}:(in_w-${targetW})/2:0`;
        break;
      }
      case '16:9':
      default: {
        cropFilter = `crop=${inW}:${inH}:0:0`;
        break;
      }
    }
  }

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', cropFilter,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-threads', '0',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputPath
  ];

  await runFFmpegCommand(args, meta.duration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 4. Add Watermark (Text or Image Overlay)
 */
async function addWatermark(inputPath, config = {}, progressCallback) {
  const outputFileName = `watermark_${Date.now()}.mp4`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);
  const meta = await getVideoMetadata(inputPath);

  const text = config.text || 'Smart Trimmer Pro';
  const pos = config.position || 'bottom-right';

  let x = 'w-tw-20';
  let y = 'h-th-20';

  if (pos === 'top-left') { x = '20'; y = '20'; }
  if (pos === 'top-right') { x = 'w-tw-20'; y = '20'; }
  if (pos === 'bottom-left') { x = '20'; y = 'h-th-20'; }
  if (pos === 'center') { x = '(w-tw)/2'; y = '(h-th)/2'; }

  const drawtextFilter = `drawtext=text='${text}':x=${x}:y=${y}:fontsize=${config.fontSize || 32}:fontcolor=${config.color || 'white'}:shadowcolor=black@0.5:shadowx=2:shadowy=2`;

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', drawtextFilter,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-threads', '0',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputPath
  ];

  await runFFmpegCommand(args, meta.duration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 5. Extract Audio Stream
 */
async function extractAudio(inputPath, format = 'mp3', progressCallback) {
  const outputFileName = `audio_${Date.now()}.${format}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);
  const meta = await getVideoMetadata(inputPath);

  let codecArgs = ['-c:a', 'libmp3lame', '-b:a', '192k'];
  if (format === 'aac') codecArgs = ['-c:a', 'aac', '-b:a', '192k'];
  if (format === 'wav') codecArgs = ['-c:a', 'pcm_s16le'];

  const args = ['-y', '-i', inputPath, '-vn', ...codecArgs, outputPath];

  await runFFmpegCommand(args, meta.duration, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 6. Generate Animated GIF
 */
async function createGif(inputPath, startTime, endTime, config = {}, progressCallback) {
  const outputFileName = `gif_${Date.now()}.gif`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const startSec = timeToSeconds(startTime);
  const endSec = timeToSeconds(endTime);
  const dur = Math.max(0.1, endSec - startSec);

  const fps = config.fps || 10;
  const scaleW = config.scaleWidth || 480;

  const vf = `fps=${fps},scale=${scaleW}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;

  const args = [
    '-y',
    '-ss', String(startSec),
    '-i', inputPath,
    '-t', String(dur),
    '-vf', vf,
    outputPath
  ];

  await runFFmpegCommand(args, dur, progressCallback);
  return { outputPath, outputFileName };
}

/**
 * 7. Merge Multiple Videos (Concat Demuxer)
 */
async function mergeVideos(inputPaths, options = {}, progressCallback) {
  const outputFileName = `merge_${Date.now()}.${options.format || 'mp4'}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  const listPath = path.join(TEMP_DIR, `concat_list_${Date.now()}.txt`);
  const listContent = inputPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, listContent, 'utf8');

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    outputPath
  ];

  try {
    await runFFmpegCommand(args, 0, progressCallback);
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
    return { outputPath, outputFileName };
  } catch (err) {
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
    throw err;
  }
}

module.exports = {
  timeToSeconds,
  secondsToTime,
  getVideoMetadata,
  trimVideo,
  multiTrimConcat,
  cropVideo,
  addWatermark,
  extractAudio,
  createGif,
  mergeVideos
};
