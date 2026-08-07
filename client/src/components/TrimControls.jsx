import React, { useState, useEffect } from 'react';
import { Clock, Scissors, Play, AlertCircle, Sparkles, FastForward, RotateCcw } from 'lucide-react';

/**
 * Format total seconds into HH:MM:SS string
 */
function secondsToHHMMSS(totalSec) {
  if (isNaN(totalSec) || totalSec < 0) return '00:00:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const pad = (num) => String(num).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Parse HH:MM:SS or HH:MM:SS.ms string to total seconds
 */
function hhmmssToSeconds(timeStr) {
  if (typeof timeStr === 'number') return timeStr;
  if (!timeStr) return 0;
  const parts = timeStr.toString().trim().split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}

export default function TrimControls({
  duration = 0,
  startTime = 0,
  endTime = 0,
  onTrimChange,
  onExecuteTrim,
  isProcessing
}) {
  const [fromInput, setFromInput] = useState(secondsToHHMMSS(startTime));
  const [toInput, setToInput] = useState(secondsToHHMMSS(endTime));
  const [validationError, setValidationError] = useState('');

  // Keep manual inputs synced when timeline or prop changes
  useEffect(() => {
    setFromInput(secondsToHHMMSS(startTime));
  }, [startTime]);

  useEffect(() => {
    setToInput(secondsToHHMMSS(endTime));
  }, [endTime]);

  const validateAndApply = (newFromStr, newToStr) => {
    const fromSec = hhmmssToSeconds(newFromStr);
    const toSec = hhmmssToSeconds(newToStr);

    if (isNaN(fromSec) || isNaN(toSec)) {
      setValidationError('Please enter time in HH:MM:SS format (e.g. 00:01:30)');
      return false;
    }

    if (fromSec < 0) {
      setValidationError('From Time cannot be negative');
      return false;
    }

    if (toSec > duration + 1) {
      setValidationError(`To Time cannot exceed video duration (${secondsToHHMMSS(duration)})`);
      return false;
    }

    if (fromSec >= toSec) {
      setValidationError('From Time must be less than To Time');
      return false;
    }

    setValidationError('');
    if (onTrimChange) {
      onTrimChange(fromSec, toSec);
    }
    return true;
  };

  const handleFromBlur = () => {
    validateAndApply(fromInput, toInput);
  };

  const handleToBlur = () => {
    validateAndApply(fromInput, toInput);
  };

  const selectedDurationSec = Math.max(0, endTime - startTime);
  const remainingDurationSec = Math.max(0, duration - selectedDurationSec);

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-6 rounded-3xl glass-panel border border-slate-800 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white tracking-tight">Trim By Duration</h3>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => {
              if (onTrimChange) onTrimChange(0, duration);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Range</span>
          </button>
        </div>
      </div>

      {/* Manual Input Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* From Time */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>From Time (HH:MM:SS)</span>
            <span className="text-slate-400 text-[11px]">Start Position</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={fromInput}
              onChange={(e) => {
                setFromInput(e.target.value);
                validateAndApply(e.target.value, toInput);
              }}
              onBlur={handleFromBlur}
              placeholder="00:01:30"
              className="w-full px-4 py-3 rounded-2xl glass-input text-lg font-mono font-bold text-white tracking-wider placeholder-slate-600"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  const newFrom = Math.max(0, startTime - 1);
                  setFromInput(secondsToHHMMSS(newFrom));
                  if (onTrimChange) onTrimChange(newFrom, endTime);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                -1s
              </button>
              <button
                type="button"
                onClick={() => {
                  const newFrom = Math.min(endTime - 0.5, startTime + 1);
                  setFromInput(secondsToHHMMSS(newFrom));
                  if (onTrimChange) onTrimChange(newFrom, endTime);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                +1s
              </button>
            </div>
          </div>
        </div>

        {/* To Time */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>To Time (HH:MM:SS)</span>
            <span className="text-slate-400 text-[11px]">End Position</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={toInput}
              onChange={(e) => {
                setToInput(e.target.value);
                validateAndApply(fromInput, e.target.value);
              }}
              onBlur={handleToBlur}
              placeholder="00:05:10"
              className="w-full px-4 py-3 rounded-2xl glass-input text-lg font-mono font-bold text-white tracking-wider placeholder-slate-600"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  const newTo = Math.max(startTime + 0.5, endTime - 1);
                  setToInput(secondsToHHMMSS(newTo));
                  if (onTrimChange) onTrimChange(startTime, newTo);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                -1s
              </button>
              <button
                type="button"
                onClick={() => {
                  const newTo = Math.min(duration, endTime + 1);
                  setToInput(secondsToHHMMSS(newTo));
                  if (onTrimChange) onTrimChange(startTime, newTo);
                }}
                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                +1s
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Real-time Duration Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Original Duration</span>
          <span className="text-xl font-bold font-mono text-white mt-1">
            {secondsToHHMMSS(duration)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 flex flex-col justify-between shadow-lg shadow-indigo-950/30">
          <span className="text-xs text-indigo-300 font-medium">Selected Trim Duration</span>
          <span className="text-xl font-bold font-mono text-indigo-400 mt-1">
            {secondsToHHMMSS(selectedDurationSec)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">Trimmed Out / Remaining</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {secondsToHHMMSS(remainingDurationSec)}
          </span>
        </div>
      </div>

      {/* Primary Action Trim Button */}
      <button
        onClick={() => {
          if (!validationError && onExecuteTrim) {
            onExecuteTrim({ startTime: fromInput, endTime: toInput });
          }
        }}
        disabled={isProcessing || !!validationError}
        className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center space-x-2 transition-all shadow-xl ${
          isProcessing || !!validationError
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30 hover:scale-[1.01]'
        }`}
      >
        <Scissors className="w-5 h-5" />
        <span>Execute Precision Trim</span>
      </button>

    </div>
  );
}
