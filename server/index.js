const express = require('express');
const cors = require('cors');
const path = require('path');
const { UPLOADS_DIR, OUTPUTS_DIR } = require('./services/storageService');
const videoRoutes = require('./routes/video');
const adminRoutes = require('./routes/admin');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

// Enable CORS & payload parsing
app.use(cors());
app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ extended: true, limit: '4gb' }));

// Serve static directories with HTTP caching & byte range headers for instant playback/downloads
app.use('/uploads', express.static(UPLOADS_DIR, { acceptRanges: true, maxAge: '1h' }));
app.use('/outputs', express.static(OUTPUTS_DIR, { acceptRanges: true, maxAge: '1h' }));

// API Routes
app.use('/api/video', videoRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Smart Video Trimmer Pro',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if exists
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/outputs/')) {
    return next();
  }
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Smart Video Trimmer Pro Server Running. Client build on http://localhost:' + DEFAULT_PORT);
  }
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`===================================================`);
    console.log(`🎬 Smart Video Trimmer Pro Server is Live! (High Speed Mode)`);
    console.log(`📡 URL: http://localhost:${port}`);
    console.log(`===================================================`);
  });

  // Infinite & High Socket timeouts for large 4GB video transfers
  server.timeout = 0; // Infinite server timeout
  server.requestTimeout = 0; // Infinite request timeout
  server.keepAliveTimeout = 1200000; // 20 minutes keep-alive
  server.headersTimeout = 1205000; // 20 minutes headers timeout

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is busy, retrying on port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
