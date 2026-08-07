import React, { useState } from 'react';
import { Film, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function GifMaker({ startTime, endTime, onCreateGif, isProcessing }) {
  const [fps, setFps] = useState(10);
  const [scaleWidth, setScaleWidth] = useState(480);

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <Film className="w-5 h-5 text-cyan-400" />
        <div>
          <h3 className="text-base font-bold text-white">Generate Animated GIF</h3>
          <p className="text-xs text-slate-400">Convert current timeline selection into an animated GIF</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Frame Rate (FPS):</label>
          <select
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-white"
          >
            <option value="10" className="bg-slate-900">10 FPS (Recommended / Smaller file)</option>
            <option value="15" className="bg-slate-900">15 FPS (Smooth animation)</option>
            <option value="20" className="bg-slate-900">20 FPS (High motion detail)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Scale Width (px):</label>
          <select
            value={scaleWidth}
            onChange={(e) => setScaleWidth(parseInt(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-white"
          >
            <option value="320" className="bg-slate-900">320px (Compact)</option>
            <option value="480" className="bg-slate-900">480px (Standard GIF)</option>
            <option value="640" className="bg-slate-900">640px (High Quality)</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => onCreateGif({ fps, scaleWidth })}
        disabled={isProcessing}
        className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-600/30"
      >
        <Sparkles className="w-4 h-4" />
        <span>Create Animated GIF</span>
      </button>
    </div>
  );
}
