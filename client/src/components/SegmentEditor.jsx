import React, { useState } from 'react';
import { Layers, Plus, Trash2, Scissors, Check } from 'lucide-react';

export default function SegmentEditor({ segments, onUpdateSegments, onExecuteMultiTrim, isProcessing }) {
  const [newStart, setNewStart] = useState('00:00:00');
  const [newEnd, setNewEnd] = useState('00:00:05');

  const addSegment = () => {
    const nextList = [...segments, { id: Date.now(), start: newStart, end: newEnd }];
    onUpdateSegments(nextList);
  };

  const removeSegment = (id) => {
    const nextList = segments.filter((s) => s.id !== id);
    onUpdateSegments(nextList);
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
        <Layers className="w-5 h-5 text-indigo-400" />
        <div>
          <h3 className="text-base font-bold text-white">Multiple Trim Segments</h3>
          <p className="text-xs text-slate-400">Select multiple video sections & merge them seamlessly</p>
        </div>
      </div>

      {/* Add New Segment Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">Start Time (HH:MM:SS)</label>
          <input
            type="text"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono text-white"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-300 block mb-1">End Time (HH:MM:SS)</label>
          <input
            type="text"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono text-white"
          />
        </div>

        <button
          onClick={addSegment}
          className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold text-xs flex items-center justify-center space-x-1.5 border border-slate-700/50"
        >
          <Plus className="w-4 h-4" />
          <span>Add Slice</span>
        </button>
      </div>

      {/* Segments List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {segments.map((seg, idx) => (
          <div
            key={seg.id || idx}
            className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
          >
            <div className="flex items-center space-x-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold text-[10px] flex items-center justify-center">
                #{idx + 1}
              </span>
              <span className="font-mono text-white font-bold">
                {seg.start} → {seg.end}
              </span>
            </div>

            <button
              onClick={() => removeSegment(seg.id)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {segments.length > 0 && (
        <button
          onClick={() => onExecuteMultiTrim(segments)}
          disabled={isProcessing}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-indigo-600/30"
        >
          <Scissors className="w-4 h-4" />
          <span>Cut & Merge {segments.length} Segments</span>
        </button>
      )}
    </div>
  );
}
