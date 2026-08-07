import React, { useState } from 'react';
import { Layers, Plus, Trash2, ArrowUp, ArrowDown, Video, CheckCircle2 } from 'lucide-react';
import VideoUploader from '../VideoUploader';

export default function MergeTool({ onExecuteMerge, isProcessing }) {
  const [videoList, setVideoList] = useState([]);

  const handleAddVideo = (uploadedFile) => {
    setVideoList((prev) => [...prev, uploadedFile]);
  };

  const removeVideo = (index) => {
    setVideoList(videoList.filter((_, i) => i !== index));
  };

  const moveVideo = (index, direction) => {
    const nextList = [...videoList];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= videoList.length) return;
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setVideoList(nextList);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 px-4 space-y-6">
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
        
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
          <Layers className="w-6 h-6 text-indigo-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Merge Multiple Videos</h2>
            <p className="text-xs text-slate-400">Upload multiple clips, arrange their playback order, and combine</p>
          </div>
        </div>

        {/* Upload Slot */}
        <VideoUploader onVideoUploaded={handleAddVideo} />

        {/* Sequence List */}
        {videoList.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Sequence Queue ({videoList.length} Videos):
            </h3>

            <div className="space-y-2">
              {videoList.map((file, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-md"
                >
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-white">{file.originalName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {file.durationFormatted} | {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => moveVideo(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveVideo(idx, 1)}
                      disabled={idx === videoList.length - 1}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeVideo(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onExecuteMerge(videoList.map((v) => v.filename))}
              disabled={videoList.length < 2 || isProcessing}
              className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-xl ${
                videoList.length < 2 || isProcessing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span>Merge {videoList.length} Videos into One</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
