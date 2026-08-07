import React, { useState, useEffect } from 'react';
import { History, Download, Trash2, FileVideo, RefreshCw } from 'lucide-react';

export default function ProcessingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/video/history');
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/video/history/${id}`, { method: 'DELETE' });
      setHistory(history.filter((h) => h.id !== id));
    } catch (e) {}
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-6xl mx-auto my-8 px-4 space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Processing History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Review past video trims & download processed files</p>
        </div>

        <button
          onClick={fetchHistory}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">File Name</th>
                <th className="py-4 px-6">Action / Filter</th>
                <th className="py-4 px-6">Trim Duration</th>
                <th className="py-4 px-6">Output Size</th>
                <th className="py-4 px-6">Created Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {history.length > 0 ? (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                      <FileVideo className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{item.fileName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {item.action || 'Trim'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-200">{item.trimDuration || 'N/A'}</td>
                    <td className="py-4 px-6 font-mono text-slate-400">{formatBytes(item.outputSize)}</td>
                    <td className="py-4 px-6 text-slate-400">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <a
                        href={`/api/video/download/${item.fileName}`}
                        download
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all border border-emerald-500/30 text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 italic">
                    No processing history recorded yet. Upload a video and start trimming!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
