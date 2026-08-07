const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/db.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial DB Structure
const initialData = {
  history: [],
  stats: {
    totalProcessed: 0,
    totalDownloads: 0,
    storageUsedBytes: 0,
    activeJobs: 0
  }
};

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB, resetting to default:', err);
    return initialData;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

const db = {
  getHistory: () => {
    const data = readDB();
    return data.history || [];
  },

  addHistory: (record) => {
    const data = readDB();
    const newRecord = {
      id: record.id || Date.now().toString(),
      fileName: record.fileName,
      originalName: record.originalName,
      action: record.action || 'Trim',
      trimDuration: record.trimDuration || 'N/A',
      outputSize: record.outputSize || 0,
      downloadUrl: record.downloadUrl,
      createdAt: new Date().toISOString(),
      status: record.status || 'Completed'
    };

    data.history.unshift(newRecord);
    data.stats.totalProcessed += 1;
    data.stats.storageUsedBytes += record.outputSize || 0;
    writeDB(data);
    return newRecord;
  },

  deleteHistory: (id) => {
    const data = readDB();
    data.history = data.history.filter((h) => h.id !== id);
    writeDB(data);
  },

  incrementDownload: () => {
    const data = readDB();
    data.stats.totalDownloads = (data.stats.totalDownloads || 0) + 1;
    writeDB(data);
  },

  getStats: () => {
    const data = readDB();
    return data.stats;
  },

  updateStorageUsed: (bytesDelta) => {
    const data = readDB();
    data.stats.storageUsedBytes = Math.max(0, (data.stats.storageUsedBytes || 0) + bytesDelta);
    writeDB(data);
  }
};

module.exports = db;
