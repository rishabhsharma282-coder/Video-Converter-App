const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR, OUTPUTS_DIR } = require('../services/storageService');

function getFolderSize(dirPath) {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    } catch (e) {}
  });
  return totalSize;
}

router.get('/stats', (req, res) => {
  const dbStats = db.getStats();
  const uploadsSize = getFolderSize(UPLOADS_DIR);
  const outputsSize = getFolderSize(OUTPUTS_DIR);
  const totalStorageBytes = uploadsSize + outputsSize;

  const history = db.getHistory();

  // Activity calculation by date
  const activityMap = {};
  history.forEach((item) => {
    const dateStr = item.createdAt.split('T')[0];
    activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
  });

  const activityData = Object.keys(activityMap)
    .sort()
    .slice(-7)
    .map((date) => ({
      date,
      count: activityMap[date]
    }));

  res.json({
    success: true,
    stats: {
      totalVideosProcessed: dbStats.totalProcessed || history.length,
      totalDownloads: dbStats.totalDownloads || 0,
      storageUsedBytes: totalStorageBytes,
      storageUsedFormatted: (totalStorageBytes / (1024 * 1024)).toFixed(2) + ' MB',
      activeJobs: dbStats.activeJobs || 0
    },
    activity: activityData,
    recentHistory: history.slice(0, 5)
  });
});

module.exports = router;
