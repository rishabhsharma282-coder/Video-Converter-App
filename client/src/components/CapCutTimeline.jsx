import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Scissors, Play, Pause, Move, Sliders } from 'lucide-react';

export default function CapCutTimeline({
  videoSrc,
  duration = 0,
  currentTime = 0,
  onSeek,
  startTime = 0,
  endTime = 0,
  onTrimChange,
  segments = [],
  activeSegmentIndex = 0
}) {
  const timelineRef = useRef(null);
  const [thumbnails, setThumbnails] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isDraggingLeftHandle, setIsDraggingLeftHandle] = useState(false);
  const [isDraggingRightHandle, setIsDraggingRightHandle] = useState(false);

  const safeDuration = typeof duration === 'number' && isFinite(duration) && duration > 0 ? duration : 1;

  // Generate thumbnail frames using hidden video element + canvas safely
  useEffect(() => {
    if (!videoSrc || !duration || isNaN(duration) || duration <= 0) return;

    let isMounted = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 90;

    const tempVideo = document.createElement('video');
    tempVideo.src = videoSrc;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;
    tempVideo.preload = 'auto';

    const numThumbs = 10;
    const interval = duration / numThumbs;
    const thumbList = [];
    let currentThumb = 0;

    const captureNextThumb = () => {
      if (!isMounted) return;
      if (currentThumb >= numThumbs) {
        setThumbnails(thumbList);
        return;
      }
      const seekTime = currentThumb * interval;
      if (isFinite(seekTime) && !isNaN(seekTime)) {
        try {
          tempVideo.currentTime = seekTime;
        } catch (e) {}
      }
    };

    tempVideo.onseeked = () => {
      if (!isMounted) return;
      try {
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        thumbList.push(canvas.toDataURL('image/jpeg', 0.4));
      } catch (e) {}
      currentThumb++;
      captureNextThumb();
    };

    tempVideo.onloadedmetadata = () => {
      captureNextThumb();
    };

    return () => {
      isMounted = false;
      tempVideo.src = '';
    };
  }, [videoSrc, duration]);

  // Safe percentage calculations
  const safeCurrentTime = typeof currentTime === 'number' && isFinite(currentTime) ? currentTime : 0;
  const safeStartTime = typeof startTime === 'number' && isFinite(startTime) ? startTime : 0;
  const safeEndTime = typeof endTime === 'number' && isFinite(endTime) ? endTime : safeDuration;

  const playheadPercent = Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100));
  const startPercent = Math.min(100, Math.max(0, (safeStartTime / safeDuration) * 100));
  const endPercent = Math.min(100, Math.max(0, (safeEndTime / safeDuration) * 100));

  const handleTimelineClick = (e) => {
    if (!timelineRef.current || safeDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedPercent = Math.min(1, Math.max(0, clickX / rect.width));
    const targetTime = clickedPercent * safeDuration;
    if (isFinite(targetTime) && !isNaN(targetTime) && onSeek) {
      onSeek(targetTime);
    }
  };

  const handleMouseDownPlayhead = (e) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  const handleMouseDownLeft = (e) => {
    e.stopPropagation();
    setIsDraggingLeftHandle(true);
  };

  const handleMouseDownRight = (e) => {
    e.stopPropagation();
    setIsDraggingRightHandle(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!timelineRef.current || safeDuration <= 0) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const percent = Math.min(1, Math.max(0, moveX / rect.width));
      const targetTime = percent * safeDuration;

      if (isFinite(targetTime) && !isNaN(targetTime)) {
        if (isDraggingPlayhead && onSeek) {
          onSeek(targetTime);
        } else if (isDraggingLeftHandle && onTrimChange) {
          const newStart = Math.min(targetTime, safeEndTime - 0.2);
          onTrimChange(Math.max(0, newStart), safeEndTime);
        } else if (isDraggingRightHandle && onTrimChange) {
          const newEnd = Math.max(targetTime, safeStartTime + 0.2);
          onTrimChange(safeStartTime, Math.min(safeDuration, newEnd));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setIsDraggingLeftHandle(false);
      setIsDraggingRightHandle(false);
    };

    if (isDraggingPlayhead || isDraggingLeftHandle || isDraggingRightHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, isDraggingLeftHandle, isDraggingRightHandle, safeDuration, safeStartTime, safeEndTime, onSeek, onTrimChange]);

  const formatSec = (sec) => {
    if (typeof sec !== 'number' || isNaN(sec) || !isFinite(sec)) return '00:00.0';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-4 rounded-3xl glass-panel border border-slate-800 shadow-xl">
      
      {/* Timeline Controls Toolbar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2 font-mono font-bold text-slate-300">
          <Scissors className="w-4 h-4 text-indigo-400" />
          <span>Timeline Scrubber</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px]">CapCut Track</span>
        </div>

        {/* Zoom Level Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono font-bold text-slate-400">{zoomLevel.toFixed(1)}x</span>

          <button
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Track Scrubber Area */}
      <div className="relative overflow-x-auto py-4">
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          style={{ width: `${zoomLevel * 100}%` }}
          className="relative h-24 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 cursor-crosshair shadow-inner"
        >
          {/* Canvas Filmstrip Thumbnails */}
          <div className="absolute inset-0 flex items-center justify-between opacity-70 pointer-events-none">
            {thumbnails.length > 0
              ? thumbnails.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`thumb_${i}`}
                    className="h-full object-cover flex-1 border-r border-slate-900/40"
                  />
                ))
              : Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-full flex-1 bg-slate-900/50 border-r border-slate-800/40" />
                ))}
          </div>

          {/* Non-selected Trim Dim Overlay (Left Side) */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-slate-950/80 backdrop-blur-[1px] pointer-events-none border-r border-amber-500/50"
            style={{ width: `${startPercent}%` }}
          />

          {/* Non-selected Trim Dim Overlay (Right Side) */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-slate-950/80 backdrop-blur-[1px] pointer-events-none border-l border-amber-500/50"
            style={{ width: `${100 - endPercent}%` }}
          />

          {/* Active Trim Selected Region Highlight Box */}
          <div
            className="absolute top-0 bottom-0 border-t-2 border-b-2 border-amber-400 bg-amber-500/10 pointer-events-none"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`
            }}
          />

          {/* Left Trim Handle */}
          <div
            onMouseDown={handleMouseDownLeft}
            style={{ left: `${startPercent}%` }}
            className="absolute top-0 bottom-0 w-4 bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center cursor-ew-resize shadow-lg z-20 rounded-l-md transition-colors"
          >
            <div className="w-1 h-6 bg-slate-950/60 rounded-full" />
          </div>

          {/* Right Trim Handle */}
          <div
            onMouseDown={handleMouseDownRight}
            style={{ left: `calc(${endPercent}% - 16px)` }}
            className="absolute top-0 bottom-0 w-4 bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center cursor-ew-resize shadow-lg z-20 rounded-r-md transition-colors"
          >
            <div className="w-1 h-6 bg-slate-950/60 rounded-full" />
          </div>

          {/* Red CapCut Playhead Line Needle */}
          <div
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"
          >
            {/* Playhead Top Handle Cap */}
            <div
              onMouseDown={handleMouseDownPlayhead}
              className="absolute -top-3 -left-2.5 w-5 h-5 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto"
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          {/* Timecode Scale Markings */}
          <div className="absolute bottom-1 inset-x-2 flex justify-between text-[9px] font-mono text-slate-400 pointer-events-none bg-slate-950/70 px-2 py-0.5 rounded-full border border-slate-800/60">
            <span>{formatSec(safeStartTime)}</span>
            <span className="text-amber-400 font-bold">{formatSec(safeCurrentTime)}</span>
            <span>{formatSec(safeEndTime)}</span>
          </div>

        </div>
      </div>

      {/* Bottom Trim Duration Summary */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-300">Selected Range:</span>
          <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {formatSec(safeStartTime)} ➔ {formatSec(safeEndTime)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Clip Length:</span>
          <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {(safeEndTime - safeStartTime).toFixed(1)}s
          </span>
        </div>
      </div>

    </div>
  );
}
