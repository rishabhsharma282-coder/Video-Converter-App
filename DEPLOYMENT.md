# Smart Video Trimmer Pro - Deployment Guide

This guide details deployment options for **Smart Video Trimmer Pro** on Windows Server, Linux (Ubuntu/Debian), and Docker environments.

---

## 1. Prerequisites

### System Requirements:
- **Node.js**: v18.0.0 or higher
- **FFmpeg**: v4.4 or higher installed and added to system `PATH`
- **RAM**: Minimum 2GB (4GB+ recommended for 1080p/4K rendering)
- **Disk**: 10GB+ free storage space for video processing buffers

---

## 2. Windows Server Deployment

### Step A: Install Dependencies
1. Download & Install Node.js LTS from [nodejs.org](https://nodejs.org).
2. Download FFmpeg build from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/).
3. Extract FFmpeg zip to `C:\ffmpeg` and add `C:\ffmpeg\bin` to Windows System Environment Variable `PATH`.
4. Verify FFmpeg in Command Prompt / PowerShell:
   ```cmd
   ffmpeg -version
   ```

### Step B: Setup Application & PM2 Process Manager
1. Copy the application folder to `C:\inetpub\SmartTrimmerPro` or `C:\Apps\SmartTrimmerPro`.
2. Install dependencies & build client:
   ```cmd
   npm install
   npm run build:client
   ```
3. Install PM2 process manager for Windows:
   ```cmd
   npm install -g pm2 pm2-windows-service
   ```
4. Start server process with PM2:
   ```cmd
   pm2 start server/index.js --name "smart-video-trimmer"
   pm2 save
   ```

---

## 3. Linux (Ubuntu/Debian) Deployment

### Step A: Install Node.js & FFmpeg
```bash
sudo apt update
sudo apt install -y nodejs npm ffmpeg
```

### Step B: Build & Run with PM2
```bash
git clone <your-repository-url>
cd Converter

npm install
npm run build:client

sudo npm install -g pm2
pm2 start server/index.js --name "smart-video-trimmer"
pm2 startup
pm2 save
```

---

## 4. Docker & Docker Compose Deployment (Recommended)

1. Clone or copy project repository.
2. Build and launch container in background:
   ```bash
   docker-compose up -d --build
   ```
3. Check container logs:
   ```bash
   docker-compose logs -f
   ```
4. Open app in browser: `http://localhost:5000`
