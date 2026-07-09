"use client";
// Modals extracted from Returns.jsx — markup and behavior unchanged.
import React from "react";
import {
  AlertCircle, Box, ExternalLink, FileText, MapPin, Phone, Receipt,
  ScanLine, Truck, X,
} from "lucide-react";
import { format } from "date-fns";

export default function ReturnsModals({
  closeOrderDetails, condition, confirmReturn, getReturnCustomerName,
  getReturnDispatchDate, getReturnFirmName, getReturnInvoiceNumber,
  getReturnLogisticsStatus, getReturnOrderId, getReturnReason,
  getReturnShippingAddress, getReturnStatus, getReturnTrackingId,
  handleOpenUploadFile, loadingOrderDetails, orderDetails,
  orderDetailsDispatchId, orderDetailsError, orderDetailsId, orderInvoiceUrl,
  pendingSerial, pendingSerialDetails, reason, refundAmount, refundStatus,
  returnQuantity, selectedReturnOrder, setMessage, setReason,
  setRefundAmount, setRefundStatus, setReturnQuantity, setSerialInput,
  setShowConditionModal, showConditionModal,
}) {
  return (
    <>
      {/* CONDITION MODAL */}
      {showConditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-lg font-bold text-white mb-1">Check Condition</h3>
              <p className="text-xs text-slate-400">Select the condition of the returned item</p>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Serial Number</p>
                    <p className="font-mono text-2xl font-black text-indigo-600 tracking-wide">{pendingSerial}</p>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                    <ScanLine size={24} />
                  </div>
                </div>
                
                {pendingSerialDetails && pendingSerialDetails.linkedOrder && (
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Model</span>
                      <span className="font-bold text-slate-700">{pendingSerialDetails.modelName || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Platform</span>
                      <span className="font-bold text-slate-700">{getReturnFirmName(pendingSerialDetails.linkedOrder) || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold mb-0.5">Order ID</span>
                      <span className="font-bold text-slate-700 truncate block">{getReturnOrderId(pendingSerialDetails.linkedOrder) || pendingSerialDetails.linkedOrder.customerName || "N/A"}</span>
                    </div>
                  </div>
                )}
                
                {pendingSerialDetails?.smartWarning && (
                  <div className="mt-3 bg-amber-50 text-amber-700 text-xs p-2.5 rounded-lg text-left flex gap-2 items-start border border-amber-100">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span className="font-medium">{pendingSerialDetails.smartWarning}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                {pendingSerialDetails?.isInventoryItem && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Return Quantity <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Box size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="number"
                        min="1"
                        className="w-full border border-slate-200 p-3 pl-10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all focus:bg-white bg-slate-50"
                        placeholder="Enter quantity"
                        value={returnQuantity}
                        onChange={(e) => setReturnQuantity(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                )}
                
                <div className={pendingSerialDetails?.isInventoryItem ? "col-span-2 sm:col-span-1" : "col-span-2"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Refund Status <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all focus:bg-white bg-slate-50"
                    value={refundStatus}
                    onChange={(e) => {
                      setRefundStatus(e.target.value);
                      if(e.target.value === "None") setRefundAmount("0");
                    }}
                  >
                    <option value="Full">Full Refund</option>
                    <option value="Partial">Partial Refund</option>
                    <option value="None">No Refund</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Refund Amount (₹) {refundStatus !== "None" && <span className="text-red-500">*</span>}</label>
                  <input 
                    type="number"
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 transition-all focus:bg-white bg-slate-50"
                    placeholder="Amount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    disabled={refundStatus === "None"}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Return Reason <span className="text-red-500">*</span></label>
                  <textarea 
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all focus:bg-white bg-slate-50" 
                    rows={2} 
                    placeholder="Why is this item being returned?" 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowConditionModal(false); setSerialInput(""); setMessage({ type:"", text:"" }); }} 
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmReturn} 
                  className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${
                    condition === "InStock" 
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30" 
                      : "bg-red-600 hover:bg-red-700 shadow-red-500/30"
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedReturnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 flex items-start justify-between text-white">
              <div>
                <h3 className="text-xl font-extrabold flex items-center gap-2">
                  <Receipt size={20} /> Order Details
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="bg-white/10 px-2 py-1 rounded-lg font-semibold">
                    {getReturnCustomerName(orderDetails) || getReturnCustomerName(selectedReturnOrder) || "N/A"}
                  </span>
                  {orderDetailsDispatchId && (
                    <span className="bg-white/10 px-2 py-1 rounded-lg font-mono">
                      Ref #{orderDetailsDispatchId}
                    </span>
                  )}
                  <span className="bg-white/10 px-2 py-1 rounded-lg">
                    Return Serial: {selectedReturnOrder.displaySerial || selectedReturnOrder.serialValue || "N/A"}
                  </span>
                </div>
              </div>
              <button
                onClick={closeOrderDetails}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X size={20} className="text-slate-200" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingOrderDetails && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
                  Loading order details...
                </div>
              )}

              {orderDetailsError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {orderDetailsError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Truck size={15} /> Order Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Platform</p>
                      <p className="font-semibold text-slate-700 mt-1">{getReturnFirmName(orderDetails) || getReturnFirmName(selectedReturnOrder) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Order Status</p>
                      <p className="font-semibold text-slate-700 mt-1">{getReturnStatus(orderDetails) || getReturnStatus(selectedReturnOrder) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Logistics Status</p>
                      <p className="font-semibold text-slate-700 mt-1">{getReturnLogisticsStatus(orderDetails) || getReturnLogisticsStatus(selectedReturnOrder) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Dispatch Date</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {(getReturnDispatchDate(orderDetails) || getReturnDispatchDate(selectedReturnOrder))
                          ? format(new Date(getReturnDispatchDate(orderDetails) || getReturnDispatchDate(selectedReturnOrder)), "dd MMM yyyy")
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Invoice No.</p>
                      <p className="font-semibold text-slate-700 mt-1">{getReturnInvoiceNumber(orderDetails) || getReturnInvoiceNumber(selectedReturnOrder) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Tracking ID</p>
                      <p className="font-semibold text-slate-700 mt-1">{getReturnTrackingId(orderDetails) || getReturnTrackingId(selectedReturnOrder) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Warranty</p>
                      <p className="font-semibold text-slate-700 mt-1">{orderDetails?.warranty || selectedReturnOrder.warranty || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Box size={15} /> Product & Return
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Serial</p>
                      <p className="font-mono font-semibold text-slate-700 mt-1">{selectedReturnOrder.displaySerial || selectedReturnOrder.serialValue || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Model</p>
                      <p className="font-semibold text-slate-700 mt-1">{orderDetails?.modelName || selectedReturnOrder.modelName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Return Condition</p>
                      <p className="font-semibold text-slate-700 mt-1">{selectedReturnOrder.condition || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Return Date</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {selectedReturnOrder.returnDate || selectedReturnOrder.createdAt
                          ? format(new Date(selectedReturnOrder.returnDate || selectedReturnOrder.createdAt), "dd MMM yyyy, hh:mm a")
                          : "N/A"}
                      </p>
                    </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Refund Details</p>
                  <p className="font-semibold text-slate-700 mt-1">
                    {selectedReturnOrder.refundStatus || "N/A"} 
                    {selectedReturnOrder.refundAmount > 0 && ` - ₹${selectedReturnOrder.refundAmount}`}
                  </p>
                </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Reason</p>
                      <p className="font-semibold text-slate-700 mt-1 break-words">{getReturnReason(orderDetails) || getReturnReason(selectedReturnOrder) || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <MapPin size={15} /> Customer Details
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Customer / Order ID</p>
                      <p className="font-semibold text-slate-700 mt-1">{orderDetailsId}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Consignee Name</p>
                      <p className="font-semibold text-slate-700 mt-1">{orderDetails?.consigneeName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Phone size={11} /> Contact
                      </p>
                      <p className="font-semibold text-slate-700 mt-1">{orderDetails?.contactNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Shipping Address</p>
                      <p className="font-semibold text-slate-700 mt-1 break-words">
                        {getReturnShippingAddress(orderDetails) || getReturnShippingAddress(selectedReturnOrder) || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <FileText size={15} /> Invoice
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Invoice Number</p>
                      <p className="font-semibold text-slate-700 mt-1">{getReturnInvoiceNumber(orderDetails) || getReturnInvoiceNumber(selectedReturnOrder) || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Invoice File</p>
                      {orderInvoiceUrl ? (
                        <button
                          type="button"
                          onClick={() => handleOpenUploadFile(orderDetails?.invoiceFilename || selectedReturnOrder?.invoiceFilename, "Invoice")}
                          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <FileText size={14} /> View Invoice
                          <ExternalLink size={12} />
                        </button>
                      ) : (
                        <p className="font-semibold text-slate-400 mt-1">Invoice file not uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
              <button
                onClick={closeOrderDetails}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

