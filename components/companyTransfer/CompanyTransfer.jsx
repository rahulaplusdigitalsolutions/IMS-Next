"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Building2, CheckSquare, Loader2, Package, Square } from "lucide-react";
import Swal from "sweetalert2";
import { printerService } from "@/lib/services/api";
import { inventoryService } from "@/lib/services/inventoryService";
import SearchableSelect from "@/components/common/SearchableSelect";

export default function CompanyTransfer({ currentUser }) {
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [sourceCompany, setSourceCompany] = useState("");
  const [destinationCompany, setDestinationCompany] = useState("");

  const [itemVariants, setItemVariants] = useState([]);
  const [fetchingItems, setFetchingItems] = useState(false);
  const [selectedItemVariantId, setSelectedItemVariantId] = useState("");

  const [serials, setSerials] = useState([]);
  const [fetchingSerials, setFetchingSerials] = useState(false);
  const [selectedSerials, setSelectedSerials] = useState([]);
  const [quantity, setQuantity] = useState("");

  const [transferring, setTransferring] = useState(false);

  const canManage = currentUser?.role === "Admin" || !!currentUser?.allow_edit_inventory;

  useEffect(() => {
    (async () => {
      try {
        setLoadingCompanies(true);
        const data = await printerService.getCompanies();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || error.message || "Failed to fetch companies", "error");
      } finally {
        setLoadingCompanies(false);
      }
    })();
  }, []);

  useEffect(() => {
    setSelectedItemVariantId("");
    setSerials([]);
    setSelectedSerials([]);
    setQuantity("");
    if (!sourceCompany) {
      setItemVariants([]);
      return;
    }
    (async () => {
      try {
        setFetchingItems(true);
        const data = await inventoryService.getCompanyItemVariants(sourceCompany);
        setItemVariants(Array.isArray(data) ? data : []);
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || error.message || "Failed to fetch items", "error");
      } finally {
        setFetchingItems(false);
      }
    })();
  }, [sourceCompany]);

  const selectedItem = useMemo(
    () => itemVariants.find((v) => v.itemVariantId === selectedItemVariantId) || null,
    [itemVariants, selectedItemVariantId]
  );

  useEffect(() => {
    setSelectedSerials([]);
    setQuantity("");
    if (!sourceCompany || !selectedItemVariantId || !selectedItem?.isTrackable) {
      setSerials([]);
      return;
    }
    (async () => {
      try {
        setFetchingSerials(true);
        const data = await inventoryService.getCompanyVariantSerials(sourceCompany, selectedItemVariantId);
        setSerials(Array.isArray(data) ? data : []);
      } catch (error) {
        Swal.fire("Error", error.response?.data?.message || error.message || "Failed to fetch serials", "error");
      } finally {
        setFetchingSerials(false);
      }
    })();
  }, [sourceCompany, selectedItemVariantId, selectedItem?.isTrackable]);

  const toggleSerial = (id) => {
    setSelectedSerials((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleAllSerials = () => {
    setSelectedSerials(selectedSerials.length === serials.length ? [] : serials.map((s) => s.id));
  };

  const isSerialized = !!selectedItem?.isTrackable;
  const canSubmit =
    !!sourceCompany &&
    !!destinationCompany &&
    sourceCompany !== destinationCompany &&
    !!selectedItemVariantId &&
    (isSerialized ? selectedSerials.length > 0 : Number(quantity) > 0);

  const handleTransfer = async () => {
    if (!canSubmit) {
      Swal.fire("Warning", "Please complete all selections to transfer.", "warning");
      return;
    }

    const confirm = await Swal.fire({
      title: "Confirm Transfer?",
      text: isSerialized
        ? `Move ${selectedSerials.length} serial(s) of "${selectedItem?.itemName} - ${selectedItem?.variantName}" from ${companies.find((c) => c.guid === sourceCompany)?.name} to ${companies.find((c) => c.guid === destinationCompany)?.name}?`
        : `Move ${quantity} unit(s) of "${selectedItem?.itemName} - ${selectedItem?.variantName}" from ${companies.find((c) => c.guid === sourceCompany)?.name} to ${companies.find((c) => c.guid === destinationCompany)?.name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      confirmButtonText: "Yes, Transfer",
    });
    if (!confirm.isConfirmed) return;

    setTransferring(true);
    try {
      await inventoryService.transferToCompany({
        sourceCompanyId: sourceCompany,
        destinationCompanyId: destinationCompany,
        itemVariantId: selectedItemVariantId,
        serialIds: isSerialized ? selectedSerials : undefined,
        quantity: isSerialized ? undefined : Number(quantity),
      });
      Swal.fire("Success", "Inventory transferred successfully", "success");

      setSelectedItemVariantId("");
      setSerials([]);
      setSelectedSerials([]);
      setQuantity("");
      // Refresh the item list so available counts reflect the transfer.
      const data = await inventoryService.getCompanyItemVariants(sourceCompany);
      setItemVariants(Array.isArray(data) ? data : []);
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || error.message || "Transfer failed", "error");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-white px-5 py-5">
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Transfer Inventory Between Companies</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Move stock (serialized or non-serialized) from one company to another. The destination company must already
            have a matching variant in its own Item Master.
          </p>
        </div>

        {!canManage && (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
            You have read-only access here — contact an admin to perform a transfer.
          </div>
        )}

        <div className="p-6">
          {loadingCompanies ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">1. Source Company</label>
                  <select
                    value={sourceCompany}
                    onChange={(e) => setSourceCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Company --</option>
                    {companies.map((c) => (
                      <option key={c.guid} value={c.guid}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">2. Destination Company</label>
                  <select
                    value={destinationCompany}
                    onChange={(e) => setDestinationCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Company --</option>
                    {companies
                      .filter((c) => c.guid !== sourceCompany)
                      .map((c) => (
                        <option key={c.guid} value={c.guid}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="mb-6 space-y-1 relative">
                <label className="text-sm font-bold text-slate-700">3. Select Item</label>
                <SearchableSelect
                  value={selectedItemVariantId}
                  onChange={setSelectedItemVariantId}
                  disabled={!sourceCompany || fetchingItems}
                  placeholder="Choose item"
                  options={itemVariants.map((v) => ({
                    value: v.itemVariantId,
                    label: `${v.itemName} - ${v.variantName} (${v.availableCount} available)`,
                  }))}
                />
                {fetchingItems && <Loader2 className="absolute right-10 top-9 animate-spin text-indigo-600" size={16} />}
              </div>

              {selectedItemVariantId && isSerialized && (
                <div className="mb-6 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-bold text-slate-800">4. Select Serial Numbers to Transfer</h3>
                    {fetchingSerials && <Loader2 className="animate-spin text-indigo-600" size={18} />}
                  </div>
                  <div className="max-h-64 overflow-y-auto bg-white p-4">
                    {serials.length === 0 ? (
                      <p className="py-4 text-center text-sm italic text-slate-500">No available serials for this item in the source company.</p>
                    ) : (
                      <div className="space-y-3">
                        <button onClick={toggleAllSerials} className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800">
                          {selectedSerials.length === serials.length ? <CheckSquare size={16} /> : <Square size={16} />}
                          {selectedSerials.length === serials.length ? "Deselect All" : "Select All"}
                        </button>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {serials.map((serial) => {
                            const isSelected = selectedSerials.includes(serial.id);
                            return (
                              <div
                                key={serial.id}
                                onClick={() => toggleSerial(serial.id)}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                                  isSelected ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}>
                                  {isSelected && <CheckSquare size={14} className="text-white" />}
                                </div>
                                <span className="truncate text-sm font-bold text-slate-700" title={serial.serialNumber}>
                                  {serial.serialNumber}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedItemVariantId && !isSerialized && (
                <div className="mb-6 space-y-1">
                  <label className="text-sm font-bold text-slate-700">4. Quantity to Transfer</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {selectedItem && (
                    <p className="text-xs font-medium text-slate-500">{selectedItem.availableCount} available in source company</p>
                  )}
                </div>
              )}

              <button
                onClick={handleTransfer}
                disabled={!canManage || transferring || !canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {transferring ? <Loader2 size={18} className="animate-spin" /> : <ArrowRightLeft size={18} />}
                Transfer{isSerialized && selectedSerials.length > 0 ? ` ${selectedSerials.length} Item(s)` : ""}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
