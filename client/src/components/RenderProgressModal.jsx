import React, { useState } from 'react';
import { Loader2, CheckCircle2, Download, Terminal, X, AlertTriangle } from 'lucide-react';

export default function RenderProgressModal({
  isOpen,
  progressPercent = 0,
  logs = [],
  isComplete = false,
  error = null,
  resultData = null,
  onClose
}) {
  const [showLogs, setShowLogs] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-slate-700/80 p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3">
          {error ? (
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : isComplete ? (
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          <h3 className="text-xl font-bold text-white tracking-tight">
            {error ? 'Processing Error' : isComplete ? 'Rendering Finished!' : 'Processing Video...'}
          </h3>

          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {error
              ? error
              : isComplete
              ? 'Your video has been rendered and encoded successfully. Ready for download!'
              : 'Applying FFmpeg filters and encoding video stream...'}
          </p>
        </div>

        {/* Progress Bar & Status */}
        {!error && !isComplete && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-indigo-400">Rendering Status</span>
              <span className="text-white">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 transition-all duration-300 shadow-md shadow-indigo-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Complete State Download Button */}
        {isComplete && resultData?.downloadUrl && (
          <div className="space-y-3 pt-2">
            <a
              href={`/api/video/download/${resultData.outputFileName}`}
              download
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-500/20"
            >
              <Download className="w-5 h-5" />
              <span>Download Processed Video</span>
            </a>
          </div>
        )}

        {/* Terminal Logs Collapsible Drawer */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 transition-all"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showLogs ? 'Hide FFmpeg Logs' : 'Show Live FFmpeg Logs'}</span>
          </button>

          {showLogs && (
            <div className="mt-2 p-3 rounded-xl bg-black font-mono text-[10px] text-emerald-400 max-h-36 overflow-y-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
              {logs.length > 0 ? logs.join('\n') : 'No log stream yet...'}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
