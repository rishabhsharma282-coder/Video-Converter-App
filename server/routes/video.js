const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { UPLOADS_DIR, OUTPUTS_DIR } = require('../services/storageService');
const ffmpegService = require('../services/ffmpegService');
const db = require('../database');

// Configure Multer Storage for fallback form-data uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `video_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4GB max limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.webm', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Supported formats: ${allowedExts.join(', ')}`));
    }
  }
});

// SSE active progress connections map: jobId -> res
const progressClients = new Map();

/**
 * SSE Progress Stream
 */
router.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  progressClients.set(jobId, res);

  res.write(`data: ${JSON.stringify({ percent: 0, log: 'Job initialized...' })}\n\n`);

  req.on('close', () => {
    progressClients.delete(jobId);
  });
});

function notifyProgress(jobId, data) {
  const clientRes = progressClients.get(jobId);
  if (clientRes) {
    clientRes.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * 🔥 SUPERSONIC INSTANT SINGLE-PASS TRIM ENDPOINT (/api/video/trim-direct)
 */
router.post('/trim-direct', (req, res) => {
  req.setTimeout(0); // Infinite request socket timeout for 4GB transfers
  const startTime = req.query.startTime || '00:00:00';
  const endTime = req.query.endTime || '00:00:10';
  const format = req.query.format || 'mp4';
  const originalName = req.query.filename ? decodeURIComponent(req.query.filename) : 'video.mp4';
  const jobId = req.query.jobId;

  const startSec = ffmpegService.timeToSeconds(startTime);
  const endSec = ffmpegService.timeToSeconds(endTime);
  const targetDuration = Math.max(0.1, endSec - startSec);

  const outputFileName = `trim_${Date.now()}.${format}`;
  const outputPath = path.join(OUTPUTS_DIR, outputFileName);

  notifyProgress(jobId, { percent: 10, log: 'Streaming & trimming video on the fly...' });

  const ffmpegProc = spawn('ffmpeg', [
    '-y',
    '-ss', String(startSec),
    '-i', 'pipe:0',
    '-t', String(targetDuration),
    '-c', 'copy',
    outputPath
  ]);

  req.pipe(ffmpegProc.stdin);

  ffmpegProc.stderr.on('data', (d) => {
    const text = d.toString();
    const timeMatch = text.match(/time=\s*([\d:\.]+)/);
    if (timeMatch && targetDuration > 0) {
      const currentSec = ffmpegService.timeToSeconds(timeMatch[1]);
      const percent = Math.min(99, Math.max(10, Math.round((currentSec / targetDuration) * 100)));
      notifyProgress(jobId, { percent, log: text });
    }
  });

  ffmpegProc.on('close', (code) => {
    if (code === 0 && fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const historyItem = db.addHistory({
        fileName: outputFileName,
        originalName,
        action: 'Instant Trim',
        trimDuration: `${(endSec - startSec).toFixed(1)}s`,
        outputSize: stats.size,
        downloadUrl: `/outputs/${outputFileName}`
      });

      notifyProgress(jobId, { percent: 100, log: 'Processing complete!' });

      res.json({
        success: true,
        outputFileName,
        downloadUrl: `/outputs/${outputFileName}`,
        sizeBytes: stats.size,
        historyItem
      });
    } else {
      notifyProgress(jobId, { error: 'FFmpeg stream trim failed' });
      res.status(500).json({ error: 'FFmpeg stream trim failed' });
    }
  });

  req.on('error', (err) => {
    ffmpegProc.kill();
    notifyProgress(jobId, { error: err.message });
    res.status(500).json({ error: err.message });
  });
});

/**
 * 1. High Speed Direct Binary Stream Upload (Infinite Socket Timeout & 16MB High Water Mark Disk Stream)
 */
router.post('/upload-raw', (req, res) => {
  req.setTimeout(0); // Disable socket timeout for large 4GB transfers
  const originalName = req.query.filename ? decodeURIComponent(req.query.filename) : 'video.mp4';
  const ext = path.extname(originalName).toLowerCase() || '.mp4';
  const uniqueName = `video_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);

  const writeStream = fs.createWriteStream(filePath, { highWaterMark: 16 * 1024 * 1024 });

  req.pipe(writeStream);

  req.on('error', (err) => {
    console.error('Upload socket error:', err);
    try { fs.unlinkSync(filePath); } catch (e) {}
  });

  writeStream.on('finish', () => {
    try {
      const stats = fs.statSync(filePath);
      res.json({
        success: true,
        file: {
          filename: uniqueName,
          originalName,
          sizeBytes: stats.size,
          url: `/uploads/${uniqueName}`
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  writeStream.on('error', (err) => {
    res.status(500).json({ error: 'Disk write stream error: ' + err.message });
  });
});

/**
 * Fallback Multipart Upload Video
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  req.setTimeout(0);
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const filePath = req.file.path;
    const metadata = await ffmpegService.getVideoMetadata(filePath);

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        duration: metadata.duration,
        durationFormatted: ffmpegService.secondsToTime(metadata.duration),
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        url: `/uploads/${req.file.filename}`
      }
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Single Trim (Instant Stream Copy)
 */
router.post('/trim', async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileName, startTime, endTime, quality, format, compression } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.trimVideo(
      inputPath,
      startTime,
      endTime,
      { quality, format, compression },
      (progressData) => notifyProgress(jobId, progressData)
    );

    const stats = fs.statSync(result.outputPath);
    const startSec = ffmpegService.timeToSeconds(startTime);
    const endSec = ffmpegService.timeToSeconds(endTime);
    const trimDuration = (endSec - startSec).toFixed(1) + 's';

    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: fileName,
      action: 'Trim',
      trimDuration,
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    console.error('Trim error:', err);
    notifyProgress(jobId, { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. Multi-Segment Trim
 */
router.post('/multi-trim', async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileName, segments, quality, format } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.multiTrimConcat(
      inputPath,
      segments,
      { quality, format },
      (progressData) => notifyProgress(jobId, progressData)
    );

    const stats = fs.statSync(result.outputPath);
    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: fileName,
      action: `Multi-Trim (${segments.length} segments)`,
      trimDuration: `${segments.length} clips merged`,
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    console.error('Multi trim error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. Detect Silence
 */
router.post('/detect-silence', async (req, res) => {
  req.setTimeout(0);
  const { fileName, noiseDb, minDuration } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.detectSilence(inputPath, noiseDb, minDuration);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 5. Highlight Detection
 */
router.post('/highlights', async (req, res) => {
  req.setTimeout(0);
  const { fileName } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const highlights = await ffmpegService.detectHighlights(inputPath);
    res.json({ success: true, highlights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Crop Video
 */
router.post('/crop', async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileName, aspect, customCrop, format } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.cropVideo(
      inputPath,
      aspect,
      customCrop,
      { format },
      (progressData) => notifyProgress(jobId, progressData)
    );

    const stats = fs.statSync(result.outputPath);
    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: fileName,
      action: `Crop (${aspect})`,
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Watermark
 */
router.post('/watermark', upload.single('logoFile'), async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileName, watermarkType, text, position, color, fontSize } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const config = {
      type: watermarkType || 'text',
      text,
      position,
      color,
      fontSize,
      logoPath: req.file ? req.file.path : null
    };

    const result = await ffmpegService.addWatermark(inputPath, config, (progressData) => notifyProgress(jobId, progressData));

    const stats = fs.statSync(result.outputPath);
    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: fileName,
      action: `Watermark (${config.type})`,
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. Merge Videos
 */
router.post('/merge', async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileNames, format } = req.body;
  if (!fileNames || fileNames.length < 2) {
    return res.status(400).json({ error: 'At least 2 videos required for merge' });
  }

  const inputPaths = fileNames.map((fn) => path.join(UPLOADS_DIR, fn));

  try {
    const result = await ffmpegService.mergeVideos(inputPaths, { format }, (progressData) => notifyProgress(jobId, progressData));

    const stats = fs.statSync(result.outputPath);
    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: `${fileNames.length} Videos Merged`,
      action: 'Merge',
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. Extract Audio
 */
router.post('/extract-audio', async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileName, format } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.extractAudio(inputPath, format || 'mp3', (progressData) => notifyProgress(jobId, progressData));

    const stats = fs.statSync(result.outputPath);
    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: fileName,
      action: `Extract Audio (${format})`,
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 10. Create GIF
 */
router.post('/create-gif', async (req, res) => {
  req.setTimeout(0);
  const { jobId, fileName, startTime, endTime, fps, scaleWidth } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.generateGif(
      inputPath,
      startTime || '00:00:00',
      endTime || '00:00:05',
      fps || 10,
      scaleWidth || 480,
      (progressData) => notifyProgress(jobId, progressData)
    );

    const stats = fs.statSync(result.outputPath);
    const historyItem = db.addHistory({
      fileName: result.outputFileName,
      originalName: fileName,
      action: 'Generate GIF',
      outputSize: stats.size,
      downloadUrl: `/outputs/${result.outputFileName}`
    });

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size,
      historyItem
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 11. Capture Screenshot
 */
router.post('/screenshot', async (req, res) => {
  req.setTimeout(0);
  const { fileName, timestamp, format } = req.body;
  const inputPath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Source video file not found' });
  }

  try {
    const result = await ffmpegService.captureScreenshot(inputPath, timestamp || 0, format || 'png');
    const stats = fs.statSync(result.outputPath);

    res.json({
      success: true,
      outputFileName: result.outputFileName,
      downloadUrl: `/outputs/${result.outputFileName}`,
      sizeBytes: stats.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 12. Get Processing History
 */
router.get('/history', (req, res) => {
  const history = db.getHistory();
  res.json({ success: true, history });
});

/**
 * 13. Delete History Item
 */
router.delete('/history/:id', (req, res) => {
  db.deleteHistory(req.params.id);
  res.json({ success: true });
});

/**
 * 14. Maximum Speed High Water Mark Stream Download (16MB Buffer Chunk Streaming)
 */
router.get('/download/:filename', (req, res) => {
  req.setTimeout(0);
  const filePath = path.join(OUTPUTS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found or expired');
  }

  db.incrementDownload();
  const stat = fs.statSync(filePath);

  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
  res.setHeader('Accept-Ranges', 'bytes');

  const fileStream = fs.createReadStream(filePath, { highWaterMark: 16 * 1024 * 1024 });
  fileStream.pipe(res);
});

module.exports = router;
