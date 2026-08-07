import React, { useState } from 'react';
import { Sparkles, Play, CheckCircle, Loader2 } from 'lucide-react';

export default function HighlightFinder({ videoFile, onSelectHighlight, isProcessing }) {
  const [loading, setLoading] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    if (!videoFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/video/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: videoFile.filename })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setHighlights(data.highlights);
      } else {
        setError(data.error || 'Failed to detect highlights');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <div>
          <h3 className="text-base font-bold text-white">Auto Highlight Detector</h3>
          <p className="text-xs text-slate-400">Discover active speech & key moment clips</p>
        </div>
      </div>

      <button
        onClick={handleScan}
        disabled={loading || isProcessing}
        className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-amber-600/30"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        <span>{loading ? 'Scanning Audio Peaks...' : 'Scan Highlights'}</span>
      </button>

      {highlights.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-slate-300">Suggested Highlight Clips:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {highlights.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectHighlight(item.start, item.end)}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-800/80"
              >
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="text-[11px] font-mono text-slate-400">
                    {item.start} → {item.end} ({item.duration})
                  </p>
                </div>
                <button className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] font-semibold">
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
