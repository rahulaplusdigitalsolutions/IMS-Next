"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import Swal from 'sweetalert2';
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { printerService } from "@/lib/services/api";
import {
  Layers, Plus, Box, Trash2, CheckSquare, X, Search, Info,
  Package, Tag, Building2, TrendingUp, History, Hash, Sparkles,
  Edit, Palette, Settings2, Loader2, Check, AlertTriangle, RefreshCw,
  ClipboardList, CheckCircle2, XCircle, Clock
} from "lucide-react";
import MasterDropdown from "@/components/common/MasterDropdown";

// ✅ Toast Component
function Toast({ message, type, onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { bg: "bg-emerald-500", icon: Check },
    error: { bg: "bg-red-500", icon: AlertTriangle },
    info: { bg: "bg-blue-500", icon: Info }
  };

  const { bg, icon: Icon } = config[type] || config.info;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] ${bg} text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300`}>
      <Icon size={18} />
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-1 transition">
        <X size={14} />
      </button>
    </div>
  );
}

export default function Models({ models = [], serials = [], onRefresh, isAdmin, isUser, currentUser }) {
  const canManage = currentUser?.role === 'Admin' ||
                    currentUser?.role === 'SuperAdmin' ||
                    currentUser?.allow_edit_models;

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const initialFormState = {
    name: "",
    company: "HP",
    mainCategory: "Printer",
    category: "Laser",
    colorType: "Monochrome",
    printerType: "Multi-Function",
    description: "",
    mrp: "",
    cpu: "",
    ram: "",
    ssd: "",
    barcode: "",
    screenSize: "",
    resolution: "",
    panelType: "",
    refreshRate: ""
  };

  const MAIN_CATEGORIES = ["Printer", "PC", "Monitor"];
  const MAIN_CATEGORY_LABELS = { Printer: "Printer", PC: "PC/Laptop/Desktop", Monitor: "Monitor" };
  const isComputeCategory = (cat) => cat === "PC";

  const [newModel, setNewModel] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingModel, setViewingModel] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState(null);

  // Approval Requests tab (Admin only)
  const [activeModelsTab, setActiveModelsTab] = useState(tabParam === "approvals" ? "approvals" : "models");
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [rejectModalGuid, setRejectModalGuid] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null); // guid of request being acted on

  // Approve-with-details modal
  const [approveModal, setApproveModal] = useState(null); // approval request object
  const [approveForm, setApproveForm] = useState({});
  const [approvalSerials, setApprovalSerials] = useState([]);
  const [approveSerialsLoading, setApproveSerialsLoading] = useState(false);
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  useEffect(() => {
    if (tabParam === "approvals") {
      setActiveModelsTab("approvals");
    } else if (tabParam === "models") {
      setActiveModelsTab("models");
    }
  }, [tabParam]);

  const loadApprovalRequests = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const data = await printerService.getModelApprovals();
      setApprovalRequests(Array.isArray(data) ? data : []);
    } catch {
      showToast("Failed to load approval requests", "error");
    } finally {
      setLoadingApprovals(false);
    }
  }, []);

  useEffect(() => {
    loadApprovalRequests();
  }, [activeModelsTab, loadApprovalRequests]);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  const isDuplicateModel = useCallback((name, excludeId = null) => {
    if (!name || !name.trim()) return false;
    const trimmedName = name.trim().toLowerCase();
    return models.some(m => {
      const modelId = m.guid || m.id;
      return m.name.trim().toLowerCase() === trimmedName && modelId !== excludeId;
    });
  }, [models]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredModels = useMemo(() => {
    return models.filter(m => 
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.mainCategory?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [models, searchTerm]);

  const handleBulkDelete = async () => {
    if (!canManage) { 
      showToast("Access Denied", "error"); 
      return; 
    }
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} models? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
      cancelButtonText: "No, cancel"
    });

    if (result.isConfirmed) {
      try {
        const res = await printerService.bulkDeleteModels(selectedIds);
        const successCount = res?.results?.success?.length ?? selectedIds.length;
        const failedCount = res?.results?.failed?.length ?? 0;
        Swal.fire({
          title: failedCount > 0 ? "Partially Deleted" : "Deleted!",
          text: failedCount > 0
            ? `${successCount} models deleted. ${failedCount} failed (likely still have active serials).`
            : `${successCount} models have been deleted successfully.`,
          icon: failedCount > 0 ? "warning" : "success",
          confirmButtonColor: "#6366F1",
        });
        onRefresh();
        setSelectedIds([]);
        setIsSelectionMode(false);
      } catch {
        showToast("Failed to delete models", "error");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) { 
      showToast("Access Denied", "error"); 
      return; 
    }
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this model? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
      cancelButtonText: "No, cancel"
    });

    if (result.isConfirmed) {
      try { 
        await printerService.deleteModel(id); 
        Swal.fire({
          title: "Deleted!",
          text: "The model has been deleted successfully.",
          icon: "success",
          confirmButtonColor: "#6366F1",
        });
        onRefresh(); 
      } catch { 
        showToast("Failed to delete model", "error"); 
      }
    }
  };

  const handleEdit = (model, e) => {
    if (e) e.stopPropagation();
    if (!canManage) { 
      showToast("Access Denied", "error"); 
      return; 
    }
    
    setNewModel({
      name: model.name || "",
      company: model.company || "HP",
      mainCategory: model.mainCategory || (model.category === "Computing" ? "PC" : "Printer"),
      category: model.category || "Laser",
      colorType: model.colorType || "Monochrome",
      printerType: model.printerType || "Multi-Function",
      description: model.description || "",
      mrp: model.mrp || "",
      cpu: model.cpu || "",
      ram: model.ram || "",
      ssd: model.ssd || "",
      barcode: model.barcode || "",
      screenSize: model.screenSize || "",
      resolution: model.resolution || "",
      panelType: model.panelType || "",
      refreshRate: model.refreshRate || ""
    });
    
    setEditingId(model.guid || model.id);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setNewModel(initialFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newModel.name?.trim()) {
      showToast("Model name is required", "error");
      return;
    }
    if (!newModel.company?.trim()) {
      showToast("Company is required", "error");
      return;
    }

    if (isDuplicateModel(newModel.name, editingId)) {
      showToast(`Model "${newModel.name.trim()}" already exists!`, "error");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isCompute = isComputeCategory(newModel.mainCategory);
      const isMonitor = newModel.mainCategory === "Monitor";
      const modelData = {
        name: newModel.name.trim(),
        company: newModel.company,
        mainCategory: newModel.mainCategory,
        category: newModel.mainCategory === "Printer" ? newModel.category : newModel.mainCategory,
        colorType: newModel.mainCategory === "Printer" ? newModel.colorType : "N/A",
        printerType: newModel.mainCategory === "Printer" ? newModel.printerType : "N/A",
        description: newModel.description?.trim() || "",
        mrp: newModel.mrp ? Number(newModel.mrp) : 0,
        cpu: isCompute ? newModel.cpu : null,
        ram: isCompute ? newModel.ram : null,
        ssd: isCompute ? newModel.ssd : null,
        barcode: newModel.barcode?.trim() || null,
        screenSize: (isMonitor || isCompute) ? newModel.screenSize?.trim() || null : null,
        resolution: isMonitor ? newModel.resolution?.trim() || null : null,
        panelType: isMonitor ? newModel.panelType?.trim() || null : null,
        refreshRate: isMonitor ? newModel.refreshRate?.trim() || null : null
      };

      if (editingId) {
        await printerService.updateModel(editingId, modelData);
        showToast("Model updated successfully!", "success");
      } else {
        await printerService.addModel(modelData);
        showToast("Model added successfully!", "success");
      }
      
      if (onRefresh) onRefresh();
      handleCloseForm();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to save model";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getModelDetails = (model) => {
    if (!model) return { serials: [], stock: 0, priceHistory: [], latestPrice: 0, averagePrice: 0 };
    const modelSerials = serials.filter(s => s.modelGuid === model.guid);
    const history = modelSerials
        .filter(s => s.landingPrice > 0)
        .map(s => ({
            price: s.landingPrice,
            date: s.createdAt || new Date().toISOString() 
        }))
        .sort((a,b) => new Date(b.date) - new Date(a.date));
    const inStockItems = modelSerials.filter(s => s.status === "Available");
    const totalValue = inStockItems.reduce((sum, item) => sum + (Number(item.landingPrice) || 0), 0);
    const avgPrice = inStockItems.length > 0 ? Math.round(totalValue / inStockItems.length) : 0;
    return {
      serials: modelSerials,
      stock: inStockItems.length,
      dispatched: modelSerials.filter(s => s.status === "Dispatched").length,
      damaged: modelSerials.filter(s => s.status === "Damaged").length,
      priceHistory: history,
      latestPrice: history[0]?.price || 0,
      averagePrice: avgPrice
    };
  };

  const viewDetails = viewingModel ? getModelDetails(viewingModel) : null;

  const getCompanyColor = (company) => {
    const colors = {
      'HP': { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 text-blue-600 border-blue-100' },
      'Canon': { bg: 'from-red-500 to-red-600', light: 'bg-red-50 text-red-600 border-red-100' },
      'Epson': { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
      'Brother': { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    };
    return colors[company] || { bg: 'from-slate-500 to-slate-600', light: 'bg-slate-50 text-slate-600 border-slate-100' };
  };


  const nameIsDuplicate = useMemo(() => {
    return isDuplicateModel(newModel.name, editingId);
  }, [newModel.name, editingId, isDuplicateModel]);

  return (
    <div className="space-y-5 relative pb-20 min-h-screen">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Header: always visible ──────────────────────────────────── */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md shadow-indigo-500/25">
                <Box size={14} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {models.length} Models
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Product Models</h1>
            <p className="text-xs text-slate-500">Manage your product catalog</p>
          </div>

          <div className="flex gap-2 w-full md:w-auto flex-wrap">
            {activeModelsTab === "models" && (
              <div className="relative flex-1 md:w-56 min-w-[150px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                  placeholder="Search models..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
            {onRefresh && (
              <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-medium transition-all shadow-sm">
                <RefreshCw size={14} />
              </button>
            )}
            {activeModelsTab === "models" && (
              <>
                <button onClick={toggleSelectionMode} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isSelectionMode ? "bg-slate-800 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"}`}>
                  {isSelectionMode ? <X size={14} /> : <CheckSquare size={14} />}
                  <span className="hidden sm:inline">{isSelectionMode ? "Cancel" : "Select"}</span>
                </button>
                {canManage && <button onClick={() => showAddForm ? handleCloseForm() : setShowAddForm(true)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-sm ${showAddForm ? "bg-slate-100 text-slate-600" : "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/25"}`}>
                  {showAddForm ? <X size={14} /> : <Plus size={14} />}
                  <span className="hidden sm:inline">{showAddForm ? "Close" : "Add Model"}</span>
                </button>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar — below the header ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => {
              setActiveModelsTab("models");
              router.push(`${pathname}?tab=models`);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeModelsTab === "models"
                ? "bg-white text-indigo-600 shadow-sm shadow-indigo-100 ring-1 ring-slate-200/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <Box size={14} />
            <span>Models</span>
          </button>
          <button
            onClick={() => {
              setActiveModelsTab("approvals");
              router.push(`${pathname}?tab=approvals`);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeModelsTab === "approvals"
                ? "bg-white text-indigo-600 shadow-sm shadow-indigo-100 ring-1 ring-slate-200/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
            }`}
          >
            <ClipboardList size={14} />
            <span>Approval Requests</span>
            {approvalRequests.filter(r => r.status === "pending").length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeModelsTab === "approvals"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-amber-500 text-white"
              }`}>
                {approvalRequests.filter(r => r.status === "pending").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Approval Requests Panel ───────────────────────────────────────── */}
      {activeModelsTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-700">Model Approval Requests</h2>
            <button onClick={loadApprovalRequests} disabled={loadingApprovals}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition">
              <RefreshCw size={13} className={loadingApprovals ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {loadingApprovals ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
          ) : approvalRequests.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No approval requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvalRequests.map(req => {
                const companyColor = getCompanyColor(req.company);
                const statusConfig = {
                  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200/50", icon: Clock, label: "Pending Approval" },
                  approved: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200/50", icon: CheckCircle2, label: "Approved" },
                  rejected: { bg: "bg-rose-50 text-rose-700 border-rose-200/50", icon: XCircle, label: "Rejected" }
                };
                const normalizedStatus = (req.status || "").trim().toLowerCase();
                const status = statusConfig[normalizedStatus] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <div key={req.guid} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 space-y-4">
                    {/* Top Row: Brand, Category, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase ${companyColor.light}`}>
                          {req.company || "No Brand"}
                        </span>
                        <span className="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-indigo-50 border border-indigo-100/40 text-indigo-600">
                          {MAIN_CATEGORY_LABELS[req.mainCategory] || req.mainCategory}
                        </span>
                      </div>
                      
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${status.bg}`}>
                        <StatusIcon size={12} className={normalizedStatus === "pending" ? "animate-pulse" : ""} />
                        <span>{status.label}</span>
                      </div>
                    </div>

                    {/* Middle Section: Model Name and Specs */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{req.name}</h3>
                        {req.description && (
                          <p className="text-xs text-slate-400 italic">"{req.description}"</p>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Requested by <strong className="text-slate-600">{req.requestedBy}</strong> · {new Date(req.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row: Reject Reason or Approver Details or Approve/Reject Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
                      <div className="text-xs">
                        {normalizedStatus === "rejected" && req.rejectionReason && (
                          <div className="flex items-center gap-1.5 text-rose-650 bg-rose-50/50 border border-rose-100 px-3 py-1.5 rounded-xl">
                            <AlertTriangle size={13} className="text-rose-550" />
                            <span>Rejection Reason: <strong>{req.rejectionReason}</strong></span>
                          </div>
                        )}
                        {normalizedStatus === "approved" && (
                          <span className="text-slate-400 text-[11px]">
                            Approved by <strong className="text-slate-600">{req.approvedBy || "Admin"}</strong>
                            {req.approvedAt ? ` on ${new Date(req.approvedAt).toLocaleDateString("en-IN")}` : ""}
                          </span>
                        )}
                      </div>

                      {normalizedStatus === "pending" && canManage && (
                        <div className="flex gap-2 ml-auto">
                          <button
                            disabled={actionLoading === req.guid}
                            onClick={async () => {
                              // Open the Approve-with-details modal
                              const form = {
                                name: req.name || "",
                                company: req.company || "HP",
                                mainCategory: req.mainCategory || "Printer",
                                category: req.category || "Laser",
                                colorType: req.colorType || "Monochrome",
                                printerType: req.printerType || "Multi-Function",
                                description: req.description || "",
                                mrp: req.mrp || "",
                                cpu: req.cpu || "",
                                ram: req.ram || "",
                                ssd: req.ssdHdd || "",
                                barcode: "",
                                screenSize: req.screenSize || "",
                                resolution: req.resolution || "",
                                panelType: req.panelType || "",
                                refreshRate: req.refreshRate || ""
                              };
                              setApproveForm(form);
                              setApproveModal(req);
                              setApprovalSerials([]);
                              setApproveSerialsLoading(true);
                              try {
                                const sData = await printerService.getApprovalSerials(req.guid);
                                setApprovalSerials(Array.isArray(sData) ? sData : []);
                              } catch { setApprovalSerials([]); }
                              finally { setApproveSerialsLoading(false); }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-emerald-500/10"
                          >
                            {actionLoading === req.guid ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve & Fill Details
                          </button>
                          <button
                            disabled={actionLoading === req.guid}
                            onClick={() => { setRejectModalGuid(req.guid); setRejectReason(""); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] border border-rose-200/50"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Approve with Details Modal ─────────────────────────────── */}
          {approveModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-bold text-white">Approve Model Request — Fill Details</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">Review and complete model information before approving</p>
                  </div>
                  <button onClick={() => { setApproveModal(null); setApprovalSerials([]); }}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition text-white">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Category Radio */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category *</label>
                    <div className="flex gap-4 flex-wrap">
                      {MAIN_CATEGORIES.map(cat => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" className="w-4 h-4 text-emerald-600"
                            checked={approveForm.mainCategory === cat}
                            onChange={() => setApproveForm(f => ({ ...f, mainCategory: cat }))} />
                          <span className={`text-sm font-bold ${approveForm.mainCategory === cat ? 'text-emerald-600' : 'text-slate-500'}`}>{MAIN_CATEGORY_LABELS[cat] || cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Name + Company + MRP */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Name *</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                        value={approveForm.name} onChange={e => setApproveForm(f => ({ ...f, name: e.target.value }))} placeholder="Model name" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company *</label>
                      <MasterDropdown code="COMPANY" placeholder="Select Company"
                        value={approveForm.company}
                        onChange={e => setApproveForm(f => ({ ...f, company: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRP (₹)</label>
                      <input type="number" className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                        value={approveForm.mrp} onChange={e => setApproveForm(f => ({ ...f, mrp: e.target.value }))} placeholder="0" min="0" />
                    </div>
                  </div>

                  {/* Printer-specific or PC-specific */}
                  {approveForm.mainCategory === "Printer" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Printer Category</label>
                        <MasterDropdown code="PRINTER_CAT" placeholder="Select Category"
                          value={approveForm.category}
                          onChange={e => setApproveForm(f => ({ ...f, category: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Color Type</label>
                        <MasterDropdown code="COLOR_TYPE" placeholder="Select Color"
                          value={approveForm.colorType}
                          onChange={e => setApproveForm(f => ({ ...f, colorType: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Printer Type</label>
                        <MasterDropdown code="PRINTER_TYPE" placeholder="Select Type"
                          value={approveForm.printerType}
                          onChange={e => setApproveForm(f => ({ ...f, printerType: e.target.value }))} />
                      </div>
                    </div>
                  ) : approveForm.mainCategory === "Monitor" ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen Size</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.screenSize} onChange={e => setApproveForm(f => ({ ...f, screenSize: e.target.value }))} placeholder="e.g. 24 inch" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.resolution} onChange={e => setApproveForm(f => ({ ...f, resolution: e.target.value }))} placeholder="e.g. 1920x1080 (FHD)" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panel Type</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.panelType} onChange={e => setApproveForm(f => ({ ...f, panelType: e.target.value }))} placeholder="e.g. IPS" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refresh Rate</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.refreshRate} onChange={e => setApproveForm(f => ({ ...f, refreshRate: e.target.value }))} placeholder="e.g. 75Hz" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPU</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.cpu} onChange={e => setApproveForm(f => ({ ...f, cpu: e.target.value }))} placeholder="e.g. Core i5 12th Gen" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RAM</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.ram} onChange={e => setApproveForm(f => ({ ...f, ram: e.target.value }))} placeholder="e.g. 8GB DDR4" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SSD/HDD</label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.ssd} onChange={e => setApproveForm(f => ({ ...f, ssd: e.target.value }))} placeholder="e.g. 512GB NVMe" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen Size <span className="normal-case font-normal text-slate-300">(optional)</span></label>
                        <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
                          value={approveForm.screenSize} onChange={e => setApproveForm(f => ({ ...f, screenSize: e.target.value }))} placeholder="e.g. 15.6 inch" />
                      </div>
                    </div>
                  )}

                  {/* Description + Barcode */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                      <textarea rows={2} className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none resize-none"
                        value={approveForm.description} onChange={e => setApproveForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">StockIn Barcode</label>
                      <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-none font-mono"
                        value={approveForm.barcode} onChange={e => setApproveForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Scan or type barcode..." />
                      <p className="text-[10px] text-slate-400">StockIn m scan par automatically resolve hoga</p>
                    </div>
                  </div>

                  {/* Available Serials Section */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={14} className="text-indigo-500" />
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Available Serials (Linked from StockIn)</span>
                      {approveSerialsLoading && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                    </div>
                    {approveSerialsLoading ? (
                      <div className="py-4 text-center text-slate-400 text-xs">Loading serials...</div>
                    ) : approvalSerials.length === 0 ? (
                      <div className="py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 text-center">
                        No Available serials linked to this model variant yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {approvalSerials.map(s => (
                          <div key={s.guid} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                            <div className="flex items-center gap-3">
                              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                              <span className="font-mono text-xs font-bold text-slate-800">{s.value}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              {s.godownName && <span className="bg-white border border-slate-100 rounded-lg px-2 py-0.5">{s.godownName}</span>}
                              {s.landingPrice > 0 && <span className="text-slate-600 font-semibold">₹{Number(s.landingPrice).toLocaleString()}</span>}
                              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Available</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 rounded-b-2xl">
                  <p className="text-[11px] text-slate-400">
                    {approvalSerials.length > 0 && `${approvalSerials.length} serial(s) will be linked to this model on approval.`}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { setApproveModal(null); setApprovalSerials([]); }}
                      className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                      Cancel
                    </button>
                    <button
                      disabled={approveSubmitting || !approveForm.name?.trim()}
                      onClick={async () => {
                        setApproveSubmitting(true);
                        const g = approveModal.guid;
                        try {
                          const isCompute = isComputeCategory(approveForm.mainCategory);
                          const isMonitor = approveForm.mainCategory === "Monitor";
                          const payload = {
                            name: approveForm.name.trim(),
                            company: approveForm.company,
                            mainCategory: approveForm.mainCategory,
                            category: approveForm.mainCategory === "Printer" ? approveForm.category : approveForm.mainCategory,
                            colorType: approveForm.mainCategory === "Printer" ? approveForm.colorType : "N/A",
                            printerType: approveForm.mainCategory === "Printer" ? approveForm.printerType : "N/A",
                            description: approveForm.description?.trim() || "",
                            mrp: approveForm.mrp ? Number(approveForm.mrp) : 0,
                            cpu: isCompute ? approveForm.cpu : null,
                            ram: isCompute ? approveForm.ram : null,
                            ssd: isCompute ? approveForm.ssd : null,
                            barcode: approveForm.barcode?.trim() || null,
                            screenSize: (isMonitor || isCompute) ? approveForm.screenSize?.trim() || null : null,
                            resolution: isMonitor ? approveForm.resolution?.trim() || null : null,
                            panelType: isMonitor ? approveForm.panelType?.trim() || null : null,
                            refreshRate: isMonitor ? approveForm.refreshRate?.trim() || null : null
                          };
                          await printerService.approveModelRequest(g, payload);
                          showToast(`Model "${approveForm.name}" approved & created!`, "success");
                          setApproveModal(null);
                          setApprovalSerials([]);
                          onRefresh();
                          loadApprovalRequests();
                        } catch (e) {
                          showToast(e?.response?.data?.message || "Failed to approve", "error");
                        } finally {
                          setApproveSubmitting(false);
                          setActionLoading(null);
                        }
                      }}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm shadow-emerald-500/20">
                      {approveSubmitting ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Confirm Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reject reason modal */}
          {rejectModalGuid && (
            <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="font-bold text-slate-800 mb-3">Rejection Reason</h3>
                <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-4"
                  placeholder="Why is this request being rejected? (optional)" />
                <div className="flex gap-3">
                  <button onClick={() => setRejectModalGuid(null)}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
                  <button
                    onClick={async () => {
                      const g = rejectModalGuid;
                      setRejectModalGuid(null);
                      setActionLoading(g);
                      try {
                        await printerService.rejectModelRequest(g, rejectReason);
                        const name = approvalRequests.find(r => r.guid === g)?.name;
                        showToast(`Request for "${name}" rejected`, "info");
                        loadApprovalRequests();
                      } catch (e) {
                        showToast(e?.response?.data?.message || "Failed to reject", "error");
                      } finally { setActionLoading(null); }
                    }}
                    className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition">
                    Confirm Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeModelsTab === "models" && (<>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-in slide-in-from-top duration-300">
          <div className={`bg-gradient-to-r ${editingId ? 'from-amber-500 to-orange-600' : 'from-indigo-500 to-purple-600'} px-5 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                {editingId ? <Edit size={16} className="text-white" /> : <Plus size={16} className="text-white" />}
              </div>
              <h3 className="text-sm font-bold text-white">{editingId ? `Edit Model: ${newModel.name}` : 'Add New Model'}</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12 space-y-1.5 pb-2 border-b border-slate-50 mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers size={10} /> Category *
                </label>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {MAIN_CATEGORIES.map((cat) => (
                    <label key={cat} className={`flex items-center gap-2 ${editingId ? 'cursor-not-allowed opacity-60' : 'cursor-pointer group'}`}>
                      <input type="radio" name="mainCategory" className={`w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 ${editingId ? 'cursor-not-allowed' : 'cursor-pointer'}`} checked={newModel.mainCategory === cat} onChange={() => setNewModel({ ...newModel, mainCategory: cat })} disabled={isSubmitting || (editingId !== null)} />
                      <span className={`text-sm font-bold ${newModel.mainCategory === cat ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-700'}`}>{MAIN_CATEGORY_LABELS[cat] || cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={10} /> Model Name *
                </label>
                <input className={`w-full border p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 outline-none transition-all ${nameIsDuplicate ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'}`} placeholder="e.g. LaserJet Pro M1136" value={newModel.name} onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} required disabled={isSubmitting} />
              </div>
              
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Building2 size={10} /> Company *
                </label>
                <MasterDropdown 
                  code="COMPANY" 
                  placeholder="Select Company" 
                  value={newModel.company} 
                  onChange={(e) => setNewModel({ ...newModel, company: e.target.value })} 
                  disabled={isSubmitting} 
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><span>₹</span> MRP</label>
                <input type="number" className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="15000" value={newModel.mrp} onChange={(e) => setNewModel({ ...newModel, mrp: e.target.value })} disabled={isSubmitting} min="0" />
              </div>

              {newModel.mainCategory === "Printer" ? (
                <>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Layers size={10} /> Printer Category</label>
                    <MasterDropdown 
                      code="PRINTER_CAT" 
                      placeholder="Select Category" 
                      value={newModel.category} 
                      onChange={(e) => setNewModel({ ...newModel, category: e.target.value })} 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Palette size={10} /> Color Type</label>
                    <MasterDropdown 
                      code="COLOR_TYPE" 
                      placeholder="Select Color Type" 
                      value={newModel.colorType} 
                      onChange={(e) => setNewModel({ ...newModel, colorType: e.target.value })} 
                      disabled={isSubmitting} 
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Settings2 size={10} /> Printer Type</label>
                    <MasterDropdown 
                      code="PRINTER_TYPE" 
                      placeholder="Select Printer Type" 
                      value={newModel.printerType} 
                      onChange={(e) => setNewModel({ ...newModel, printerType: e.target.value })} 
                      disabled={isSubmitting} 
                    />
                  </div>
                </>
              ) : newModel.mainCategory === "Monitor" ? (
                <>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen Size</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 24 inch" value={newModel.screenSize} onChange={(e) => setNewModel({ ...newModel, screenSize: e.target.value })} disabled={isSubmitting} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 1920x1080 (FHD)" value={newModel.resolution} onChange={(e) => setNewModel({ ...newModel, resolution: e.target.value })} disabled={isSubmitting} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panel Type</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. IPS" value={newModel.panelType} onChange={(e) => setNewModel({ ...newModel, panelType: e.target.value })} disabled={isSubmitting} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refresh Rate</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 75Hz" value={newModel.refreshRate} onChange={(e) => setNewModel({ ...newModel, refreshRate: e.target.value })} disabled={isSubmitting} />
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPU *</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Core i5 12th Gen" value={newModel.cpu} onChange={(e) => setNewModel({ ...newModel, cpu: e.target.value })} required={isComputeCategory(newModel.mainCategory)} disabled={isSubmitting} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RAM *</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 8GB DDR4" value={newModel.ram} onChange={(e) => setNewModel({ ...newModel, ram: e.target.value })} required={isComputeCategory(newModel.mainCategory)} disabled={isSubmitting} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SSD/HDD *</label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 512GB NVMe" value={newModel.ssd} onChange={(e) => setNewModel({ ...newModel, ssd: e.target.value })} required={isComputeCategory(newModel.mainCategory)} disabled={isSubmitting} />
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screen Size <span className="normal-case font-normal text-slate-300">(optional, laptop only)</span></label>
                    <input className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 15.6 inch" value={newModel.screenSize} onChange={(e) => setNewModel({ ...newModel, screenSize: e.target.value })} disabled={isSubmitting} />
                  </div>
                </>
              )}
              <div className="md:col-span-8 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Info size={10} /> Description</label>
                <textarea className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[48px]" placeholder="Optional details..." value={newModel.description} onChange={(e) => setNewModel({ ...newModel, description: e.target.value })} disabled={isSubmitting}></textarea>
              </div>
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Search size={10} /> StockIn Barcode
                </label>
                <input
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono transition-all"
                  placeholder="Scan or type barcode…"
                  value={newModel.barcode}
                  onChange={(e) => setNewModel({ ...newModel, barcode: e.target.value })}
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-slate-400 leading-tight">StockIn m scan karne par yeh model automatically resolve hoga</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-400">{editingId ? `Editing model ID: ${editingId}` : "Fill in the required fields"}</div>
              <div className="flex gap-2">
                <button type="button" onClick={handleCloseForm} disabled={isSubmitting} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={isSubmitting || nameIsDuplicate} className={`text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg ${editingId ? "bg-amber-500" : "bg-indigo-600"}`}>
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (editingId ? <Edit size={14} /> : <Sparkles size={14} />)}
                  {editingId ? "Update Model" : "Add Model"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {filteredModels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package size={48} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No Models Found</h3>
          <p className="text-sm text-slate-500">Start by adding your first product model</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModels.map((m, index) => {
            const modelId = m.guid || m.id || index;
            const isSelected = selectedIds.includes(modelId);
            const details = getModelDetails(m);
            const companyColor = getCompanyColor(m.company);
            return (
              <div key={modelId} onClick={() => isSelectionMode ? handleSelectOne(modelId) : setViewingModel(m)} className={`group bg-white rounded-xl border transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                <div className={`h-1 bg-gradient-to-r ${companyColor.bg}`}></div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{m.name}</h3>
                    {canManage && !isSelectionMode && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={(e) => handleEdit(m, e)} className="p-1 text-amber-500 hover:bg-amber-50 rounded"><Edit size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(modelId); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="px-1.5 py-0.5 text-[8px] bg-slate-100 text-slate-600 rounded font-bold uppercase">{MAIN_CATEGORY_LABELS[m.mainCategory] || m.mainCategory}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] rounded font-bold uppercase ${companyColor.light}`}>{m.company}</span>
                    {m.mainCategory === 'Printer' ? (
                      <span className="px-1.5 py-0.5 text-[8px] bg-blue-50 text-blue-600 rounded font-bold uppercase">{m.category}</span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[8px] bg-indigo-50 text-indigo-600 rounded font-bold uppercase">{m.cpu || 'PC'}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-4 pt-3 border-t">
                    <span>Stock: <span className="font-bold text-slate-700">{details.stock}</span></span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${details.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100'}`}>
                      {details.stock > 0 ? 'In Stock' : 'Out'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewingModel && viewDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewingModel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className={`bg-gradient-to-r ${getCompanyColor(viewingModel.company).bg} p-4 text-white`}>
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg">{viewingModel.name}</h3>
                <button onClick={() => setViewingModel(null)}><X size={18} /></button>
              </div>
              <p className="text-white/80 text-xs mt-1">{viewingModel.company} • {MAIN_CATEGORY_LABELS[viewingModel.mainCategory] || viewingModel.mainCategory}</p>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Specs</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {viewingModel.mainCategory === 'Printer'
                      ? `${viewingModel.category} | ${viewingModel.colorType}`
                      : viewingModel.mainCategory === 'Monitor'
                        ? `${viewingModel.screenSize || '—'} | ${viewingModel.resolution || '—'} | ${viewingModel.panelType || '—'}`
                        : `${viewingModel.cpu} | ${viewingModel.ram} | ${viewingModel.ssd}${viewingModel.screenSize ? ` | ${viewingModel.screenSize}` : ''}`}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">MRP</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">₹{Number(viewingModel.mrp || 0).toLocaleString()}</p>
                </div>
              </div>
              {viewingModel.description && <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600">{viewingModel.description}</div>}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Available Stock</p>
                  <p className="text-xl font-bold text-emerald-700 mt-0.5">{viewDetails.stock}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Serials</p>
                  <p className="text-xl font-bold text-slate-700 mt-0.5">{viewDetails.serials.length}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                  <p className="text-[10px] text-indigo-500 font-bold uppercase">Latest Landing Price</p>
                  <p className="text-lg font-bold text-indigo-700 mt-0.5">₹{Number(viewDetails.latestPrice).toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                  <p className="text-[10px] text-amber-500 font-bold uppercase">Avg Price of Stock</p>
                  <p className="text-lg font-bold text-amber-700 mt-0.5">
                    {viewDetails.averagePrice > 0 ? `₹${Number(viewDetails.averagePrice).toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              {canManage && <button onClick={() => { handleEdit(viewingModel); setViewingModel(null); }} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-amber-600">Edit</button>}
              <button onClick={() => setViewingModel(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 z-50">
          <span className="text-xs font-bold">{selectedIds.length} Selected</span>
          <button onClick={handleBulkDelete} disabled={!canManage} className="text-xs text-red-400 font-bold">Delete</button>
          <button onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }} className="text-slate-400"><X size={16} /></button>
        </div>
      )}
      </>
      )}
    </div>
  );
}


