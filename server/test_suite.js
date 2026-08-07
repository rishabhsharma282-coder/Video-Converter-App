const path = require('path');
const fs = require('fs');
const ffmpegService = require('./services/ffmpegService');
const db = require('./database');

async function runTests() {
  console.log('🧪 Running Smart Video Trimmer Pro Server Test Suite...\n');

  const testFile = path.join(__dirname, '../uploads/test_sample.mp4');
  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }

  try {
    // Test 1: Metadata extraction
    console.log('1️⃣ Testing ffprobe video metadata extraction...');
    const meta = await ffmpegService.getVideoMetadata(testFile);
    console.log('  ✅ Metadata parsed:', { duration: meta.duration, width: meta.width, height: meta.height, codec: meta.codec });

    // Test 2: Single Trim
    console.log('\n2️⃣ Testing single video trim (00:00:02 to 00:00:06)...');
    const trimRes = await ffmpegService.trimVideo(testFile, '00:00:02', '00:00:06', { quality: 'original', format: 'mp4' });
    console.log('  ✅ Trim rendered:', trimRes.outputFileName);

    // Test 3: Audio Extraction
    console.log('\n3️⃣ Testing audio extraction (MP3)...');
    const audioRes = await ffmpegService.extractAudio(testFile, 'mp3');
    console.log('  ✅ Audio extracted:', audioRes.outputFileName);

    // Test 4: GIF creation
    console.log('\n4️⃣ Testing animated GIF creation...');
    const gifRes = await ffmpegService.generateGif(testFile, '00:00:01', '00:00:04', 10, 320);
    console.log('  ✅ GIF generated:', gifRes.outputFileName);

    // Test 5: Watermark overlay
    console.log('\n5️⃣ Testing text watermark overlay...');
    const wmRes = await ffmpegService.addWatermark(testFile, { type: 'text', text: 'Smart Trimmer Pro', position: 'bottom-right' });
    console.log('  ✅ Watermark rendered:', wmRes.outputFileName);

    // Test 6: DB Stats
    console.log('\n6️⃣ Testing DB stats update...');
    db.addHistory({
      fileName: trimRes.outputFileName,
      originalName: 'test_sample.mp4',
      action: 'Test Trim',
      trimDuration: '4s',
      outputSize: 102400,
      downloadUrl: `/outputs/${trimRes.outputFileName}`
    });
    const stats = db.getStats();
    console.log('  ✅ Stats retrieved:', stats);

    console.log('\n🎉 ALL FFmpeg SERVER TESTS PASSED CLEANLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
