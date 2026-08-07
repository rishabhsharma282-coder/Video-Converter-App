import React, { useState } from 'react';
import { Sliders, Download, Sparkles, Check, Zap } from 'lucide-react';

export default function CompressionTool({ onUpdateExportSettings }) {
  const [quality, setQuality] = useState('original');
  const [compression, setCompression] = useState('original');
  const [format, setFormat] = useState('mp4');

  const handleQualityChange = (val) => {
    setQuality(val);
    if (onUpdateExportSettings) {
      onUpdateExportSettings({ quality: val, compression, format });
    }
  };

  const handleCompressionChange = (val) => {
    setCompression(val);
    if (onUpdateExportSettings) {
      onUpdateExportSettings({ quality, compression: val, format });
    }
  };

  const handleFormatChange = (val) => {
    setFormat(val);
    if (onUpdateExportSettings) {
      onUpdateExportSettings({ quality, compression, format: val });
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white">Resolution & Speed Options</h3>
            <p className="text-xs text-slate-400">Choose between Instant Stream Copy (0.2s) or Re-encoding</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
          <span>Instant Speed Active</span>
        </span>
      </div>

      {/* Target Resolution */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Resolution Scale:</label>
        <div className="grid grid-cols-4 gap-2">
          {['original', '720p', '1080p', '4k'].map((res) => (
            <button
              key={res}
              onClick={() => handleQualityChange(res)}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase transition-all ${
                quality === res
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              {res === 'original' ? 'Original (Fastest)' : res}
            </button>
          ))}
        </div>
      </div>

      {/* Compression Level */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Encoding Speed Preset:</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'original', label: 'Instant Copy', sub: '0.2 Sec (No Re-encode)' },
            { id: 'high', label: 'High Quality', sub: 'Best visuals (CRF 18)' },
            { id: 'medium', label: 'Medium', sub: 'Balanced (CRF 24)' },
            { id: 'small', label: 'Small Size', sub: 'Compact (CRF 30)' }
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => handleCompressionChange(c.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                compression === c.id
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <p className="text-xs font-bold flex items-center justify-between">
                <span>{c.label}</span>
                {c.id === 'original' && <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />}
              </p>
              <p className="text-[10px] text-slate-400">{c.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Container Format:</label>
        <div className="grid grid-cols-3 gap-2">
          {['mp4', 'mov', 'mkv'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => handleFormatChange(fmt)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                format === fmt
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              .{fmt}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
