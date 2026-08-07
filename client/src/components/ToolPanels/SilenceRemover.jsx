import React, { useState } from 'react';
import { VolumeX, Sparkles, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function SilenceRemover({ videoFile, onApplySilenceCut, isProcessing }) {
  const [noiseDb, setNoiseDb] = useState('-30dB');
  const [minDuration, setMinDuration] = useState('0.5');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDetect = async () => {
    if (!videoFile) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/video/detect-silence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: videoFile.filename,
          noiseDb,
          minDuration: parseFloat(minDuration)
        })
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Failed to analyze silence in video');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <VolumeX className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">AI Silence Removal</h3>
          <p className="text-xs text-slate-400">Detect & automatically trim silent sections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="text-slate-300 font-semibold mb-1 block">Audio Noise Threshold</label>
          <select
            value={noiseDb}
            onChange={(e) => setNoiseDb(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl glass-input text-white font-medium"
          >
            <option value="-20dB" className="bg-slate-900">-20dB (Strict - removes quiet background)</option>
            <option value="-30dB" className="bg-slate-900">-30dB (Standard - recommended)</option>
            <option value="-40dB" className="bg-slate-900">-40dB (Lenient - removes only true dead silence)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-300 font-semibold mb-1 block">Min Silence Duration (Sec)</label>
          <input
            type="number"
            step="0.1"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl glass-input text-white font-medium"
          />
        </div>
      </div>

      <button
        onClick={handleDetect}
        disabled={loading || isProcessing}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/30"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        <span>{loading ? 'Analyzing Audio Spectrum...' : 'Detect Silent Sections'}</span>
      </button>

      {error && (
        <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Silent Sections Detected:</span>
            <span className="font-bold text-indigo-400">{result.silentSegments.length} segments</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Active Speaking Clips:</span>
            <span className="font-bold text-emerald-400">{result.activeSegments.length} clips</span>
          </div>

          {result.activeSegments.length > 0 && (
            <button
              onClick={() => onApplySilenceCut(result.activeSegments)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Auto-Remove Silence & Merge Active Clips</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
