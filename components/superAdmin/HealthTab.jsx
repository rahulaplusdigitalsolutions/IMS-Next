"use client";
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Server, Database, HardDrive, Layers, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/client/apiClient';
import OtpModal from './OtpModal';

const formatBytes = (b) => {
  if (!b) return '0 B';
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b > 1e3) return `${(b / 1e3).toFixed(1)} KB`;
  return `${b} B`;
};

const formatUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
};

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
  </div>
);

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

export default function HealthTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache state
  const [cacheCount, setCacheCount] = useState(null);
  const [cacheOtpModal, setCacheOtpModal] = useState(false);
  const [cacheStatus, setCacheStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/health');
      setData(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCache = useCallback(async () => {
    try {
      const res = await api.get('/admin/cache-stats');
      setCacheCount(res.data.count);
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => { load(); loadCache(); }, [load, loadCache]);

  const handleClearCache = async (otp) => {
    try {
      await api.delete('/admin/cache', { data: { otp } });
      setCacheStatus({ type: 'success', msg: 'Auth cache cleared. All users will re-authenticate from DB on next request.' });
      setCacheCount(0);
    } catch (err) {
      setCacheStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to clear cache.' });
    } finally {
      setCacheOtpModal(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="text-center text-red-500 py-12">{error}</div>;
  if (!data) return null;

  const memPct = Math.round((data.memory.used / data.memory.total) * 100);

  return (
    <div className="space-y-5">
      {cacheOtpModal && (
        <OtpModal
          actionLabel="Clear all auth cache? Users will re-authenticate from DB on their next request."
          onConfirm={handleClearCache}
          onClose={() => setCacheOtpModal(false)}
        />
      )}

      <div className="flex justify-end">
        <button onClick={() => { load(); loadCache(); }} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Uptime', value: formatUptime(data.uptime) },
          { label: 'Node.js', value: data.nodeVersion },
          { label: 'Environment', value: data.env },
          { label: 'CPUs', value: `${data.cpuCount} cores` },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-400 mb-1">{c.label}</div>
            <div className="font-semibold text-slate-800 text-sm">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-700 text-sm">Memory (RAM)</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Used: {formatBytes(data.memory.used)}</span>
              <span>Total: {formatBytes(data.memory.total)}</span>
            </div>
            <div className="bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${memPct > 85 ? 'bg-red-500' : memPct > 65 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${memPct}%` }}
              />
            </div>
            <div className="text-xs text-slate-400">{memPct}% in use</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-700 text-sm">Database</h3>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${data.db.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">{data.db.status === 'ok' ? 'Connected' : 'Error'}</span>
          </div>
          {data.db.latencyMs !== null && (
            <div className="text-xs text-slate-400">Ping: {data.db.latencyMs}ms</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={15} className="text-indigo-600" />
            <h3 className="font-semibold text-slate-700 text-sm">Uploaded Files</h3>
          </div>
          <div className="text-2xl font-bold text-slate-800">{data.uploads.fileCount}</div>
          <div className="text-xs text-slate-400">{formatBytes(data.uploads.totalSizeBytes)} total size</div>
        </div>
      </div>

      {/* Cache Manager */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={15} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-700 text-sm">Auth Cache Manager</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          User records are cached in memory for 30 seconds to reduce DB queries. Clearing forces all users to re-read from DB on their next request.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-800">{cacheCount ?? '…'}</span>
            <span className="text-xs text-slate-400">cached entries</span>
          </div>
          <button
            onClick={() => setCacheOtpModal(true)}
            className="flex items-center gap-1.5 text-xs text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg font-medium hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={12} /> Clear Cache
          </button>
          <button
            onClick={loadCache}
            className="flex items-center gap-1.5 text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        {cacheStatus && <div className="mt-3"><Toast type={cacheStatus.type} msg={cacheStatus.msg} /></div>}
      </div>
    </div>
  );
}


