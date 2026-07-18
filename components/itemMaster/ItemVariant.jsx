"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import axios from "axios";
import { Plus, Loader2, ListTree, ArrowLeft, Trash2, Barcode, Hash, ChevronDown, ChevronUp } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const ItemVariant = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawItemId = searchParams.get("itemId");
  const itemName = searchParams.get("itemName") || "Unknown Item";
  
  const [itemVariantId, setItemVariantId] = useState("");
  const [variantCode, setVariantCode] = useState("");
  const [variants, setVariants] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  // Click a variant to expand and see its serial numbers
  const [expandedVariantId, setExpandedVariantId] = useState(null);
  const [serialsByVariant, setSerialsByVariant] = useState({});
  const [loadingSerialsFor, setLoadingSerialsFor] = useState(null);

  const toggleVariantSerials = async (variantId) => {
    if (expandedVariantId === variantId) {
      setExpandedVariantId(null);
      return;
    }
    setExpandedVariantId(variantId);
    if (serialsByVariant[variantId]) return;
    setLoadingSerialsFor(variantId);
    try {
      const response = await axios.get(`${API_BASE_URL}/Inventory/GetVariantSerials`, {
        params: { itemVariantId: variantId },
        headers: getHeaders(),
      });
      setSerialsByVariant((prev) => ({ ...prev, [variantId]: response.data?.data || [] }));
    } catch (error) {
      console.error("Failed to load serials", error);
      setSerialsByVariant((prev) => ({ ...prev, [variantId]: [] }));
    } finally {
      setLoadingSerialsFor(null);
    }
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const getHeaders = () => {
    const token = localStorage.getItem("pt_auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchVariants = async (page = currentPage, limit = pageSize) => {
    if (!rawItemId) return;
    
    setTableLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/Inventory/GetItemVariantList`, {
        params: { itemId: rawItemId, page, limit },
        headers: getHeaders(),
      });
      setVariants(response.data?.data || []);
      setTotalRecords(response.data?.total || 0);
    } catch (error) {
      console.error("Failed to load variants", error);
      setVariants([]);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (!rawItemId) {
      Swal.fire("Error", "No Item ID provided", "error").then(() => {
        router.push("/itemMaster");
      });
      return;
    }
    fetchVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawItemId]);

  useEffect(() => {
    if (rawItemId) fetchVariants(currentPage, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, rawItemId]);

  const handleSaveVariant = async () => {
    if (!variantCode.trim()) {
      Swal.fire("Warning", "Please enter variant code", "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ItemVariantId: itemVariantId || "0",
        ItemId: rawItemId,
        VariantCode: variantCode.trim()
      };
      
      const res = await axios.post(
        `${API_BASE_URL}/Inventory/SaveOrUpdateItemVariant`,
        payload,
        { headers: getHeaders() }
      );
      
      if (res.data?.message === "Success") {
        Swal.fire("Success", "Variant saved successfully", "success");
        setVariantCode("");
        setItemVariantId("");
        fetchVariants();
      } else {
        Swal.fire("Error", res.data?.message || "Failed to save variant", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariant = (id) => {
    Swal.fire({
      title: "Delete Variant?",
      text: "Are you sure you want to delete this variant?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setTableLoading(true);
        try {
          const res = await axios.post(`${API_BASE_URL}/Inventory/DeleteItemVariant`, 
            { itemVariantId: id }, 
            { headers: getHeaders() }
          );
          
          if (res.data?.message === "Success" || !res.data?.message) {
            Swal.fire("Deleted", "Variant deleted successfully", "success");
            fetchVariants();
          } else {
            Swal.fire("Error", res.data?.message || "Failed to delete", "error");
          }
        } catch (error) {
          console.error(error);
          // If the backend returns empty response on success as per CSHTML jQuery ajax
          fetchVariants(); 
        } finally {
          setTableLoading(false);
        }
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 min-h-screen">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <ListTree size={28} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Item Variant Master</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Manage variants for <strong className="text-indigo-600">{itemName}</strong></p>
          </div>
        </div>
        
        <button 
          onClick={() => router.push("/itemMaster")}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
        >
          <ArrowLeft size={16} /> Back to Items
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full opacity-70">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Item Name</label>
            <input
              type="text"
              value={itemName}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-600 font-medium cursor-not-allowed outline-none"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Variant Code <span className="text-slate-400 font-normal normal-case">(Ex: 045-BLACK / 329DW)</span></label>
            <input
              type="text"
              value={variantCode}
              onChange={(e) => setVariantCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveVariant()}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
              placeholder="Enter Variant Code"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveVariant}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 min-w-[160px]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Save Variant
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Variant Code</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-64">Action</th>
              </tr>
            </thead>
                <tbody className="divide-y divide-slate-100">
              {variants.length > 0 ? (
                variants.map((v, index) => (
                  <React.Fragment key={v.itemVariantId || index}>
                  <tr className="hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => toggleVariantSerials(v.itemVariantId)}>
                    <td className="py-4 px-6 text-sm font-bold text-slate-800 font-mono">
                      <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 inline-flex items-center gap-1.5">
                        {v.variantCode}
                        {expandedVariantId === v.itemVariantId ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleVariantSerials(v.itemVariantId)}
                          className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <Hash size={14} /> Serial No.
                        </button>
                        <button
                          onClick={() => router.push(`/variantBarcode?itemVariantId=${v.itemVariantId}`)}
                          className="bg-sky-50 border border-sky-100 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <Barcode size={14} /> Map Barcode
                        </button>
                        <button
                          onClick={() => handleDeleteVariant(v.itemVariantId)}
                          className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedVariantId === v.itemVariantId && (
                    <tr className="bg-slate-50">
                      <td colSpan={2} className="px-6 py-4">
                        {loadingSerialsFor === v.itemVariantId ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader2 size={14} className="animate-spin" /> Loading serial numbers...
                          </div>
                        ) : (serialsByVariant[v.itemVariantId] || []).length === 0 ? (
                          <p className="text-sm text-slate-400">No serial numbers found for this variant.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(serialsByVariant[v.itemVariantId] || []).map((s) => (
                              <span
                                key={s.guid}
                                title={`Status: ${s.status}${s.landingPrice ? ` · Landing: ₹${s.landingPrice}` : ""}`}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                                  s.status === "Available"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-slate-100 border-slate-200 text-slate-600"
                                }`}
                              >
                                {s.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-8 px-6 text-center">
                    {tableLoading ? (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <span className="text-sm font-medium">Loading variants...</span>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-slate-500">No variants found</div>
                    )}
                  </td>
                </tr>
              )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalRecords > 0 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * pageSize, totalRecords)}</span> of <span className="font-bold text-slate-700">{totalRecords}</span> entries
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 outline-none focus:border-indigo-400 transition-all cursor-pointer"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {[5, 10, 25, 50, 100].map(val => (
                        <option key={val} value={val}>{val} per page</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(totalRecords / pageSize)) }, (_, i) => {
                       const pageNum = i + 1;
                       return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                            currentPage === pageNum ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-white hover:text-indigo-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                       );
                    })}
                  </div>

                  <button 
                    disabled={currentPage >= Math.ceil(totalRecords / pageSize)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
  );
};

export default ItemVariant;


