import React, { useState } from 'react';
import { Type, Image as ImageIcon, Stamp, Check } from 'lucide-react';

export default function WatermarkTool({ watermarkConfig, onUpdateWatermark, onExecuteWatermark, isProcessing }) {
  const [type, setType] = useState('text');
  const [text, setText] = useState('Smart Trimmer Pro');
  const [position, setPosition] = useState('bottom-right');
  const [color, setColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(36);

  const positions = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'center', label: 'Center' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-right', label: 'Bottom Right' }
  ];

  const handleTextChange = (val) => {
    setText(val);
    onUpdateWatermark({ active: true, type, text: val, position, color, fontSize });
  };

  const handlePosChange = (val) => {
    setPosition(val);
    onUpdateWatermark({ active: true, type, text, position: val, color, fontSize });
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <Stamp className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">Add Watermark</h3>
          <p className="text-xs text-slate-400">Embed text or logo branding onto your video</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Watermark Text:</label>
          <input
            type="text"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Smart Trimmer Pro"
            className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">Screen Position Matrix:</label>
          <div className="grid grid-cols-3 gap-2">
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => handlePosChange(pos.id)}
                className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                  position === pos.id
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Text Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                onUpdateWatermark({ active: true, type, text, position, color: e.target.value, fontSize });
              }}
              className="w-full h-9 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer p-1"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Font Size ({fontSize}px)</label>
            <input
              type="range"
              min="16"
              max="72"
              value={fontSize}
              onChange={(e) => {
                const sz = parseInt(e.target.value);
                setFontSize(sz);
                onUpdateWatermark({ active: true, type, text, position, color, fontSize: sz });
              }}
              className="w-full mt-2 accent-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={() => onExecuteWatermark({ type: 'text', text, position, color, fontSize })}
          disabled={isProcessing}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/30"
        >
          <Stamp className="w-4 h-4" />
          <span>Burn Watermark to Video</span>
        </button>

      </div>
    </div>
  );
}
