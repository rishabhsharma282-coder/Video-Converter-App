import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, HardDrive, Download, Activity, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      setLoading(false);
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = data?.stats || {
    totalVideosProcessed: 0,
    totalDownloads: 0,
    storageUsedFormatted: '0 MB',
    activeJobs: 0
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-8 px-4 space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            <span>Admin Analytics Dashboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">System health, storage usage, and rendering statistics</p>
        </div>

        <button
          onClick={fetchStats}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Processed</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white font-mono mt-4">
            {stats.totalVideosProcessed}
          </p>
          <p className="text-[11px] text-emerald-400 mt-2 font-medium">↑ Lifetime renders completed</p>
        </div>

        <div className="p-6 rounded-3xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Storage Used</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white font-mono mt-4">
            {stats.storageUsedFormatted}
          </p>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">Uploads + rendered outputs</p>
        </div>

        <div className="p-6 rounded-3xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Downloads</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white font-mono mt-4">
            {stats.totalDownloads}
          </p>
          <p className="text-[11px] text-emerald-400 mt-2 font-medium">Active downloads count</p>
        </div>

        <div className="p-6 rounded-3xl glass-panel border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Active Tasks</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white font-mono mt-4">
            {stats.activeJobs}
          </p>
          <p className="text-[11px] text-amber-400 mt-2 font-medium">FFmpeg worker threads</p>
        </div>

      </div>

      {/* Visual Activity Graph */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Daily Video Render Activity</h3>
        <div className="h-44 flex items-end justify-between gap-4 pt-8 pb-2 border-b border-slate-800">
          {(data?.activity && data.activity.length > 0
            ? data.activity
            : [
                { date: 'Mon', count: 4 },
                { date: 'Tue', count: 8 },
                { date: 'Wed', count: 12 },
                { date: 'Thu', count: 6 },
                { date: 'Fri', count: 15 },
                { date: 'Sat', count: 9 },
                { date: 'Sun', count: 14 }
              ]
          ).map((item, idx) => {
            const maxVal = 20;
            const heightPercent = Math.min(100, Math.max(15, (item.count / maxVal) * 100));
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-slate-900 rounded-xl h-full flex items-end p-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-lg group-hover:brightness-125 transition-all"
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400">{item.date}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
