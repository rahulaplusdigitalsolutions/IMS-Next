"use client";
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, X } from 'lucide-react';
import api from '@/lib/client/apiClient';
import OtpModal from './OtpModal';

const formatBytes = (b) => {
  if (!b) return '0 B';
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b > 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b > 1e3) return `${(b / 1e3).toFixed(1)} KB`;
  return `${b} B`;
};

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
const isImage = (fn) => IMAGE_EXTS.some((e) => fn.toLowerCase().endsWith(e));

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
  </div>
);

export default function FileManagerTab() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [otpModal, setOtpModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/files');
      setFiles(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (filename) => {
    setOtpModal({
      actionLabel: `Are you sure you want to permanently delete "${filename}"? This action cannot be undone.`,
      onConfirm: async (otp) => {
        await api.delete(`/admin/files/${encodeURIComponent(filename)}`, { data: { otp } });
        setFiles((prev) => prev.filter((f) => f.filename !== filename));
      },
    });
  };

  const filtered = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {otpModal && (
        <OtpModal
          actionLabel={otpModal.actionLabel}
          onConfirm={otpModal.onConfirm}
          onClose={() => setOtpModal(null)}
        />
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[80vh]">
            <img src={previewUrl} alt="" className="max-w-full max-h-[80vh] rounded-lg shadow-xl" />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{filtered.length} files</span>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-12">No files found</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Filename</th>
                <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Size</th>
                <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Modified</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => (
                <tr key={f.filename} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-slate-700 break-all">{f.filename}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs">
                    {formatBytes(f.size)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs">
                    {new Date(f.modifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-3">
                      {isImage(f.filename) && (
                        <button
                          onClick={() => setPreviewUrl(f.url)}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          Preview
                        </button>
                      )}
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Open
                      </a>
                      <button
                        onClick={() => handleDelete(f.filename)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


