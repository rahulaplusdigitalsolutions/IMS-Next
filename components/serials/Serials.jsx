"use client";
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Swal from 'sweetalert2';
import MasterDropdown from "@/components/common/MasterDropdown";
import { printerService } from "@/lib/services/api";
import SerialsModals from "./SerialsModals";
import {
  QrCode, Trash2, Search, X, CheckSquare, Filter, Save,
  Package, Hash, ScanLine, AlertCircle, CheckCircle2,
  Box, TrendingUp, ChevronLeft, ChevronRight, Plus, Eye, Pencil,
  AlertTriangle, MessageSquare, Info, Upload, Download, File, XCircle,
  ChevronDown, Warehouse
} from "lucide-react";

export default function Serials({
  models = [],
  serials = [],
  onRefresh,
  isAdmin,
  isUser,
  currentUser
}) {
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [newSerial, setNewSerial] = useState({
    modelId: "",
    value: "",
    landingPrice: "",
    mrp: "",
    warehouseGuid: ""
  });

  const [filter, setFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRequestModelModal, setShowRequestModelModal] = useState(false);
  const [requestModelForm, setRequestModelForm] = useState({
    name: "",
    company: "",
    mainCategory: "Printer",
    mrp: "",
    category: "Laser",
    colorType: "Monochrome",
    printerType: "Multi-Function",
    cpu: "",
    ram: "",
    ssd: "",
    description: "",
    screenSize: "",
    resolution: "",
    panelType: "",
    refreshRate: ""
  });

  const [editPopup, setEditPopup] = useState(null);
  const [editData, setEditData] = useState({
    value: "",
    landingPrice: "",
    modelId: "",
    landingPriceReason: "",
    warehouseGuid: ""
  });
  const [editLoading, setEditLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [sessionCount, setSessionCount] = useState(0);

  // ✅ States for the new searchable model dropdown
  const [modelSearch, setModelSearch] = useState("");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef(null);

  // ✅ States for the filter model dropdown
  const [filterModelSearch, setFilterModelSearch] = useState("");
  const [isFilterModelDropdownOpen, setIsFilterModelDropdownOpen] = useState(false);
  const filterModelDropdownRef = useRef(null);


  // ✅ Reason popup state for register form
  const [reasonPopup, setReasonPopup] = useState({
    show: false,
    reason: "",
    pendingSerial: null
  });

  // ✅ View reason popup state
  const [viewReasonPopup, setViewReasonPopup] = useState(null);

  // ✅ Excel Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  // 🔥 UPDATE: Added Model Filter state for Upload
  const [uploadModelId, setUploadModelId] = useState(""); 
  const [godowns, setGodowns] = useState([]);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const canManage = currentUser?.role === 'Admin' ||
                    !!currentUser?.allow_edit_serials;

  useEffect(() => {
    let mounted = true;
    printerService.getGodowns()
      .then((data) => {
        if (mounted) setGodowns(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setGodowns([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Instant duplicate check (made robust with trim, case sensitivity, and fallback property)
  const isDuplicateSerial = useCallback((value, excludeId = null) => {
    if (!value || !value.trim()) return false;
    const trimmed = value.trim().toLowerCase();
    return serials.some(s =>
      (s.value || s.serialNumber || "").trim().toLowerCase() === trimmed && s.id !== excludeId
    );
  }, [serials]);

  // ✅ Get MRP for a model
  const getModelMRP = useCallback((modelId) => {
    const model = models.find(m => String(m.id) === String(modelId));
    return Number(model?.mrp) || 0;
  }, [models]);

  // ✅ Check if landing price exceeds MRP
  const isLandingPriceExceedsMRP = useCallback((modelId, landingPrice) => {
    let mrp = 0;
    if (modelId === "REQUESTED") {
      mrp = Number(newSerial.requestedModel?.mrp) || 0;
    } else {
      mrp = getModelMRP(modelId);
    }
    const lp = Number(landingPrice) || 0;
    return mrp > 0 && lp > mrp;
  }, [getModelMRP, newSerial.requestedModel]);

  const handleModelChange = (modelId) => {
    const mId = modelId;
    const selectedModel = models.find(m => String(m.id) === String(mId));

    const latestSerial = serials
      .filter(s => String(s.modelId) === String(mId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    setNewSerial(prev => ({
      ...prev,
      modelId: mId,
      mrp: selectedModel ? selectedModel.mrp : "",
      landingPrice: latestSerial ? latestSerial.landingPrice : ""
    }));

    if (inputRef.current) inputRef.current.focus();
  };

  // ✅ Save with reason support
  const saveSerialToApi = useCallback(async (serialValue, modelId, landingPrice, landingPriceReason = null, warehouseGuid = "") => {
    if (!modelId) {
      setStatusMsg({ type: "error", text: "Please select a Model!" });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      return;
    }
    if (!serialValue || serialValue.trim() === "") {
      setStatusMsg({ type: "error", text: "Please enter Serial Number!" });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      return;
    }

    const trimmedValue = serialValue.trim();

    // Instant duplicate check
    if (isDuplicateSerial(trimmedValue)) {
      setStatusMsg({ type: "error", text: `Serial "${trimmedValue}" already exists!` });
      setNewSerial(prev => ({ ...prev, value: "" }));
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    // Check if landing price > MRP and reason not provided
    let mrp = 0;
    if (modelId === "REQUESTED") {
      mrp = Number(newSerial.requestedModel?.mrp) || 0;
    } else {
      mrp = getModelMRP(modelId);
    }
    const lp = Number(landingPrice) || 0;

    if (mrp > 0 && lp > mrp && !landingPriceReason) {
      setReasonPopup({
        show: true,
        reason: "",
        pendingSerial: {
          value: trimmedValue,
          modelId,
          landingPrice,
          mrp,
          warehouseGuid
        }
      });
      return;
    }

    setIsSaving(true);

    try {
      if (modelId === "REQUESTED") {
        const approvalRes = await printerService.submitModelApproval({
          name: newSerial.requestedModel.name,
          company: newSerial.requestedModel.company,
          mainCategory: newSerial.requestedModel.mainCategory,
          mrp: Number(newSerial.requestedModel.mrp) || 0,
          category: newSerial.requestedModel.category,
          colorType: newSerial.requestedModel.colorType,
          printerType: newSerial.requestedModel.printerType,
          cpu: newSerial.requestedModel.cpu,
          ram: newSerial.requestedModel.ram,
          ssd: newSerial.requestedModel.ssd,
          description: newSerial.requestedModel.description,
          serialNumber: trimmedValue,
          landingPrice: Number(landingPrice) || 0,
          landingPriceReason: landingPriceReason || null,
          godownGuid: warehouseGuid || null
        });

        if (approvalRes?.directlyAdded) {
          setStatusMsg({ type: "success", text: `Serial "${trimmedValue}" added directly to stock (model already exists).` });
          await onRefresh();
          setSessionCount(prev => prev + 1);
        } else {
          setStatusMsg({ type: "success", text: `Submitted new model request with Serial: ${trimmedValue}` });
        }
        setNewSerial({ modelId: "", value: "", landingPrice: "", mrp: "", warehouseGuid: "", requestedModel: null });
        setModelSearch("");
      } else {
        await printerService.addSerial({
          modelId,
          value: trimmedValue,
          landingPrice: Number(landingPrice) || 0,
          landingPriceReason: landingPriceReason || null,
          warehouseGuid: warehouseGuid || null
        });

        await onRefresh();
        setSessionCount(prev => prev + 1);
        setStatusMsg({ type: "success", text: `Saved: ${trimmedValue}` });
        setNewSerial(prev => ({ ...prev, value: "" }));
      }
      
      // ✅ FIX: Page reset to 1 automatically after saving so new data is visible at top
      clearFilters();
      setCurrentPage(1);

    } catch (error) {
      const errorData = error.response?.data;
      const msg = errorData?.message || error.message || "Error adding serial";

      // If server says reason required
      if (errorData?.requiresReason) {
        setReasonPopup({
          show: true,
          reason: "",
          pendingSerial: {
            value: trimmedValue,
            modelId,
            landingPrice,
            mrp: errorData.mrp,
            warehouseGuid
          }
        });
        setIsSaving(false);
        return;
      }

      if (msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("duplicate")) {
        setStatusMsg({ type: "error", text: `Serial "${trimmedValue}" already exists!` });
      } else {
        setStatusMsg({ type: "error", text: msg });
      }
      setNewSerial(prev => ({ ...prev, value: "" }));
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      
      // Defer the focus call to run after the current execution stack clears.
      // This ensures the input is no longer disabled from 'isSaving' state before we try to focus it.
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [isDuplicateSerial, onRefresh, getModelMRP, newSerial.requestedModel]);

  // ✅ Handle reason popup submit
  const handleReasonSubmit = async () => {
    const reason = reasonPopup.reason.trim();
    if (!reason) return;

    const { value, modelId, landingPrice, warehouseGuid } = reasonPopup.pendingSerial;

    setReasonPopup({ show: false, reason: "", pendingSerial: null });
    await saveSerialToApi(value, modelId, landingPrice, reason, warehouseGuid);
  };

  // ✅ Handle reason popup cancel
  const handleReasonCancel = () => {
    setReasonPopup({ show: false, reason: "", pendingSerial: null });
    setNewSerial(prev => ({ ...prev, value: "" }));
    setStatusMsg({ type: "", text: "" });
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSaving || reasonPopup.show) return;
    saveSerialToApi(newSerial.value, newSerial.modelId, newSerial.landingPrice, null, newSerial.warehouseGuid);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewSerial(prev => ({ ...prev, value: val }));

    if (val.trim().length === 10 && !isSaving && !reasonPopup.show) {
      if (isDuplicateSerial(val.trim())) {
        setStatusMsg({ type: "error", text: `Serial "${val.trim()}" already exists!` });
        setNewSerial(prev => ({ ...prev, value: "" }));
        setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
        if (inputRef.current) inputRef.current.focus();
        return;
      }
      saveSerialToApi(val, newSerial.modelId, newSerial.landingPrice, null, newSerial.warehouseGuid);
    }
  };

  const handleDelete = async (ids) => {
    if (!canManage) { alert("🚫 Access Denied: Edit Permission Required."); return; }
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${ids.length} serial(s)? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete!",
      cancelButtonText: "No, cancel"
    });

    if (result.isConfirmed) {

      try {
        await printerService.bulkDeleteSerials(ids);
        onRefresh();
        Swal.fire({
          title: "Deleted!",
          text: `${ids.length} serial(s) have been deleted successfully.`,
          icon: "success",
          confirmButtonColor: "#6366F1",
        });

        setSelectedIds([]);
        setIsSelectionMode(false);
        setEditPopup(null);
      } catch { alert("Failed to delete"); }
    }
  };

  const handleToggleForm = () => {
    if (showForm) {
      setSessionCount(0);
      // Reset model search when closing form
      setModelSearch("");
      setNewSerial({ modelId: "", value: "", landingPrice: "", mrp: "", warehouseGuid: "" });
    }
    setShowForm(!showForm);
  };

  const refreshGodowns = useCallback(async () => {
    const data = await printerService.getGodowns();
    setGodowns(Array.isArray(data) ? data : []);
    return Array.isArray(data) ? data : [];
  }, []);

  const handleAddGodown = async () => {
    const result = await Swal.fire({
      title: "Add Godown",
      html: `
        <input id="godown-name" class="swal2-input" placeholder="Godown name">
        <textarea id="godown-address" class="swal2-textarea" placeholder="Address optional"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Add",
      preConfirm: () => {
        const godownName = document.getElementById("godown-name")?.value?.trim();
        const godownAddress = document.getElementById("godown-address")?.value?.trim();
        if (!godownName) {
          Swal.showValidationMessage("Godown name is required");
          return false;
        }
        return { godownName, godownAddress };
      }
    });

    if (!result.isConfirmed) return null;

    try {
      const saved = await printerService.addGodown(result.value);
      await refreshGodowns();
      return saved.guid || null;
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message || "Failed to add godown", "error");
      return null;
    }
  };

  const clearFilters = () => {
    setFilter("");
    setModelFilter("");
    setFilterModelSearch("");
  };

  const openEditPopup = (serial) => {
    setEditPopup(serial);
    setEditData({
      value: serial.value || serial.serialNumber || "", 
      landingPrice: serial.landingPrice || "",
      modelId: serial.modelId,
      landingPriceReason: serial.landingPriceReason || "",
      warehouseGuid: serial.warehouseGuid || ""
    });
  };

  // ✅ Excel Upload Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setStatusMsg({ type: 'error', text: 'Please select an Excel file (.xlsx or .xls)' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'File size exceeds 10MB limit' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      return;
    }

    setUploadFile(file);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setStatusMsg({ type: 'error', text: 'Please select a file first' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
      return;
    }

    setUploading(true);

    try {
      // 🔥 UPDATE: Passing uploadModelId to backend
      const result = await printerService.uploadSerialsExcel(uploadFile, uploadModelId);
      setUploadResult(result.results);
      setShowUploadModal(false);
      setShowResultModal(true);
      setUploadFile(null);
      setUploadModelId(""); // Reset the filter after upload

      const successCount = result.results.success.length;
      const failedCount = result.results.failed?.length || 0;

      if (successCount > 0 || failedCount > 0) {
        setStatusMsg(
          failedCount > 0
            ? { type: successCount > 0 ? 'warning' : 'error', text: `${successCount} uploaded, ${failedCount} failed. See details below.` }
            : { type: 'success', text: `${successCount} serials uploaded successfully!` }
        );
        setTimeout(() => setStatusMsg({ type: "", text: "" }), 4000);
      }

      if (successCount > 0) {
        clearFilters();
        setCurrentPage(1);
        await onRefresh();
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: error.message || 'Upload failed' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await printerService.downloadSerialTemplate();
      setStatusMsg({ type: 'success', text: 'Template downloaded!' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to download template' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    }
  };

  const handleExportSerials = async () => {
    try {
      await printerService.exportSerialsExcel();
      setStatusMsg({ type: 'success', text: 'Serials exported!' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to export serials' });
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    }
  };

  // Live duplicate for register input
  const registerIsDuplicate = useMemo(() => {
    return isDuplicateSerial(newSerial.value);
  }, [newSerial.value, isDuplicateSerial]);

  // Live duplicate for edit popup
  const editIsDuplicate = useMemo(() => {
    if (!editPopup) return false;
    return isDuplicateSerial(editData.value, editPopup.id);
  }, [editData.value, editPopup, isDuplicateSerial]);

  // Check if edit landing price exceeds MRP
  const editExceedsMRP = useMemo(() => {
    if (!editPopup) return false;
    return isLandingPriceExceedsMRP(editData.modelId, editData.landingPrice);
  }, [editData.modelId, editData.landingPrice, editPopup, isLandingPriceExceedsMRP]);

  // Check if register landing price exceeds MRP
  const registerExceedsMRP = useMemo(() => {
    if (!newSerial.modelId || !newSerial.landingPrice) return false;
    return isLandingPriceExceedsMRP(newSerial.modelId, newSerial.landingPrice);
  }, [newSerial.modelId, newSerial.landingPrice, isLandingPriceExceedsMRP]);

  // Edit save with reason validation
  const handleEditSave = async () => {
    if (!editData.value.trim()) return;

    if (editIsDuplicate) {
      alert(`Serial "${editData.value.trim()}" already exists!`);
      return;
    }

    if (editExceedsMRP && !editData.landingPriceReason.trim()) {
      alert(`Landing Price (₹${Number(editData.landingPrice).toLocaleString('en-IN')}) exceeds MRP (₹${getModelMRP(editData.modelId).toLocaleString('en-IN')}). Please provide a reason.`);
      return;
    }

    setEditLoading(true);
    try {
      await printerService.updateSerial(editPopup.id, {
        value: editData.value.trim(),
        landingPrice: Number(editData.landingPrice) || 0,
        modelId: editData.modelId,
        landingPriceReason: editExceedsMRP ? editData.landingPriceReason.trim() : null,
        warehouseGuid: editData.warehouseGuid || null
      });
      await onRefresh();
      setEditPopup(null);
    } catch (error) {
      const errorData = error.response?.data;
      const msg = errorData?.message || error.message || "Failed to update";

      if (errorData?.requiresReason) {
        alert(msg);
        return;
      }

      if (msg.toLowerCase().includes("exists") || msg.toLowerCase().includes("duplicate")) {
        alert(`Serial "${editData.value.trim()}" already exists!`);
      } else {
        alert(msg);
      }
    } finally {
      setEditLoading(false);
    }
  };

  const hasActiveFilters = filter || modelFilter;

  const getModelName = useCallback((modelId, serialObj) => {
    const model = models.find(m => String(m.id) === String(modelId));
    if (model) return model.name;
    if (serialObj && serialObj.modelName) return serialObj.modelName;
    if (serialObj && serialObj.model?.name) return serialObj.model.name;
    return "Unknown";
  }, [models]);

  // ✅ FIX: Removed .reverse() so that newest items (which backend sends first) stay at the top.
  const filteredSerials = useMemo(() => {
    return serials.filter((s) => {
      const currentStatus = (s.status || "").trim().toLowerCase();
      if (currentStatus !== "available") return false;
      
      const serialValue = (s.value || s.serialNumber || "").toLowerCase(); 
      const modelName = getModelName(s.modelId, s).toLowerCase();
      const searchLower = filter.toLowerCase();
      
      const matchesSearch = serialValue.includes(searchLower) || modelName.includes(searchLower);
      const matchesModel = modelFilter ? String(s.modelId) === String(modelFilter) : true;
      
      return matchesSearch && matchesModel;
    }); 
  }, [serials, filter, modelFilter, getModelName]);

  const totalPages = Math.ceil(filteredSerials.length / itemsPerPage);
  const currentSerials = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSerials.slice(start, start + itemsPerPage);
  }, [filteredSerials, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, modelFilter]);

  // ✅ Effect to handle clicks outside the model dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
      }
      if (filterModelDropdownRef.current && !filterModelDropdownRef.current.contains(event.target)) {
        setIsFilterModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ✅ Filtered models for the new searchable dropdown
  const filteredModelsForDropdown = useMemo(() => {
      if (!modelSearch) return models;
      return models.filter(m => 
          m.name.toLowerCase().includes(modelSearch.toLowerCase())
      );
  }, [models, modelSearch]);

  // ✅ Handle model selection from the new dropdown
  const handleModelSelect = (modelId) => {
      const selectedModel = models.find(m => String(m.id) === String(modelId));
      if (selectedModel) {
          handleModelChange(modelId);
          setModelSearch(selectedModel.name);
          setIsModelDropdownOpen(false);
      }
  }

  // ✅ Trigger Custom React Modal for Requesting New Model with Serial
  const handleOpenRequestModelModal = (searchName = "") => {
      setIsModelDropdownOpen(false);
      setRequestModelForm({
          name: searchName,
          company: "",
          mainCategory: "Printer",
          mrp: "",
          category: "Laser",
          colorType: "Monochrome",
          printerType: "Multi-Function",
          cpu: "",
          ram: "",
          ssd: "",
          description: "",
          screenSize: "",
          resolution: "",
          panelType: "",
          refreshRate: ""
      });
      setShowRequestModelModal(true);
  };

  const handleRequestModelSubmit = (e) => {
      e.preventDefault();
      if (!requestModelForm.name.trim()) {
          alert("Model Name is required");
          return;
      }
      if (!requestModelForm.company.trim()) {
          alert("Brand / Company is required");
          return;
      }

      const formValues = {
          name: requestModelForm.name.trim(),
          company: requestModelForm.company.trim(),
          mainCategory: requestModelForm.mainCategory,
          mrp: requestModelForm.mrp ? Number(requestModelForm.mrp) : 0,
          category: requestModelForm.mainCategory === "Printer" ? requestModelForm.category : "Computing",
          colorType: requestModelForm.mainCategory === "Printer" ? requestModelForm.colorType : "N/A",
          printerType: requestModelForm.mainCategory === "Printer" ? requestModelForm.printerType : "N/A",
          cpu: requestModelForm.mainCategory === "PC" ? requestModelForm.cpu : null,
          ram: requestModelForm.mainCategory === "PC" ? requestModelForm.ram : null,
          ssd: requestModelForm.mainCategory === "PC" ? requestModelForm.ssd : null,
          description: requestModelForm.description?.trim() || "",
          screenSize: (requestModelForm.mainCategory === "Monitor" || requestModelForm.mainCategory === "PC") ? (requestModelForm.screenSize?.trim() || null) : null,
          resolution: requestModelForm.mainCategory === "Monitor" ? (requestModelForm.resolution?.trim() || null) : null,
          panelType: requestModelForm.mainCategory === "Monitor" ? (requestModelForm.panelType?.trim() || null) : null,
          refreshRate: requestModelForm.mainCategory === "Monitor" ? (requestModelForm.refreshRate?.trim() || null) : null
      };

      setNewSerial(prev => ({
          ...prev,
          modelId: "REQUESTED",
          requestedModel: formValues,
          mrp: formValues.mrp || ""
      }));
      setModelSearch(`[Requested Model] ${formValues.name} (${formValues.company})`);
      setShowRequestModelModal(false);
      if (inputRef.current) inputRef.current.focus();
  };

  // ✅ Handle change in the model search input
  const handleModelSearchChange = (e) => {
      const { value } = e.target;
      setModelSearch(value);
      if (value === "") {
          // If input is cleared, deselect the model
          setNewSerial(prev => ({ ...prev, modelId: "", mrp: "", landingPrice: "" }));
      }
      if (!isModelDropdownOpen) {
          setIsModelDropdownOpen(true);
      }
  }

  // ✅ Filtered models for the filter dropdown
  const filteredModelsForFilterDropdown = useMemo(() => {
      if (!filterModelSearch) return models;
      return models.filter(m => 
          m.name.toLowerCase().includes(filterModelSearch.toLowerCase())
      );
  }, [models, filterModelSearch]);

  // ✅ Handle model selection from the filter dropdown
  const handleFilterModelSelect = (modelId) => {
      if (modelId === "") {
          setModelFilter("");
          setFilterModelSearch("");
          setIsFilterModelDropdownOpen(false);
      } else {
          const selectedModel = models.find(m => String(m.id) === String(modelId));
          if (selectedModel) {
              setModelFilter(modelId);
              setFilterModelSearch(selectedModel.name);
              setIsFilterModelDropdownOpen(false);
          }
      }
  }

  // ✅ Handle change in the filter model search input
  const handleFilterModelSearchChange = (e) => {
      const { value } = e.target;
      setFilterModelSearch(value);
      if (value === "") {
          setModelFilter("");
      }
      if (!isFilterModelDropdownOpen) {
          setIsFilterModelDropdownOpen(true);
      }
  }

  const availableSerials = serials.filter(s => (s.status || "").trim().toLowerCase() === "available").length;
  const totalValue = serials.filter(s => (s.status || "").trim().toLowerCase() === "available")
                            .reduce((sum, s) => sum + (Number(s.landingPrice) || 0), 0);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = currentSerials.map(s => s.id);
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    } else {
      const pageIds = new Set(currentSerials.map(s => s.id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds([]);
    } else {
      setIsSelectionMode(true);
    }
  };



  const getModelColor = (modelId) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
    ];
    const key = String(modelId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[key % colors.length];
  };

  const getWarehouseLabel = (serial) => {
    if (!serial) return "Not assigned";
    if (serial.godownName) return serial.godownName;
    if (serial.warehouseName) return serial.warehouseName;
    if (serial.warehouseLocation) return serial.warehouseLocation;
    if (typeof serial.warehouse === 'string') return serial.warehouse;
    if (serial.warehouse?.name) return serial.warehouse.name;
    if (serial.godownGuid) return serial.godownGuid;
    if (serial.warehouseGuid) return serial.warehouseGuid;
    return "Not assigned";
  };

  const areAllVisibleSelected = currentSerials.length > 0 && currentSerials.every(s => selectedIds.includes(s.id));

  const getRowNumber = (index) => {
    return (currentPage - 1) * itemsPerPage + index + 1;
  };

  return (
    <div className="relative pb-20 space-y-5">

      {/* Header */}
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-48 h-48 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-lg shadow-md shadow-emerald-500/25">
                <QrCode size={14} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {availableSerials} Available
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Serial Numbers</h1>
            {/* <p className="text-xs text-slate-500">Manage registered printer serials</p> */}
          </div>

          <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            {/* ✅ Excel Options for Admins */}
            {isAdmin && (
              <>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                  title="Download Template"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Template</span>
                </button>
                <button
                  onClick={handleExportSerials}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                  title="Export Excel"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 shadow-sm"
                  title="Upload Excel"
                >
                  <Upload size={14} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-sm ${showFilter || hasActiveFilters
                ? "bg-amber-500 text-white shadow-amber-500/25"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {(filter ? 1 : 0) + (modelFilter ? 1 : 0)}
                </span>
              )}
            </button>

            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isSelectionMode
                ? "bg-slate-800 text-white shadow-lg"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                }`}
            >
              {isSelectionMode ? <X size={14} /> : <CheckSquare size={14} />}
              <span className="hidden sm:inline">{isSelectionMode ? "Cancel" : "Select"}</span>
            </button>

            {canManage && <button
              onClick={handleToggleForm}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap shadow-lg ${showForm
                ? "bg-slate-800 text-white"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25"
                }`}
            >
              {showForm ? <X size={14} /> : <Plus size={14} />}
              <span className="hidden sm:inline">{showForm ? "Close" : "Add"}</span>
            </button>}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top duration-200">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[150px] max-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full border border-slate-200 pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Search serial..." value={filter} onChange={(e) => setFilter(e.target.value)} />
              {filter && <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
            <div className="relative min-w-[180px]" ref={filterModelDropdownRef}>
              <div className="relative">
                <input
                    type="text"
                    value={filterModelSearch}
                    onChange={handleFilterModelSearchChange}
                    onFocus={() => setIsFilterModelDropdownOpen(true)}
                    placeholder="All Models..."
                    className="w-full border border-slate-200 px-3 py-2 pr-8 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  {modelFilter && filterModelSearch ? (
                     <button type="button" onClick={() => handleFilterModelSelect("")} className="hover:text-slate-700">
                       <X size={14} />
                     </button>
                  ) : (
                    <ChevronDown size={14} className={`transition-transform ${isFilterModelDropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </div>
              
              {isFilterModelDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                      <div
                          onClick={() => handleFilterModelSelect("")}
                          className="px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer font-medium"
                      >
                          All Models
                      </div>
                      {filteredModelsForFilterDropdown.length > 0 ? (
                          filteredModelsForFilterDropdown.map(model => (
                              <div
                                  key={model.id}
                                  onClick={() => handleFilterModelSelect(model.id)}
                                  className={`px-4 py-2 text-sm cursor-pointer ${String(modelFilter) === String(model.id) ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'}`}
                              >
                                  {model.name}
                              </div>
                          ))
                      ) : (
                          <div className="px-4 py-3 text-sm text-slate-500 text-center">No models found</div>
                      )}
                  </div>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 px-2">
              <span className="font-bold text-slate-700">{filteredSerials.length}</span> results
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition-all">
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Badge */}
      {!showFilter && hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Filtered:</span>
          {filter && (
            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
              "{filter}" <button onClick={() => setFilter('')}><X size={12} /></button>
            </span>
          )}
          {modelFilter && (
            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
              {getModelName(modelFilter)} <button onClick={() => setModelFilter('')}><X size={12} /></button>
            </span>
          )}
          <span className="text-slate-400">({filteredSerials.length} results)</span>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 shadow-sm">
          <div className="p-1.5 bg-emerald-100 rounded-lg"><Package size={12} className="text-emerald-600" /></div>
          <div><p className="text-[9px] text-emerald-500 uppercase font-bold">Available</p><p className="text-sm font-bold text-emerald-700">{availableSerials}</p></div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 shadow-sm">
            <div className="p-1.5 bg-blue-100 rounded-lg"><TrendingUp size={12} className="text-blue-600" /></div>
            <div><p className="text-[9px] text-blue-500 uppercase font-bold">Stock Value</p><p className="text-sm font-bold text-blue-700">₹{totalValue.toLocaleString('en-IN')}</p></div>
          </div>
        )}
      </div>

      {/* Register Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg"><ScanLine size={14} className="text-white" /></div>
              <div><h3 className="text-sm font-bold text-white">Add Serial</h3><p className="text-[10px] text-white/70">Scan barcode or type manually</p></div>
            </div>
            <div className="flex items-center gap-3">
              {sessionCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                  <Hash size={12} className="text-white" />
                  <span className="text-sm font-bold text-white">{sessionCount}</span>
                  <span className="text-[10px] text-white/80">registered</span>
                </div>
              )}
              {newSerial.modelId && <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded-full">{getModelName(newSerial.modelId)}</span>}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              
              {/* === START: NEW SEARCHABLE MODEL DROPDOWN === */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Box size={10} /> Model
                </label>
                <div ref={modelDropdownRef} className="relative">
                    <div className="relative">
                        <input
                            type="text"
                            value={modelSearch}
                            onChange={handleModelSearchChange}
                            onFocus={() => setIsModelDropdownOpen(true)}
                            placeholder="Search & select model..."
                            className="w-full border border-slate-200 p-2.5 pl-3 pr-10 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            required={!newSerial.modelId}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          {newSerial.modelId && modelSearch ? (
                             <button type="button" onClick={() => handleModelSearchChange({target: {value: ""}})} className="hover:text-slate-700">
                               <X size={16} />
                             </button>
                          ) : (
                            <ChevronDown size={16} className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                    </div>
                    
                    {isModelDropdownOpen && (
                        <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                            {filteredModelsForDropdown.length > 0 ? (
                                <>
                                    {filteredModelsForDropdown.map(model => (
                                        <div
                                            key={model.id}
                                            onClick={() => handleModelSelect(model.id)}
                                            className="px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                                        >
                                            {model.name}
                                        </div>
                                    ))}
                                    {modelSearch && modelSearch.trim() && (
                                        <div
                                            onClick={() => handleOpenRequestModelModal(modelSearch)}
                                            className="px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border-t border-slate-100 cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Plus size={14} /> Request New Model: "{modelSearch}"
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="px-4 py-3 text-sm text-slate-500 text-center">No models found</div>
                                    {modelSearch && modelSearch.trim() && (
                                        <div
                                            onClick={() => handleOpenRequestModelModal(modelSearch)}
                                            className="px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 border-t border-slate-100 cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Plus size={14} /> Request New Model: "{modelSearch}"
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
              </div>
              {/* === END: NEW SEARCHABLE MODEL DROPDOWN === */}

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MRP</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span><input className="w-full border border-slate-200 p-2.5 pl-7 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed" value={newSerial.mrp || '-'} readOnly /></div>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Landing Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    className={`w-full border p-2.5 pl-7 rounded-xl text-sm bg-white outline-none transition-all ${registerExceedsMRP
                      ? 'border-amber-400 focus:ring-2 focus:ring-amber-500 bg-amber-50/30'
                      : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    value={newSerial.landingPrice}
                    onChange={(e) => setNewSerial(prev => ({ ...prev, landingPrice: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
                {registerExceedsMRP && (
                  <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertTriangle size={10} />
                    LP exceeds MRP — reason will be required
                  </p>
                )}
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Warehouse size={10} /> Godown
                </label>
                <div className="flex gap-1.5">
                  <select
                    className="min-w-0 flex-1 border border-slate-200 p-2.5 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    value={newSerial.warehouseGuid}
                    onChange={(e) => setNewSerial(prev => ({ ...prev, warehouseGuid: e.target.value }))}
                  >
                    <option value="">Not assigned</option>
                    {godowns.map((godown) => (
                      <option key={godown.guid} value={godown.guid}>
                        {godown.godownName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      const guid = await handleAddGodown();
                      if (guid) setNewSerial(prev => ({ ...prev, warehouseGuid: guid }));
                    }}
                    className="shrink-0 w-10 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-all"
                    title="Add Godown"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><QrCode size={10} /> Serial Number</label>
                <div className="relative">
                  <ScanLine size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    ref={inputRef}
                    className={`w-full border p-2.5 pl-10 pr-10 rounded-xl text-sm font-mono tracking-wider outline-none transition-all ${registerIsDuplicate
                      ? 'border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-500'
                      : isSaving
                        ? 'border-amber-300 bg-amber-50/30 focus:ring-2 focus:ring-amber-400'
                        : 'border-emerald-200 bg-emerald-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500'
                      }`}
                    placeholder={isSaving ? "Saving..." : "Scan or type..."}
                    value={newSerial.value}
                    onChange={handleInputChange}
                    disabled={isSaving || reasonPopup.show}
                    required
                  />
                  {newSerial.value.trim() && !isSaving && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {registerIsDuplicate ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                    </div>
                  )}
                  {isSaving && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin block"></span>
                    </div>
                  )}
                </div>
                {registerIsDuplicate && (
                  <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle size={11} />
                    Serial "{newSerial.value.trim()}" already exists!
                  </p>
                )}
              </div>
              <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={registerIsDuplicate || isSaving || reasonPopup.show}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-2.5 rounded-xl hover:from-emerald-600 hover:to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Save"
                >
                  {isSaving ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block"></span>
                  ) : (
                    <Save size={18} />
                  )}
                </button>
              </div>
            </div>
            {statusMsg.text && (
              <div className={`mt-3 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 ${statusMsg.type === 'error' ? 'text-red-700 bg-red-50 border border-red-100' : 'text-emerald-700 bg-emerald-50 border border-emerald-100'}`}>
                {statusMsg.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}{statusMsg.text}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
              <tr>
                {isSelectionMode && (
                  <th className="p-3 w-10 text-center bg-slate-100 border-r border-slate-200">
                    <input type="checkbox" onChange={handleSelectAll} checked={areAllVisibleSelected} className="w-4 h-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                )}
                <th className="p-3 w-12 font-bold text-center">#</th>
                <th className="p-3 font-bold">Serial Number</th>
                <th className="p-3 font-bold">Model</th>
                <th className="p-3 font-bold">Godown</th>
                <th className="p-3 font-bold">Vendor</th>
                {canManage && <th className="p-3 font-bold">Landing Price</th>}
                <th className="p-3 font-bold">Status</th>
                {!isSelectionMode && <th className="p-3 font-bold text-center w-24">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentSerials.map((s, index) => {
                const serialModel = models.find(m => String(m.id) === String(s.modelId));
                const serialMRP = Number(serialModel?.mrp) || 0;
                const serialLP = Number(s.landingPrice) || 0;
                const hasExceededMRP = serialMRP > 0 && serialLP > serialMRP;

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(s.id) ? 'bg-emerald-50/60' : ''}`}
                    onClick={() => isSelectionMode && handleSelectOne(s.id)}
                  >
                    {isSelectionMode && (
                      <td className="p-3 text-center border-r border-slate-100">
                        <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelectOne(s.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      </td>
                    )}
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                        {getRowNumber(index)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-lg">
                          <QrCode size={12} className="text-emerald-600" />
                        </div>
                        {/* 🔥 Fallback to show serial if value is undefined */}
                        <span className="font-mono text-sm font-bold text-slate-800 tracking-wide">{s.value || s.serialNumber || "N/A"}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getModelColor(s.modelId)}`}>
                        {getModelName(s.modelId, s)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {getWarehouseLabel(s)}
                      </span>
                    </td>
                    <td className="p-3">
                      {s.vendorName ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {s.vendorName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  {canManage && (
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold ${hasExceededMRP ? 'text-amber-700' : 'text-slate-700'}`}>
                            ₹{(s.landingPrice || 0).toLocaleString('en-IN')}
                          </span>
                          {hasExceededMRP && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewReasonPopup(s);
                              }}
                              className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-all"
                              title={s.landingPriceReason || "LP > MRP — Click to view reason"}
                            >
                              <AlertTriangle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {s.status}
                      </span>
                    </td>
                    {!isSelectionMode && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                      {canManage && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditPopup(s); }}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete([s.id]); }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {currentSerials.length === 0 && (
                <tr>
                  <td colSpan={6 + (canManage ? 1 : 0)} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-100 rounded-full">
                        <QrCode size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No serials found</p>
                      <p className="text-slate-400 text-xs">Try adjusting your filters or add new serials</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredSerials.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-slate-700">{Math.min(currentPage * itemsPerPage, filteredSerials.length)}</strong> of <strong className="text-slate-700">{filteredSerials.length}</strong> entries
              </span>
              <select
                className="border border-slate-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-slate-600 cursor-pointer"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={500}>500 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <SerialsModals
        {...{
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
        }}
      />

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom duration-300">
          <span className="font-bold text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{selectedIds.length} Selected</span>
          <div className="h-4 w-px bg-slate-700"></div>
          {canManage ? (
            <button onClick={() => handleDelete(selectedIds)} className="flex items-center gap-1.5 text-xs hover:text-red-400 transition font-medium">
              <Trash2 size={14} /> Delete
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">Delete Restricted</span>
          )}
          <button onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }} className="text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  );
}

