import React, { useState } from 'react';
import { Music, Download, Check } from 'lucide-react';

export default function AudioExtractor({ onExtractAudio, isProcessing }) {
  const [format, setFormat] = useState('mp3');

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <Music className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">Extract Audio Stream</h3>
          <p className="text-xs text-slate-400">Export video soundtrack as high quality audio</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setFormat('mp3')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            format === 'mp3'
              ? 'border-indigo-500 bg-indigo-500/20 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
          }`}
        >
          <p className="text-sm font-bold">MP3 Format</p>
          <p className="text-[10px] text-slate-400">Compressed audio</p>
        </button>

        <button
          onClick={() => setFormat('wav')}
          className={`p-4 rounded-2xl border text-center transition-all ${
            format === 'wav'
              ? 'border-indigo-500 bg-indigo-500/20 text-white'
              : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
          }`}
        >
          <p className="text-sm font-bold">WAV Format</p>
          <p className="text-[10px] text-slate-400">Uncompressed PCM</p>
        </button>
      </div>

      <button
        onClick={() => onExtractAudio(format)}
        disabled={isProcessing}
        className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/30"
      >
        <Music className="w-4 h-4" />
        <span>Extract {format.toUpperCase()} Audio</span>
      </button>
    </div>
  );
}
