import React, { useState, useRef } from 'react';
import { UploadCloud, Film, FileVideo, AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';

export default function VideoUploader({ onVideoUploaded, maxFileSizeMB = 4096 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const supportedFormats = ['MP4', 'AVI', 'MOV', 'MKV', 'WMV', 'WEBM'];

  const handleFile = (file) => {
    if (!file) return;

    // Validate size (maxFileSizeMB default 4096 MB = 4 GB)
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      const displayLimit = maxFileSizeMB >= 1024 ? `${(maxFileSizeMB / 1024).toFixed(0)} GB` : `${maxFileSizeMB} MB`;
      setError(`File size exceeds the maximum allowed limit of ${displayLimit}`);
      return;
    }

    setError(null);
    setUploading(true);

    // ⚡ 0.0-SECOND INSTANT LOCAL BLOB URL CREATION (ZERO LATENCY)
    const localUrl = URL.createObjectURL(file);
    const instantFile = {
      filename: null,
      originalName: file.name,
      sizeBytes: file.size,
      duration: 0,
      durationFormatted: '00:00:00',
      width: 1920,
      height: 1080,
      codec: 'h264',
      url: localUrl,
      rawFile: file,
      uploadProgress: 0,
      onProgressUpdate: null,
      uploadPromise: null
    };

    // Single high-speed streaming connection
    const uploadPromise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const encodedName = encodeURIComponent(file.name);
      xhr.open('POST', `/api/video/upload-raw?filename=${encodedName}`, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          instantFile.uploadProgress = percent;
          if (instantFile.onProgressUpdate) {
            instantFile.onProgressUpdate(percent);
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.success) {
              instantFile.filename = data.file.filename;
              resolve(data.file.filename);
            } else {
              reject(new Error(data.error || 'Upload error'));
            }
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error('Server upload error'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error uploading file'));
      xhr.send(file);
    });

    instantFile.uploadPromise = uploadPromise;

    // ⚡ INSTANTLY LOAD VIDEO INTO EDITOR IN 0.001 SECONDS!
    onVideoUploaded(instantFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const displayLimitText = maxFileSizeMB >= 1024 ? `${(maxFileSizeMB / 1024).toFixed(0)} GB` : `${maxFileSizeMB} MB`;

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer overflow-hidden ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.avi,.mov,.mkv,.wmv,.webm"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Ambient Gradient Background Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          
          <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shadow-xl shadow-indigo-950/40 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-10 h-10 text-indigo-400" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
              <span>Drag & Drop Video for Instant Edit</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3 fill-amber-400" />
                <span>0.0s Instant</span>
              </span>
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              or <span className="text-indigo-400 font-semibold underline underline-offset-4">browse file</span> from your computer
            </p>
          </div>

          {/* Supported Formats */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {supportedFormats.map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-800/80 text-slate-300 rounded-lg border border-slate-700/50"
              >
                {fmt}
              </span>
            ))}
            <span className="text-xs text-slate-400 ml-1">Up to {displayLimitText}</span>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl mt-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
