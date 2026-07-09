"use client";
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Edit2, Trash2, ChevronLeft, ChevronRight, X, Plus, Download, Clock, CheckCircle, AlertCircle, History } from 'lucide-react';
import api from '@/lib/client/apiClient';
import OtpModal from './OtpModal';
import CreateTableModal from './CreateTableModal';

const Toast = ({ type, msg, onDismiss }) => {
  if (!msg) return null;
  const styles = type === 'success'
    ? 'bg-green-50 border border-green-200 text-green-700'
    : 'bg-red-50 border border-red-200 text-red-700';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${styles}`}>
      <Icon size={15} className="shrink-0" /> <span className="flex-1">{msg}</span>
      {onDismiss && <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>}
    </div>
  );
};

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
  </div>
);

export default function DbExplorerTab() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [editRow, setEditRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [otpModal, setOtpModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setPendingCreate] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);
  const [cleanupStatus, setCleanupStatus] = useState(null);
  const [changeLog, setChangeLog] = useState([]);

  const refreshTables = useCallback(() => {
    api.get('/admin/tables').then((r) => setTables(r.data)).catch(() => {});
  }, []);

  useEffect(() => { refreshTables(); }, [refreshTables]);

  const loadTable = useCallback(async (name, pg = 0) => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/table/${name}?page=${pg}`);
      setTableData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTableSelect = (name) => {
    setSelectedTable(name);
    setPage(0);
    setTableData(null);
    setEditRow(null);
    loadTable(name, 0);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadTable(selectedTable, newPage);
  };

  const handleEdit = (row) => {
    setEditRow(row);
    setEditData({ ...row });
  };

  const handleSaveClick = () => {
    if (!tableData?.primaryKey) return;
    const pkValue = editRow[tableData.primaryKey];
    const diffFields = Object.keys(editData)
      .filter(k => k !== tableData.primaryKey && String(editData[k] ?? '') !== String(editRow[k] ?? ''))
      .map(k => ({ field: k, oldVal: String(editRow[k] ?? ''), newVal: String(editData[k] ?? '') }));
    const changedLines = diffFields
      .map(({ field, oldVal, newVal }) => `  • ${field}: "${oldVal.slice(0, 40)}" → "${newVal.slice(0, 40)}"`)
      .join('\n');
    // snapshot for closure
    const snapshot = { table: selectedTable, pkValue: String(pkValue), diffFields, ts: null };
    setOtpModal({
      actionLabel: `Table: ${selectedTable}\nRecord ID: ${String(pkValue).slice(0, 60)}\n\nFields being changed:\n${changedLines || '  (no fields modified)'}`,
      onConfirm: async (otp) => {
        await api.put(`/admin/table/${selectedTable}/${pkValue}`, {
          pkColumn: tableData.primaryKey,
          data: editData,
          otp,
        });
        setChangeLog(prev => [{ ...snapshot, ts: new Date() }, ...prev]);
        setEditRow(null);
        loadTable(selectedTable, page);
      },
    });
  };



  const handleExportCSV = async () => {
    if (!selectedTable) return;
    setExportLoading(true);
    try {
      const { getStoredToken } = await import('../../utils/auth');
      const token = getStoredToken();
      const res = await fetch(`/api/admin/export-table/${encodeURIComponent(selectedTable)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleCleanupLogs = () => {
    setOtpModal({
      actionLabel: `Delete activity log entries older than ${cleanupDays} day(s)? This cannot be undone.`,
      onConfirm: async (otp) => {
        const res = await api.delete('/admin/cleanup-logs', { data: { days: cleanupDays, otp } });
        setCleanupStatus({ type: 'success', msg: res.data?.message || 'Old logs deleted.' });
      },
    });
  };

  const handleCreateTableSubmit = (tableSpec) => {
    setPendingCreate(tableSpec);
    setShowCreateModal(false);
    setOtpModal({
      actionLabel: `Create new table "${tableSpec.tableName}" with ${tableSpec.columns.length} column(s)?`,
      onConfirm: async (otp) => {
        await api.post('/admin/tables', { ...tableSpec, otp });
        refreshTables();
        setPendingCreate(null);
      },
    });
  };

  const totalPages = tableData ? Math.ceil(tableData.total / tableData.limit) : 0;

  return (
    <div className="space-y-4">
      {otpModal && (
        <OtpModal
          actionLabel={otpModal.actionLabel}
          onConfirm={otpModal.onConfirm}
          onClose={() => { setOtpModal(null); setPendingCreate(null); }}
        />
      )}

      {showCreateModal && (
        <CreateTableModal
          onConfirm={handleCreateTableSubmit}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedTable}
          onChange={(e) => handleTableSelect(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] max-w-xs"
        >
          <option value="">Select a table...</option>
          {tables.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.rowCount ?? '?'} rows)
            </option>
          ))}
        </select>

        {selectedTable && (
          <button
            onClick={() => loadTable(selectedTable, page)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} /> Create Table
          </button>

          {selectedTable && (
            <>
              <button
                onClick={handleExportCSV}
                disabled={exportLoading}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download size={14} /> {exportLoading ? 'Exporting…' : 'Export CSV'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editRow && tableData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Record Edit</h3>
              <button onClick={() => setEditRow(null)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              {tableData.columns.map((col) => (
                <div key={col.field}>
                  <label className="text-xs font-medium text-slate-500 block mb-1">
                    {col.field}
                    {col.key === 'PRI' && <span className="ml-1 text-amber-500">(Primary Key)</span>}
                  </label>
                  <input
                    type="text"
                    value={editData[col.field] ?? ''}
                    onChange={(e) => setEditData((prev) => ({ ...prev, [col.field]: e.target.value }))}
                    disabled={col.key === 'PRI'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditRow(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save (OTP Required)
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <Spinner />}

      {!loading && tableData && (
        <>
          <div className="text-xs text-slate-500">
            {tableData.total} total rows — showing {page * tableData.limit + 1}–
            {Math.min((page + 1) * tableData.limit, tableData.total)}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {tableData.columns.map((col) => (
                    <th key={col.field} className="text-left px-3 py-2.5 text-slate-600 font-medium whitespace-nowrap">
                      {col.field}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {tableData.columns.map((col) => (
                      <td key={col.field} className="px-3 py-2 text-slate-700 max-w-[180px] truncate">
                        {row[col.field] === null ? (
                          <span className="text-slate-300 italic">null</span>
                        ) : (
                          String(row[col.field])
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {tableData.primaryKey && (
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleEdit(row)} className="text-indigo-500 hover:text-indigo-700">
                            <Edit2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="p-1 disabled:opacity-40 hover:text-indigo-600"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="p-1 disabled:opacity-40 hover:text-indigo-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {!loading && !selectedTable && (
        <div className="text-center text-slate-400 py-12">
          Select a table from the dropdown above
        </div>
      )}

      {/* Cleanup Logs Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={15} className="text-amber-500" />
          <h3 className="font-semibold text-slate-700 text-sm">Cleanup Activity Logs</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Delete old <code className="bg-slate-100 px-1 rounded">useractivitylogs</code> entries to free up database space.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Delete logs older than</label>
            <input
              type="number"
              min={1}
              max={365}
              value={cleanupDays}
              onChange={e => setCleanupDays(Number(e.target.value))}
              className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <label className="text-xs text-slate-500 font-medium">days</label>
          </div>
          <button
            onClick={handleCleanupLogs}
            className="flex items-center gap-1.5 text-xs text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-50 transition-colors"
          >
            <Trash2 size={12} /> Delete Old Logs
          </button>
        </div>
        {cleanupStatus && (
          <div className="mt-3">
            <Toast type={cleanupStatus.type} msg={cleanupStatus.msg} onDismiss={() => setCleanupStatus(null)} />
          </div>
        )}
      </div>

      {/* Session Change Log */}
      {changeLog.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History size={15} className="text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">DB Changes This Session</span>
              <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">{changeLog.length}</span>
            </div>
            <button
              onClick={() => setChangeLog([])}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {changeLog.map((entry, i) => (
              <div key={i} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{entry.table}</span>
                    <span className="text-xs text-slate-500">ID: <span className="font-mono text-slate-700">{entry.pkValue}</span></span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {entry.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {entry.diffFields.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No fields were modified</p>
                ) : (
                  <div className="space-y-1">
                    {entry.diffFields.map(({ field, oldVal, newVal }) => (
                      <div key={field} className="flex items-start gap-2 text-xs font-mono">
                        <span className="text-slate-500 shrink-0 w-32 truncate">{field}</span>
                        <span className="text-red-500 line-through truncate max-w-[120px]" title={oldVal}>{oldVal || <em className="not-italic text-slate-300">empty</em>}</span>
                        <span className="text-slate-400 shrink-0">→</span>
                        <span className="text-green-600 truncate max-w-[120px]" title={newVal}>{newVal || <em className="not-italic text-slate-300">empty</em>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


