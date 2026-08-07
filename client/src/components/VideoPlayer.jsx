import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Camera, Sparkles } from 'lucide-react';

export default function VideoPlayer({
  src,
  currentTime,
  onTimeUpdate,
  onLoadedMetadata,
  cropConfig,
  watermarkConfig,
  onTakeScreenshot
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  // Sync seek time safely from outside
  useEffect(() => {
    if (
      videoRef.current &&
      typeof currentTime === 'number' &&
      isFinite(currentTime) &&
      !isNaN(currentTime) &&
      Math.abs(videoRef.current.currentTime - currentTime) > 0.3
    ) {
      try {
        videoRef.current.currentTime = currentTime;
      } catch (e) {}
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    } catch (e) {}
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      const cur = videoRef.current.currentTime;
      if (typeof cur === 'number' && isFinite(cur) && !isNaN(cur)) {
        onTimeUpdate(cur);
      }
    }
  };

  const handleMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (typeof dur === 'number' && isFinite(dur) && !isNaN(dur)) {
        setDuration(dur);
        if (onLoadedMetadata) {
          onLoadedMetadata({
            duration: dur,
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight
          });
        }
      }
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (sec) => {
    if (typeof sec !== 'number' || isNaN(sec) || !isFinite(sec)) return '00:00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}.${ms}`;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden glass-panel border border-slate-800 shadow-2xl shadow-slate-950">
      
      {/* Video Container */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain cursor-pointer"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Live Crop Overlay Box Visual */}
        {cropConfig && cropConfig.active && (
          <div
            className={`absolute border-2 border-dashed border-indigo-400 bg-indigo-500/10 pointer-events-none transition-all duration-300 ${
              cropConfig.aspect === '16:9'
                ? 'w-full h-[56.25%]'
                : cropConfig.aspect === '9:16'
                ? 'w-[31.6%] h-full'
                : cropConfig.aspect === '1:1'
                ? 'w-[56.25%] h-full'
                : 'w-[80%] h-[80%]'
            }`}
          >
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-indigo-600/90 text-white text-[10px] rounded font-semibold">
              Crop Aspect: {cropConfig.aspect}
            </div>
          </div>
        )}

        {/* Live Watermark Overlay Visual */}
        {watermarkConfig && watermarkConfig.active && (
          <div
            className={`absolute pointer-events-none px-3 py-1 bg-black/60 backdrop-blur-sm rounded text-white font-bold text-sm ${
              watermarkConfig.position === 'top-left'
                ? 'top-4 left-4'
                : watermarkConfig.position === 'top-right'
                ? 'top-4 right-4'
                : watermarkConfig.position === 'center'
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                : watermarkConfig.position === 'bottom-left'
                ? 'bottom-4 left-4'
                : 'bottom-4 right-4'
            }`}
            style={{ color: watermarkConfig.color || '#ffffff', fontSize: `${(watermarkConfig.fontSize || 36) / 2}px` }}
          >
            {watermarkConfig.text || 'Smart Trimmer Pro'}
          </div>
        )}

        {/* Big Play Overlay Button on Pause */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Video Custom Playback Control Bar */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-md flex items-center justify-between border-t border-slate-800/80">
        
        {/* Play/Pause & Mute */}
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-600/30"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Time Counter */}
          <div className="font-mono text-xs font-semibold text-slate-300">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center space-x-2">
          {onTakeScreenshot && (
            <button
              onClick={onTakeScreenshot}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700/50 transition-all"
              title="Snapshot current frame"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <span>Snapshot</span>
            </button>
          )}

          <button
            onClick={handleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
