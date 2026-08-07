# Smart Video Trimmer Pro - API Documentation

Smart Video Trimmer Pro provides a RESTful API and Server-Sent Events (SSE) progress endpoints for video processing operations.

## Base URL
```
http://localhost:5000/api
```

---

## 1. Video Upload
Upload a source video for editing and metadata extraction.

- **Endpoint**: `POST /api/video/upload`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Video file (`.mp4`, `.mov`, `.avi`, `.mkv`, `.wmv`) - Max 500MB
- **Response**:
```json
{
  "success": true,
  "file": {
    "filename": "video_1786110793_123.mp4",
    "originalName": "my_video.mp4",
    "sizeBytes": 1548576,
    "duration": 45.2,
    "durationFormatted": "00:00:45.20",
    "width": 1920,
    "height": 1080,
    "codec": "h264",
    "url": "/uploads/video_1786110793_123.mp4"
  }
}
```

---

## 2. Single Trim
Trim video by From and To timestamps.

- **Endpoint**: `POST /api/video/trim`
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "jobId": "job_1786110793",
  "fileName": "video_1786110793_123.mp4",
  "startTime": "00:00:05",
  "endTime": "00:00:20",
  "quality": "original",
  "format": "mp4",
  "compression": "medium"
}
```
- **Response**:
```json
{
  "success": true,
  "outputFileName": "trim_1786110793.mp4",
  "downloadUrl": "/outputs/trim_1786110793.mp4",
  "sizeBytes": 1048576
}
```

---

## 3. Real-Time SSE Rendering Progress Log
Stream live processing percentages and raw FFmpeg log console output.

- **Endpoint**: `GET /api/video/progress/:jobId`
- **Event Stream Payload**:
```json
{
  "percent": 45,
  "currentSec": 12.4,
  "log": "frame=  320 fps=120 q=28.0 size= 512KiB time=00:00:12.40"
}
```

---

## 4. Multi-Segment Trim & Merge
Cut multiple non-contiguous video ranges and concatenate into one seamless file.

- **Endpoint**: `POST /api/video/multi-trim`
- **Body**:
```json
{
  "jobId": "job_1786110793",
  "fileName": "video_1786110793_123.mp4",
  "segments": [
    { "start": "00:01:00", "end": "00:02:00" },
    { "start": "00:05:00", "end": "00:07:00" }
  ],
  "quality": "original",
  "format": "mp4"
}
```

---

## 5. AI Silence Removal Detection
Detect silent regions and calculate active speech segments.

- **Endpoint**: `POST /api/video/detect-silence`
- **Body**:
```json
{
  "fileName": "video_1786110793_123.mp4",
  "noiseDb": "-30dB",
  "minDuration": 0.5
}
```

---

## 6. Crop Aspect Ratio
Crop video to 16:9, 9:16 (Shorts/TikTok), 1:1 (Instagram), or Custom bounds.

- **Endpoint**: `POST /api/video/crop`
- **Body**:
```json
{
  "jobId": "job_1786110793",
  "fileName": "video_1786110793_123.mp4",
  "aspect": "9:16",
  "customCrop": { "w": 720, "h": 1280 }
}
```

---

## 7. Watermark Overlay
Burn text or logo image watermark into video.

- **Endpoint**: `POST /api/video/watermark`
- **Body**:
```json
{
  "jobId": "job_1786110793",
  "fileName": "video_1786110793_123.mp4",
  "watermarkType": "text",
  "text": "Smart Trimmer Pro",
  "position": "bottom-right",
  "color": "#ffffff",
  "fontSize": 36
}
```

---

## 8. Extract Audio Stream
Convert video soundtrack to MP3 or WAV.

- **Endpoint**: `POST /api/video/extract-audio`
- **Body**:
```json
{
  "jobId": "job_1786110793",
  "fileName": "video_1786110793_123.mp4",
  "format": "mp3"
}
```

---

## 9. Create Animated GIF
Generate high quality animated GIF with palettegen filter.

- **Endpoint**: `POST /api/video/create-gif`
- **Body**:
```json
{
  "jobId": "job_1786110793",
  "fileName": "video_1786110793_123.mp4",
  "startTime": "00:00:02",
  "endTime": "00:00:06",
  "fps": 10,
  "scaleWidth": 480
}
```

---

## 10. Admin Analytics Stats
Retrieve system stats, storage used, active jobs, and activity history.

- **Endpoint**: `GET /api/admin/stats`
- **Response**:
```json
{
  "success": true,
  "stats": {
    "totalVideosProcessed": 42,
    "totalDownloads": 128,
    "storageUsedBytes": 154857600,
    "storageUsedFormatted": "147.68 MB",
    "activeJobs": 0
  }
}
```
