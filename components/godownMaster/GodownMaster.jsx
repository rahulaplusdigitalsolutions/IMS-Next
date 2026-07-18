"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Loader2, MapPin, Plus, Search, Star, Trash2, Warehouse, X, ArrowRightLeft, History, CheckSquare, Square } from 'lucide-react';
import Swal from 'sweetalert2';
import { printerService } from '@/lib/services/api';

export default function GodownMaster({ currentUser }) {
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    guid: null,
    godownName: '',
    godownAddress: '',
    isDefault: false
  });

  const [activeTab, setActiveTab] = useState('godowns'); // godowns, transfer, history

  // Transfer State
  const [sourceGodown, setSourceGodown] = useState('');
  const [targetModel, setTargetModel] = useState('');
  const [destinationGodown, setDestinationGodown] = useState('');
  const [modelsList, setModelsList] = useState([]);
  const [serialsList, setSerialsList] = useState([]);
  const [selectedSerials, setSelectedSerials] = useState([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchingSerials, setFetchingSerials] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const canManage = currentUser?.role === 'Admin' || !!currentUser?.allow_edit_godown;

  const fetchGodowns = async () => {
    try {
      setLoading(true);
      const data = await printerService.getGodowns();
      setGodowns(Array.isArray(data) ? data : []);
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || error.message || 'Failed to fetch godowns', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  const filteredGodowns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return godowns;
    return godowns.filter((godown) =>
      (godown.godownName || '').toLowerCase().includes(q) ||
      (godown.godownAddress || '').toLowerCase().includes(q)
    );
  }, [godowns, searchTerm]);

  const openModal = (godown = null) => {
    setFormData({
      guid: godown?.guid || null,
      godownName: godown?.godownName || '',
      godownAddress: godown?.godownAddress || '',
      isDefault: Boolean(godown?.isDefault)
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ guid: null, godownName: '', godownAddress: '', isDefault: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const godownName = formData.godownName.trim();
    if (!godownName) {
      Swal.fire('Warning', 'Godown name is required', 'warning');
      return;
    }

    try {
      setSaving(true);
      if (formData.guid) {
        await printerService.updateGodown(formData.guid, { ...formData, godownName });
        Swal.fire('Success', 'Godown updated', 'success');
      } else {
        await printerService.addGodown({ ...formData, godownName });
        Swal.fire('Success', 'Godown added', 'success');
      }
      closeModal();
      fetchGodowns();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || error.message || 'Failed to save godown', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (godown) => {
    const confirm = await Swal.fire({
      title: 'Delete godown?',
      text: `${godown.godownName} will be removed from master and unassigned from linked serials.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete'
    });

    if (!confirm.isConfirmed) return;

    try {
      await printerService.deleteGodown(godown.guid);
      Swal.fire('Deleted', 'Godown deleted successfully', 'success');
      fetchGodowns();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || error.message || 'Failed to delete godown', 'error');
    }
  };

  // ------------------ TRANSFER LOGIC ------------------

  useEffect(() => {
    if (sourceGodown) {
      setFetchingModels(true);
      printerService.getGodownModels(sourceGodown)
        .then(data => setModelsList(Array.isArray(data) ? data : []))
        .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'))
        .finally(() => setFetchingModels(false));
      setTargetModel('');
      setSerialsList([]);
      setSelectedSerials([]);
    } else {
      setModelsList([]);
      setTargetModel('');
      setSerialsList([]);
      setSelectedSerials([]);
    }
  }, [sourceGodown]);

  useEffect(() => {
    if (sourceGodown && targetModel) {
      setFetchingSerials(true);
      printerService.getGodownModelSerials(sourceGodown, targetModel)
        .then(data => setSerialsList(Array.isArray(data) ? data : []))
        .catch(err => Swal.fire('Error', err.response?.data?.message || err.message, 'error'))
        .finally(() => setFetchingSerials(false));
      setSelectedSerials([]);
    } else {
      setSerialsList([]);
      setSelectedSerials([]);
    }
  }, [targetModel, sourceGodown]);

  const handleTransfer = async () => {
    if (!sourceGodown || !destinationGodown || selectedSerials.length === 0 || !targetModel) {
      Swal.fire('Warning', 'Please complete all selections to transfer.', 'warning');
      return;
    }

    if (sourceGodown === destinationGodown) {
      Swal.fire('Warning', 'Source and Destination cannot be the same.', 'warning');
      return;
    }

    const selectedModelName = modelsList.find(m => m.modelId === targetModel)?.modelName || 'Unknown';

    const confirm = await Swal.fire({
      title: 'Confirm Transfer?',
      text: `Move ${selectedSerials.length} serial(s) of ${selectedModelName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Yes, Transfer'
    });

    if (!confirm.isConfirmed) return;

    setTransferring(true);
    try {
      await printerService.transferGodownStock({
        sourceGodownId: sourceGodown,
        destinationGodownId: destinationGodown,
        serialIds: selectedSerials,
        modelName: selectedModelName
      });
      Swal.fire('Success', 'Stock Transferred Successfully', 'success');
      
      // Reset transfer state
      setSourceGodown('');
      setTargetModel('');
      setDestinationGodown('');
      setSelectedSerials([]);
      setSerialsList([]);
      setModelsList([]);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setTransferring(false);
    }
  };

  const toggleSerial = (id) => {
    setSelectedSerials(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAllSerials = () => {
    if (selectedSerials.length === serialsList.length) {
      setSelectedSerials([]);
    } else {
      setSelectedSerials(serialsList.map(s => s.id));
    }
  };

  // ------------------ HISTORY LOGIC ------------------

  const fetchHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await printerService.getGodownTransferHistory(page, 20);
      setHistory(res.data);
      setHistoryTotal(res.total);
      setHistoryPage(res.page);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || err.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(1);
    }
  }, [activeTab]);


  return (
    <div className="space-y-6 text-slate-900">
      
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('godowns')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === 'godowns' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Warehouse size={18} />
          Godowns
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          disabled={!canManage}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition disabled:opacity-50 ${activeTab === 'transfer' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ArrowRightLeft size={18} />
          Stock Transfer
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <History size={18} />
          Transfer History
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-white px-5 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                {activeTab === 'godowns' && 'Godown Master'}
                {activeTab === 'transfer' && 'Stock Transfer Between Godowns'}
                {activeTab === 'history' && 'Stock Transfer History'}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {activeTab === 'godowns' && 'Manage internal godowns used while adding printer serials.'}
                {activeTab === 'transfer' && 'Move available serial numbers from one godown to another.'}
                {activeTab === 'history' && 'View the audit log of stock movements between godowns.'}
              </p>
            </div>
            
            {activeTab === 'godowns' && (
              <button
                onClick={() => openModal()}
                disabled={!canManage}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus size={18} />
                Add Godown
              </button>
            )}
          </div>
        </div>

        {/* -------------------- GODOWNS TAB -------------------- */}
        {activeTab === 'godowns' && (
          <>
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search godown..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : filteredGodowns.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-500">
                <Warehouse size={48} className="mb-4 text-slate-300" />
                <p className="text-lg font-semibold">No godowns found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Godown Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Default</th>
                      <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredGodowns.map((godown) => (
                      <tr key={godown.guid} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            <MapPin size={16} className="text-indigo-500" />
                            {godown.godownName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          <p className="line-clamp-2 max-w-xl">{godown.godownAddress || '-'}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {godown.isDefault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                              <Star size={12} /> Default
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openModal(godown)} disabled={!canManage} className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50" title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(godown)} disabled={!canManage} className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* -------------------- STOCK TRANSFER TAB -------------------- */}
        {activeTab === 'transfer' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* STEP 1 */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">1. Select Source Godown</label>
                <select 
                  value={sourceGodown} 
                  onChange={(e) => setSourceGodown(e.target.value)} 
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Godown --</option>
                  {godowns.map(g => (
                    <option key={g.guid} value={g.guid}>{g.godownName}</option>
                  ))}
                </select>
              </div>

              {/* STEP 2 */}
              <div className="space-y-1 relative">
                <label className="text-sm font-bold text-slate-700">2. Select Product Model</label>
                <select 
                  value={targetModel} 
                  onChange={(e) => setTargetModel(e.target.value)}
                  disabled={!sourceGodown || fetchingModels}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:opacity-70"
                >
                  <option value="">-- Choose Model --</option>
                  {modelsList.map(m => (
                    <option key={m.modelId} value={m.modelId}>{m.modelName} ({m.availableCount} available)</option>
                  ))}
                </select>
                {fetchingModels && <Loader2 className="absolute right-10 top-9 animate-spin text-indigo-600" size={16} />}
              </div>
            </div>

            {/* STEP 3 */}
            <div className="mb-6 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-bold text-slate-800">3. Select Serial Numbers to Transfer</h3>
                {fetchingSerials && <Loader2 className="animate-spin text-indigo-600" size={18} />}
              </div>
              
              <div className="max-h-64 overflow-y-auto p-4 bg-white">
                {serialsList.length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">No serials available. Please select a source godown and model first.</p>
                ) : (
                  <div className="space-y-3">
                    <button onClick={toggleAllSerials} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 mb-2">
                      {selectedSerials.length === serialsList.length ? <CheckSquare size={16} /> : <Square size={16} />}
                      {selectedSerials.length === serialsList.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {serialsList.map(serial => {
                        const isSelected = selectedSerials.includes(serial.id);
                        return (
                          <div 
                            key={serial.id} 
                            onClick={() => toggleSerial(serial.id)}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                              isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <CheckSquare size={14} className="text-white" />}
                            </div>
                            <span className="text-sm font-bold text-slate-700 truncate" title={serial.serialNumber}>{serial.serialNumber}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              {/* STEP 4 */}
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">4. Select Destination Godown</label>
                <select 
                  value={destinationGodown} 
                  onChange={(e) => setDestinationGodown(e.target.value)} 
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Destination --</option>
                  {godowns.filter(g => g.guid !== sourceGodown).map(g => (
                    <option key={g.guid} value={g.guid}>{g.godownName}</option>
                  ))}
                </select>
              </div>

              {/* STEP 5 */}
              <div>
                <button 
                  onClick={handleTransfer}
                  disabled={transferring || !sourceGodown || !destinationGodown || selectedSerials.length === 0 || !targetModel}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {transferring ? <Loader2 size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
                  Transfer {selectedSerials.length > 0 ? `${selectedSerials.length} Items` : 'Stock'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TRANSFER HISTORY TAB -------------------- */}
        {activeTab === 'history' && (
          <div className="flex flex-col">
            {historyLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : history.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-slate-500">
                <History size={48} className="mb-4 text-slate-300" />
                <p className="text-lg font-semibold">No transfers recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Model</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Serial No.</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">From Godown</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">To Godown</th>
                      <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Transferred By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {history.map((item) => (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 font-medium">
                          {new Date(item.transferDate).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {item.modelName}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                          {item.serialNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-600">
                           {item.fromGodown}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-600">
                          <span className="flex items-center gap-1.5 text-emerald-600">
                            <ArrowRightLeft size={14} />
                            {item.toGodown}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          {item.transferredBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Controls for History */}
            {historyTotal > 20 && (
              <div className="border-t border-slate-200 p-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Showing page {historyPage} of {Math.ceil(historyTotal / 20)}
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={historyPage === 1 || historyLoading}
                    onClick={() => fetchHistory(historyPage - 1)}
                    className="px-3 py-1 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={historyPage >= Math.ceil(historyTotal / 20) || historyLoading}
                    onClick={() => fetchHistory(historyPage + 1)}
                    className="px-3 py-1 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">{formData.guid ? 'Edit Godown' : 'Add Godown'}</h3>
              <button onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Godown Name</label>
                  <input
                    type="text"
                    value={formData.godownName}
                    onChange={(e) => setFormData({ ...formData, godownName: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    placeholder="e.g. Main Godown"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Address</label>
                  <textarea
                    value={formData.godownAddress}
                    onChange={(e) => setFormData({ ...formData, godownAddress: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500"
                    placeholder="Full godown address..."
                    rows={3}
                  />
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Set as default godown
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {formData.guid ? 'Save Changes' : 'Add Godown'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

