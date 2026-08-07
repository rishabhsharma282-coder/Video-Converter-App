const fs = require('fs');
const path = require('path');
const db = require('../database');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const OUTPUTS_DIR = path.join(__dirname, '../../outputs');
const TEMP_DIR = path.join(__dirname, '../../temp');

// Ensure directories exist
[UPLOADS_DIR, OUTPUTS_DIR, TEMP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Auto Cleanup files older than maxAgeMs (default 2 hours)
 */
function cleanupTempFiles(maxAgeMs = 2 * 60 * 60 * 1000) {
  const now = Date.now();
  [UPLOADS_DIR, OUTPUTS_DIR, TEMP_DIR].forEach((dir) => {
    fs.readdir(dir, (err, files) => {
      if (err) return;
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlink(filePath, (unlinkErr) => {
              if (!unlinkErr && dir === OUTPUTS_DIR) {
                db.updateStorageUsed(-stats.size);
              }
            });
          }
        });
      });
    });
  });
}

// Run cleanup every 30 minutes
setInterval(() => {
  cleanupTempFiles();
}, 30 * 60 * 1000);

module.exports = {
  UPLOADS_DIR,
  OUTPUTS_DIR,
  TEMP_DIR,
  cleanupTempFiles
};
