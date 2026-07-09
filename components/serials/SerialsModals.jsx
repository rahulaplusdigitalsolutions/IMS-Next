"use client";
// Modals and popups extracted from Serials.jsx — markup and behavior unchanged.
import React from "react";
import {
  AlertCircle, AlertTriangle, Box, CheckCircle2, Download, File, Filter,
  Info, MessageSquare, Pencil, Plus, QrCode, Save, Trash2, Upload,
  Warehouse, X,
} from "lucide-react";
import MasterDropdown from "../common/MasterDropdown";

export default function SerialsModals({
  canManage, dragActive, editData, editExceedsMRP, editIsDuplicate,
  editLoading, editPopup, fileInputRef, getModelColor, getModelMRP,
  getModelName, getWarehouseLabel, godowns, handleAddGodown, handleDelete,
  handleDownloadTemplate, handleDrag, handleDrop, handleEditSave,
  handleFileInputChange, handleReasonCancel, handleReasonSubmit,
  handleRequestModelSubmit, handleUpload, isAdmin, isSaving, models,
  reasonPopup, requestModelForm, setEditData, setEditPopup, setReasonPopup,
  setRequestModelForm, setShowRequestModelModal, setShowResultModal,
  setShowUploadModal, setUploadFile, setUploadModelId, setViewReasonPopup,
  showRequestModelModal, showResultModal, showUploadModal, uploadFile,
  uploadModelId, uploadResult, uploading, viewReasonPopup,
}) {
  return (
    <>
      {/* ✅ Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Upload size={18} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-white">Upload Excel</h3>
              </div>
              <button onClick={() => !uploading && setShowUploadModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white" disabled={uploading}>
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* 🔥 NEW: Model Filter Dropdown */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Filter size={10} /> Filter by Model (Optional)
                </label>
                <select 
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
                  value={uploadModelId}
                  onChange={(e) => setUploadModelId(e.target.value)}
                >
                  <option value="">Upload All Models from Excel</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">If selected, only serials of this model will be saved.</p>
              </div>

              <div
                className={`border-2 dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragActive ? 'border-indigo-500 bg-indigo-50' : uploadFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept=".xlsx,.xls" className="hidden" />
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-600">
                    <File size={32} />
                    <span className="font-bold text-slate-800">{uploadFile.name}</span>
                    <span className="text-xs text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</span>
                    <button onClick={(e) => { e.stopPropagation(); setUploadFile(null); }} className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-all">Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Upload size={32} className="text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">Drag & drop Excel file here</p>
                    <span className="text-xs text-slate-400">or click to browse (.xlsx, .xls max 10MB)</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Instructions</h4>
                <p className="text-xs text-slate-500 mb-2">1. Download the template to get the correct Model IDs.</p>
                <p className="text-xs text-slate-500 mb-2">2. Fill the data without changing column headers.</p>
                <button onClick={handleDownloadTemplate} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-3">
                  <Download size={14} /> Download Template
                </button>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} disabled={uploading} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Cancel</button>
              <button onClick={handleUpload} disabled={!uploadFile || uploading} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 transition-all">
                {uploading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" /> : <Upload size={14} />}
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Upload Results Modal */}
      {showResultModal && uploadResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowResultModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-800 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Upload Results</h3>
              <button onClick={() => setShowResultModal(false)} className="text-slate-400 hover:text-white transition-all"><X size={18} /></button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
              {/* 🔥 UPDATE: Added Skipped Box */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center">
                  <span className="block text-2xl font-bold text-emerald-700">{uploadResult.success?.length || 0}</span>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Success</span>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col items-center justify-center">
                  <span className="block text-2xl font-bold text-red-700">{uploadResult.failed?.length || 0}</span>
                  <span className="text-[10px] text-red-600 font-bold uppercase mt-1">Failed</span>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col items-center justify-center">
                  <span className="block text-2xl font-bold text-amber-700">{uploadResult.skipped?.length || 0}</span>
                  <span className="text-[10px] text-amber-600 font-bold uppercase mt-1">Skipped</span>
                </div>
              </div>

              {uploadResult.failed?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-red-600 uppercase mb-2 border-b border-red-100 pb-1">Failed Rows</h4>
                  <div className="space-y-2">
                    {uploadResult.failed.map((item, idx) => (
                      <div key={idx} className="bg-red-50/50 p-2 rounded-lg border border-red-100 flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                          {/* 🔥 Fallback to show serial if value is undefined */}
                          <span className="text-xs font-bold text-slate-700">Row {item.row} <span className="font-mono text-red-600 bg-red-100 px-1 rounded ml-1">{item.serialNumber || item.value}</span></span>
                        </div>
                        <span className="text-[10px] text-red-600">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowResultModal(false)} className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Reason Required Popup */}
      {reasonPopup.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleReasonCancel} />

          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reason Required</h3>
                <p className="text-[11px] text-white/80">Landing Price exceeds MRP</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">Price Mismatch Detected</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">MRP</p>
                    <p className="text-lg font-bold text-slate-700">
                      ₹{(reasonPopup.pendingSerial?.mrp || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="text-[10px] text-red-400 uppercase font-bold">Landing Price</p>
                    <p className="text-lg font-bold text-red-600">
                      ₹{Number(reasonPopup.pendingSerial?.landingPrice || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                    +₹{(Number(reasonPopup.pendingSerial?.landingPrice || 0) - Number(reasonPopup.pendingSerial?.mrp || 0)).toLocaleString('en-IN')} above MRP
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <QrCode size={12} />
                <span>Serial: <strong className="text-slate-700 font-mono">{reasonPopup.pendingSerial?.value}</strong></span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={10} /> Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none transition-all"
                  rows={3}
                  placeholder="Why is the landing price higher than MRP? (e.g., Import duties, special configuration, accessories included...)"
                  value={reasonPopup.reason}
                  onChange={(e) => setReasonPopup(prev => ({ ...prev, reason: e.target.value }))}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && reasonPopup.reason.trim()) {
                      e.preventDefault();
                      handleReasonSubmit();
                    }
                  }}
                />
                <p className="text-[10px] text-slate-400">
                  {reasonPopup.reason.trim().length}/500 characters • Press Enter to submit
                </p>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={handleReasonCancel}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReasonSubmit}
                disabled={!reasonPopup.reason.trim() || isSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Save size={14} />
                )}
                {isSaving ? "Saving..." : "Save with Reason"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ View Reason Popup */}
      {viewReasonPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setViewReasonPopup(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-white" />
                <span className="text-sm font-bold text-white">LP {'>'} MRP Reason</span>
              </div>
              <button
                onClick={() => setViewReasonPopup(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-all text-white/70 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <QrCode size={14} className="text-slate-400" />
                {/* 🔥 Fallback to show serial if value is undefined */}
                <span className="font-mono text-sm font-bold text-slate-700">{viewReasonPopup.value || viewReasonPopup.serialNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-bold">MRP</p>
                  <p className="text-sm font-bold text-slate-700">
                    ₹{(getModelMRP(viewReasonPopup.modelId) || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
                  <p className="text-[9px] text-red-400 uppercase font-bold">Landing Price</p>
                  <p className="text-sm font-bold text-red-600">
                    ₹{(viewReasonPopup.landingPrice || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  +₹{((Number(viewReasonPopup.landingPrice) || 0) - (getModelMRP(viewReasonPopup.modelId) || 0)).toLocaleString('en-IN')} above MRP
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare size={10} /> Reason
                </label>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  {viewReasonPopup.landingPriceReason || (
                    <span className="text-slate-400 italic">No reason provided</span>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewReasonPopup(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Popup */}
      {editPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setEditPopup(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Pencil size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Serial</h3>
                  <p className="text-[11px] text-white/70">#{editPopup.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditPopup(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <QrCode size={10} /> Serial Number
                </label>
                {isAdmin ? (
                  <div className="relative">
                    <input
                      className={`w-full border p-3 pr-10 rounded-xl text-sm font-mono tracking-wider bg-white outline-none transition-all ${editIsDuplicate
                        ? 'border-red-400 focus:ring-2 focus:ring-red-500 bg-red-50/50'
                        : 'border-slate-200 focus:ring-2 focus:ring-blue-500'
                        }`}
                      value={editData.value}
                      onChange={(e) => setEditData(prev => ({ ...prev, value: e.target.value }))}
                    />
                    {editData.value.trim() && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {editIsDuplicate ? (
                          <AlertCircle size={16} className="text-red-500" />
                        ) : (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full border border-slate-100 p-3 rounded-xl text-sm font-mono tracking-wider bg-slate-50 text-slate-700 font-bold">
                    {editData.value}
                  </div>
                )}
                {editIsDuplicate && (
                  <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle size={11} />
                    Serial "{editData.value.trim()}" already exists!
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Box size={10} /> Model
                </label>
                {isAdmin ? (
                  <select
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    value={editData.modelId}
                    onChange={(e) => {
                      const newModelId = e.target.value;
                      setEditData(prev => ({
                        ...prev,
                        modelId: newModelId,
                        landingPriceReason: ""
                      }));
                    }}
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full border border-slate-100 p-3 rounded-xl text-sm bg-slate-50">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getModelColor(editPopup.modelId)}`}>
                      {getModelName(editPopup.modelId, editPopup)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRP (Reference)</label>
                <div className="w-full border border-slate-100 p-3 rounded-xl text-sm bg-slate-50 text-slate-500">
                  ₹{getModelMRP(editData.modelId).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Landing Price</label>
                {isAdmin ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                    <input
                      type="number"
                      className={`w-full border p-3 pl-7 rounded-xl text-sm bg-white outline-none transition-all ${editExceedsMRP
                        ? 'border-amber-400 focus:ring-2 focus:ring-amber-500 bg-amber-50/30'
                        : 'border-slate-200 focus:ring-2 focus:ring-blue-500'
                        }`}
                      value={editData.landingPrice}
                      onChange={(e) => setEditData(prev => ({ ...prev, landingPrice: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="w-full border border-slate-100 p-3 rounded-xl text-sm bg-slate-50 text-slate-700 font-semibold">
                    ₹{(editPopup.landingPrice || 0).toLocaleString('en-IN')}
                  </div>
                )}
                {editExceedsMRP && (
                  <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangle size={10} />
                    LP (₹{Number(editData.landingPrice).toLocaleString('en-IN')}) exceeds MRP (₹{getModelMRP(editData.modelId).toLocaleString('en-IN')}) — reason required below
                  </p>
                )}
              </div>

              {editExceedsMRP && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare size={10} /> Reason for LP {'>'} MRP <span className="text-red-500">*</span>
                  </label>
                  {isAdmin ? (
                    <textarea
                      className={`w-full border p-3 rounded-xl text-sm outline-none resize-none transition-all ${editData.landingPriceReason.trim()
                        ? 'border-amber-300 bg-amber-50/30 focus:ring-2 focus:ring-amber-500'
                        : 'border-red-300 bg-red-50/30 focus:ring-2 focus:ring-red-500'
                        }`}
                      rows={2}
                      placeholder="Why is the landing price higher than MRP?"
                      value={editData.landingPriceReason}
                      onChange={(e) => setEditData(prev => ({ ...prev, landingPriceReason: e.target.value }))}
                    />
                  ) : (
                    <div className="w-full border border-amber-200 p-3 rounded-xl text-sm bg-amber-50 text-amber-800">
                      {editPopup.landingPriceReason || <span className="text-slate-400 italic">No reason</span>}
                    </div>
                  )}
                  {!editData.landingPriceReason.trim() && (
                    <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                      <AlertCircle size={10} /> Reason is mandatory when LP exceeds MRP
                    </p>
                  )}
                </div>
              )}

              {!editExceedsMRP && editPopup.landingPriceReason && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare size={10} /> Previous LP Reason (Archived)
                  </label>
                  <div className="w-full border border-slate-100 p-3 rounded-xl text-sm bg-slate-50 text-slate-500 italic">
                    {editPopup.landingPriceReason}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Warehouse size={10} /> Godown
                </label>
                {canManage ? (
                  <div className="flex gap-1.5">
                    <select
                      className="min-w-0 flex-1 border border-slate-200 p-3 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                      value={editData.warehouseGuid}
                      onChange={(e) => setEditData(prev => ({ ...prev, warehouseGuid: e.target.value }))}
                    >
                      <option value="">Not assigned</option>
                      {godowns.map((godown) => (
                        <option key={godown.guid} value={godown.guid}>{godown.godownName}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        const guid = await handleAddGodown();
                        if (guid) setEditData(prev => ({ ...prev, warehouseGuid: guid }));
                      }}
                      className="shrink-0 w-11 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center justify-center transition-all"
                      title="Add Godown"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="w-full border border-slate-100 p-3 rounded-xl text-sm bg-slate-50 text-slate-700 font-semibold">
                    {getWarehouseLabel(editPopup)}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                <div className="w-full border border-slate-100 p-3 rounded-xl text-sm bg-slate-50">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {editPopup.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0">
              {canManage && (
                <button
                  onClick={() => handleDelete([editPopup.id])}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-200"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setEditPopup(null)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                {canManage && (
                  <button
                    onClick={handleEditSave}
                    disabled={editLoading || editIsDuplicate || (editExceedsMRP && !editData.landingPriceReason.trim())}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <Save size={14} />
                    )}
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Request Model Modal */}
      {showRequestModelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRequestModelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Plus size={18} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-white">Request New Product Model</h3>
              </div>
              <button onClick={() => setShowRequestModelModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestModelSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-1.5 pb-2 border-b border-slate-50">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    Category *
                  </label>
                  <div className="flex gap-4 mt-1 flex-wrap">
                    {[{ value: "Printer", label: "Printer" }, { value: "PC", label: "PC / Laptop / Desktop" }, { value: "Monitor", label: "Monitor" }].map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="mainCategory"
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          checked={requestModelForm.mainCategory === value}
                          onChange={() => setRequestModelForm(prev => ({ ...prev, mainCategory: value }))}
                        />
                        <span className={`text-sm font-bold ${requestModelForm.mainCategory === value ? 'text-indigo-600' : 'text-slate-500'}`}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Name *</label>
                  <input
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. LaserJet Pro M1136"
                    value={requestModelForm.name}
                    onChange={(e) => setRequestModelForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company *</label>
                  <MasterDropdown
                    code="COMPANY"
                    placeholder="Select Company"
                    value={requestModelForm.company}
                    onChange={(e) => setRequestModelForm(prev => ({ ...prev, company: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRP *</label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="0"
                    value={requestModelForm.mrp}
                    onChange={(e) => setRequestModelForm(prev => ({ ...prev, mrp: e.target.value }))}
                    min="0"
                    required
                  />
                </div>

                {requestModelForm.mainCategory === "Printer" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Printer Category *</label>
                      <MasterDropdown code="PRINTER_CAT" placeholder="Select Category" value={requestModelForm.category} onChange={(e) => setRequestModelForm(prev => ({ ...prev, category: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Color Type *</label>
                      <MasterDropdown code="COLOR_TYPE" placeholder="Select Color Type" value={requestModelForm.colorType} onChange={(e) => setRequestModelForm(prev => ({ ...prev, colorType: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Printer Type *</label>
                      <MasterDropdown code="PRINTER_TYPE" placeholder="Select Printer Type" value={requestModelForm.printerType} onChange={(e) => setRequestModelForm(prev => ({ ...prev, printerType: e.target.value }))} required />
                    </div>
                  </>
                ) : requestModelForm.mainCategory === "Monitor" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen Size *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder='e.g. 24", 27", 32"' value={requestModelForm.screenSize} onChange={(e) => setRequestModelForm(prev => ({ ...prev, screenSize: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. FHD 1080p, QHD 1440p, 4K" value={requestModelForm.resolution} onChange={(e) => setRequestModelForm(prev => ({ ...prev, resolution: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panel Type *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. IPS, VA, TN, OLED" value={requestModelForm.panelType} onChange={(e) => setRequestModelForm(prev => ({ ...prev, panelType: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refresh Rate *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 60Hz, 75Hz, 144Hz" value={requestModelForm.refreshRate} onChange={(e) => setRequestModelForm(prev => ({ ...prev, refreshRate: e.target.value }))} required />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPU *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Core i5 12th Gen" value={requestModelForm.cpu} onChange={(e) => setRequestModelForm(prev => ({ ...prev, cpu: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RAM *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 8GB DDR4" value={requestModelForm.ram} onChange={(e) => setRequestModelForm(prev => ({ ...prev, ram: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SSD/HDD *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 512GB NVMe" value={requestModelForm.ssd} onChange={(e) => setRequestModelForm(prev => ({ ...prev, ssd: e.target.value }))} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen Size <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder='e.g. 14", 15.6", 17"' value={requestModelForm.screenSize} onChange={(e) => setRequestModelForm(prev => ({ ...prev, screenSize: e.target.value }))} />
                    </div>
                  </>
                )}

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[60px]"
                    placeholder="Optional details..."
                    value={requestModelForm.description}
                    onChange={(e) => setRequestModelForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowRequestModelModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                <button type="submit" className="text-white px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition">
                  Request Model & Serial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

