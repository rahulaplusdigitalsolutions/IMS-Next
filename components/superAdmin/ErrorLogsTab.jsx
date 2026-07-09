"use client";
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Download, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/client/apiClient';
import OtpModal from './OtpModal';

const Toast = ({ type, msg }) => {
  if (!msg) return null;
  const styles = type === 'success'
    ? 'bg-green-50 border border-green-200 text-green-700'
    : 'bg-red-50 border border-red-200 text-red-700';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${styles}`}>
      <Icon size={15} /> {msg}
    </div>
  );
};

const LINE_COLOR = (line) => {
  const l = line.toLowerCase();
  if (l.includes('uncaughtexception') || l.includes('error:') || l.includes('unhandledrejection')) return 'text-rose-400';
  if (l.includes('warn')) return 'text-amber-400';
  if (l.includes('2025') || l.includes('2026')) return 'text-slate-400';
  return 'text-slate-300';
};

export default function ErrorLogsTab() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearPending, setClearPending] = useState(false);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/error-logs');
      setLines(res.data.lines || []);
    } catch (err) {
      setStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to load error logs.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClearConfirm = async (otp) => {
    await api.delete('/admin/error-logs', { data: { otp } });
    setLines([]);
    setStatus({ type: 'success', msg: 'Error log cleared.' });
    setClearPending(false);
  };

  const handleDownload = () => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {clearPending && (
        <OtpModal
          actionLabel="Clear error log file permanently. This cannot be undone."
          onConfirm={handleClearConfirm}
          onClose={() => setClearPending(false)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <span className="text-sm font-semibold text-slate-700">Error Logs</span>
          {!loading && <span className="text-xs text-slate-400 ml-1">({lines.length} lines, most recent first)</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-50">
            <RefreshCw size={12} /> Refresh
          </button>
          {lines.length > 0 && (
            <button onClick={handleDownload} className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-50">
              <Download size={12} /> Download
            </button>
          )}
          <button onClick={() => setClearPending(true)} className="flex items-center gap-1.5 text-xs text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg font-medium hover:bg-rose-50">
            <Trash2 size={12} /> Clear Log
          </button>
        </div>
      </div>

      {status && <Toast type={status.type} msg={status.msg} />}

      <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-400 border-t-transparent" />
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500">
            <CheckCircle size={28} />
            <span className="text-sm">No error log entries</span>
          </div>
        ) : (
          <div className="overflow-auto max-h-[60vh] p-4 font-mono text-xs leading-5 space-y-0.5">
            {lines.map((line, i) => (
              <div key={i} className={LINE_COLOR(line)}>{line || ' '}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


