"use client";
// Modals extracted from StockOut.jsx — markup and behavior unchanged.
import React from "react";
import { Check, FileText, ListOrdered, PackageMinus, Tag, X } from "lucide-react";

export default function StockOutModals({
  activeComboName, availableSerials, barcodeVariants, comboDetails,
  confirmSerialOut, confirmSku, handleSerialToggle, issueQty, previewFileUrl,
  previewIsPdf, selectVariant, selectedSerials, selectedSkuId,
  setSelectedSkuId, setShowComboDetailsModal, setShowInvoicePreview,
  setShowSerialModal, setShowSkuModal, setShowVariantModal,
  showComboDetailsModal, showInvoicePreview, showSerialModal, showSkuModal,
  showVariantModal, skus,
}) {
  return (
    <>
      {/* Variant Selection Modal Overlay */}
      {showVariantModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <PackageMinus size={20} className="text-rose-500" /> Select Variant
            </h3>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {barcodeVariants.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => (v.isCombo || v.availableQty > 0) ? selectVariant(v) : null}
                  disabled={!v.isCombo && v.availableQty <= 0}
                  className={`flex flex-col items-start p-4 border rounded-xl transition-all text-left w-full ${!v.isCombo && v.availableQty <= 0
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : v.isCombo
                      ? 'border-fuchsia-200 bg-fuchsia-50/30 hover:border-fuchsia-400 hover:bg-fuchsia-50'
                      : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50'
                    }`}
                >
                  <div className="flex justify-between w-full items-start">
                    <span className="font-bold text-slate-800">{v.variantCode || v.itemName}</span>
                    {!!v.isCombo && (
                      <span className="bg-fuchsia-100 text-fuchsia-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                        COMBO / PACK
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 w-full">
                    {v.isCombo ? (
                      <div className="mt-2 bg-white/50 rounded-lg p-2 border border-fuchsia-100">
                        <div className="text-[10px] font-black text-fuchsia-600 uppercase mb-1 tracking-wider">Includes:</div>
                        <div className="space-y-1">
                          {v.components?.map((c, ci) => (
                            <div key={ci} className="flex justify-between items-center gap-4">
                              <span className="font-medium truncate">{c.variantName}</span>
                              <span className="font-black text-fuchsia-700 whitespace-nowrap">{c.quantity} {c.unitName || 'PCS'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center w-full">
                        <span className="font-medium">Available Qty: {v.availableQty} {v.unitName || 'PCS'}</span>
                        {v.availableQty <= 0 && (
                          <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-wider">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowVariantModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SKU Modal Overlay */}
      {showSkuModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <Tag size={20} className="text-amber-500" /> Select SKU
            </h3>
            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 mb-6 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="">-- Choose SKU --</option>
              {skus.map(s => (
                <option key={s.skuId} value={s.skuId}>{s.skuName}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSkuModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSku}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-md shadow-amber-200 flex items-center gap-2 transition-colors"
              >
                <Check size={16} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Serials Modal Overlay */}
      {showSerialModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
              <ListOrdered size={20} className="text-blue-500" /> Select Serial Numbers
            </h3>
            <p className="text-sm font-medium text-slate-500 mb-4">
              Select exactly <span className="font-bold text-rose-600">{issueQty}</span> serial numbers from available stock.
              <span className="ml-2 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
                Selected: {selectedSerials.length}
              </span>
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-[300px] overflow-y-auto mb-6 grid grid-cols-2 gap-3">
              {availableSerials.length > 0 ? (
                availableSerials.map((s) => (
                  <label key={s.serialId} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedSerials.includes(s.serialId) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                    <input
                      type="checkbox"
                      checked={selectedSerials.includes(s.serialId)}
                      onChange={() => handleSerialToggle(s.serialId)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      disabled={!selectedSerials.includes(s.serialId) && selectedSerials.length >= Number(issueQty)}
                    />
                    <span className="text-sm font-bold font-mono text-slate-700 truncate">{s.serialNumber}</span>
                  </label>
                ))
              ) : (
                <div className="col-span-2 text-center text-sm font-medium text-slate-500 py-6">
                  No serial numbers available in stock.
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSerialModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSerialOut}
                disabled={selectedSerials.length !== Number(issueQty)}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-white text-white px-6 py-2 rounded-lg font-bold shadow-md shadow-blue-200 flex items-center gap-2 transition-colors"
              >
                <Check size={16} /> Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Combo Details Modal */}
      {showComboDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200 border border-fuchsia-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Tag size={20} className="text-fuchsia-500" /> Combo Contents
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">{activeComboName}</p>
              </div>
              <button onClick={() => setShowComboDetailsModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="bg-fuchsia-50/30 border border-fuchsia-100 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left">
                <thead className="bg-fuchsia-100 text-fuchsia-700 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="py-2 px-4">Item Name</th>
                    <th className="py-2 px-4 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fuchsia-100">
                  {comboDetails.map((c, i) => (
                    <tr key={i} className="hover:bg-white/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-xs font-bold text-slate-700">{c.itemName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.variantCode}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-black text-fuchsia-700">{c.quantity} {c.unitName || 'PCS'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowComboDetailsModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}


      {/* Invoice Preview Modal */}
      {showInvoicePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-rose-600 p-2 rounded-xl text-white shadow-lg shadow-rose-100">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Stock Out Invoice</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Verification & Audit</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInvoicePreview(false);
                  if (previewFileUrl.startsWith('blob:')) URL.revokeObjectURL(previewFileUrl);
                }}
                className="p-2.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 bg-slate-200 overflow-auto p-4 flex justify-center items-center">
              {previewIsPdf ? (
                <iframe
                  src={`${previewFileUrl}#toolbar=0`}
                  className="w-full h-full rounded-xl border shadow-lg bg-white"
                  title="PDF Invoice"
                />
              ) : (
                <img
                  src={previewFileUrl}
                  alt="Invoice"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  onError={(e) => {
                    e.target.src = "https://placehold.co/600x400?text=Invoice+Preview+Not+Available";
                  }}
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => {
                  setShowInvoicePreview(false);
                  if (previewFileUrl.startsWith('blob:')) URL.revokeObjectURL(previewFileUrl);
                }}
                className="bg-slate-800 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

