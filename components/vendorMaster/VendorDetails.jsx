"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import axios from "axios";
import { FileText, Save, X, ArrowLeft, Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const VendorDetails = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("vendorId");
  const initialIsEdit = searchParams.get("edit") === "true";

  const [isEdit, setIsEdit] = useState(initialIsEdit);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    VendorId: vendorId || "",
    VendorName: "",
    VendorFirmName: "",
    VendorGstin: "",
    VendorMobile: "",
    VendorAlternateMobile: "",
    VendorEmail: "",
    VendorAddress: "",
    VendorState: "",
    VendorPincode: "",
    VendorBankName: "",
    VendorBankAccountName: "",
    VendorBankAccountNumber: "",
    VendorBankIfsc: "",
  });

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dealingItems, setDealingItems] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef(null);

  const getHeaders = () => {
    const token = localStorage.getItem("pt_auth_token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      // In a real scenario, you fetch the vendor details from an API
      // Since CSHTML relies on the server passing @Model, we mock the fetch or use a generic endpoint
      // Assuming GET /Inventory/GetVendorDetails?vendorId=123 returning JSON
      
      const payload = vendorId ? { params: { vendorId } } : {};
      
      const [vendorRes, catRes] = await Promise.all([
        vendorId ? axios.get(`${API_BASE_URL}/Inventory/GetVendorDetails`, { ...payload, headers: getHeaders() }).catch(() => ({ data: { data: {} } })) : { data: { data: {} } },
        axios.get(`${API_BASE_URL}/Inventory/GetCategoryDropdown`, { headers: getHeaders() })
      ]);
      
      setCategories(catRes.data?.data || []);

      const vendor = vendorRes.data?.data || {};
      
      if (vendorId && Object.keys(vendor).length > 0) {
        setFormData({
          VendorId: vendor.vendorId || vendor.VendorId || vendorId,
          VendorName: vendor.vendorName || vendor.VendorName || "",
          VendorFirmName: vendor.vendorFirmName || vendor.VendorFirmName || "",
          VendorGstin: vendor.vendorGSTIN || vendor.VendorGstin || "",
          VendorMobile: vendor.vendorMobile || vendor.VendorMobile || "",
          VendorAlternateMobile: vendor.vendorAlternateMobile || vendor.VendorAlternateMobile || "",
          VendorEmail: vendor.vendorEmail || vendor.VendorEmail || "",
          VendorAddress: vendor.vendorAddress || vendor.VendorAddress || "",
          VendorState: vendor.vendorState || vendor.VendorState || "",
          VendorPincode: vendor.vendorPincode || vendor.VendorPincode || "",
          VendorBankName: vendor.vendorBankName || vendor.VendorBankName || "",
          VendorBankAccountName: vendor.vendorBankAccountName || vendor.VendorBankAccountName || "",
          VendorBankAccountNumber: vendor.vendorBankAccountNumber || vendor.VendorBankAccountNumber || "",
          VendorBankIfsc: vendor.vendorBankIFSC || vendor.VendorBankIfsc || "",
        });
        
        // Load categories mappings correctly from CSV string or array
        const cats = vendor.vendorDealingCategories || vendor.DealingCategories || vendor.dealingCategoryIds;
        if (cats) {
          const catIds = typeof cats === 'string' 
            ? cats.split(',').map(c => c.trim()).filter(c => c)
            : Array.isArray(cats) ? cats : [];
          setSelectedCategories(catIds);
        }

        // Deal with items
        const itemsData = vendor.vendorDealingItems || vendor.VendorDealingItems;
        if (itemsData) {
          const items = typeof itemsData === 'string'
            ? itemsData.split(",").map(i => i.trim()).filter(i => i)
            : Array.isArray(itemsData) ? itemsData : [];
          setDealingItems(items);
        }
      }
      
    } catch (error) {
      console.error(error);
      if (vendorId) {
        Swal.fire("Error", "Failed to load vendor details", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (id) => {
    if (!isEdit) return;
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !dealingItems.includes(value)) {
        setDealingItems([...dealingItems, value]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    if (!isEdit) return;
    setDealingItems(dealingItems.filter(t => t !== tag));
  };

  const saveVendor = async () => {
    setLoading(true);
    
    // In jQuery it serialized the form. We construct the payload manually here.
    const payload = {
      ...formData,
      DealingCategoryIds: selectedCategories,
      VendorDealingItems: dealingItems.join(",")
    };

    try {
      const res = await axios.post(
        `${API_BASE_URL}/Inventory/SaveVendorFromDetails`,
        payload,
        { headers: getHeaders() }
      );
      
      if (res.data?.message === "Success" || !res.data?.message) {
        Swal.fire("Success", "Vendor updated successfully", "success").then(() => {
          setIsEdit(false);
          // Update URL without refresh
          router.push(`/vendorDetails?vendorId=${vendorId || formData.VendorId}`);
        });
      } else {
        Swal.fire("Error", res.data?.message || "Failed to save vendor", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.VendorName && vendorId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 min-h-screen">
      <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <FileText size={28} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Vendor Details</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {isEdit ? "Editing information for" : "Viewing information for"} 
              <strong className="text-indigo-600 ml-1">{formData.VendorName || "New Vendor"}</strong>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isEdit ? (
             <button 
                onClick={() => setIsEdit(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
             >
                Edit Details
             </button>
          ) : null}

          <button 
            onClick={() => router.push("/vendorMaster")}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <ArrowLeft size={16} /> Back to List
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Name</label>
              <input
                name="VendorName"
                value={formData.VendorName}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Firm Name</label>
              <input
                name="VendorFirmName"
                value={formData.VendorFirmName}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">GSTIN Number</label>
              <input
                name="VendorGstin"
                value={formData.VendorGstin}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-mono outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div>
          <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Contact Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mobile Number</label>
              <input
                name="VendorMobile"
                value={formData.VendorMobile}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Alternate Mobile</label>
              <input
                name="VendorAlternateMobile"
                value={formData.VendorAlternateMobile}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
              <input
                name="VendorEmail"
                type="email"
                value={formData.VendorEmail}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div>
          <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vendor Address</label>
              <textarea
                name="VendorAddress"
                value={formData.VendorAddress}
                onChange={handleInputChange}
                readOnly={!isEdit}
                rows="2"
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">State</label>
              <input
                name="VendorState"
                value={formData.VendorState}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pincode</label>
              <input
                name="VendorPincode"
                value={formData.VendorPincode}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div>
          <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Bank Name</label>
              <input
                name="VendorBankName"
                value={formData.VendorBankName}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Holder</label>
              <input
                name="VendorBankAccountName"
                value={formData.VendorBankAccountName}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-medium outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Account Number</label>
              <input
                name="VendorBankAccountNumber"
                value={formData.VendorBankAccountNumber}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-mono outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">IFSC Code</label>
              <input
                name="VendorBankIfsc"
                value={formData.VendorBankIfsc}
                onChange={handleInputChange}
                readOnly={!isEdit}
                className={`w-full border rounded-xl px-4 py-3 font-mono outline-none transition-all ${
                  isEdit ? 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-100 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Categories & Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* Dealing Categories */}
          <div>
            <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Dealing Categories</h3>
            {!isEdit ? (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.length > 0 ? (
                  categories.filter(c => selectedCategories.includes(String(c.Value || c.categoryId))).map(cat => (
                    <span key={cat.Value || cat.categoryId} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                      {cat.Text || cat.categoryName}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm font-medium">NA</span>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-300 rounded-xl max-h-60 overflow-y-auto p-2">
                {categories.map((cat) => {
                  const id = String(cat.Value || cat.categoryId);
                  const name = cat.Text || cat.categoryName;
                  return (
                    <label key={id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        checked={selectedCategories.includes(id)}
                        onChange={() => handleCategoryToggle(id)}
                      />
                      <span className="text-sm font-medium text-slate-700">{name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dealing Items */}
          <div>
            <h3 className="text-lg font-bold text-slate-700 border-b border-slate-200 pb-2 mb-4">Dealing Items</h3>
            {!isEdit ? (
              <div className="flex flex-wrap gap-2">
                {dealingItems.length > 0 ? (
                  dealingItems.map((item, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm font-medium">NA</span>
                )}
              </div>
            ) : (
              <div 
                className="bg-white border border-slate-300 rounded-xl p-3 min-h-[120px] flex flex-wrap gap-2 items-start focus-within:ring-2 focus-within:ring-indigo-100 transition-all cursor-text"
                onClick={() => tagInputRef.current?.focus()}
              >
                {dealingItems.map((item, idx) => (
                  <span key={idx} className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                    {item}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(item); }} className="hover:text-indigo-200 ml-1">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input 
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-[150px] outline-none text-sm font-medium text-slate-800 bg-transparent py-1"
                  placeholder="Type item and press comma or Enter"
                />
              </div>
            )}
          </div>

        </div>

        {/* Action Buttons */}
        {isEdit && (
          <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={saveVendor}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-200"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Vendor Details
            </button>
            <button
              onClick={() => {
                if (vendorId) {
                  setIsEdit(false);
                } else {
                  router.push(-1);
                }
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDetails;


