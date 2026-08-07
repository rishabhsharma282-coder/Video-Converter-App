import React, { useState } from 'react';
import { Crop, Smartphone, Monitor, Square, Check, RefreshCcw } from 'lucide-react';

export default function CropTool({ cropConfig, onUpdateCrop, onExecuteCrop, isProcessing }) {
  const [selectedAspect, setSelectedAspect] = useState(cropConfig?.aspect || '16:9');
  const [customW, setCustomW] = useState(1280);
  const [customH, setCustomH] = useState(720);

  const aspects = [
    { id: '16:9', label: '16:9 Landscape', icon: Monitor, sub: 'YouTube / Widescreen' },
    { id: '9:16', label: '9:16 Portrait', icon: Smartphone, sub: 'Reels / TikTok / Shorts' },
    { id: '1:1', label: '1:1 Square', icon: Square, sub: 'Instagram Post' },
    { id: 'custom', label: 'Custom Bounds', icon: Crop, sub: 'Manual Width x Height' }
  ];

  const handleSelect = (aspectId) => {
    setSelectedAspect(aspectId);
    onUpdateCrop({
      active: true,
      aspect: aspectId,
      customCrop: { w: parseInt(customW), h: parseInt(customH) }
    });
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <Crop className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">Crop Video</h3>
          <p className="text-xs text-slate-400">Re-frame aspect ratio for target social platforms</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {aspects.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedAspect === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-xs font-bold mt-2">{item.label}</p>
              <p className="text-[10px] text-slate-400">{item.sub}</p>
            </button>
          );
        })}
      </div>

      {selectedAspect === 'custom' && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Width (px)</label>
            <input
              type="number"
              value={customW}
              onChange={(e) => setCustomW(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Height (px)</label>
            <input
              type="number"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white"
            />
          </div>
        </div>
      )}

      <button
        onClick={() => onExecuteCrop(selectedAspect, { w: parseInt(customW), h: parseInt(customH) })}
        disabled={isProcessing}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/30"
      >
        <Crop className="w-4 h-4" />
        <span>Apply Aspect Crop</span>
      </button>
    </div>
  );
}
