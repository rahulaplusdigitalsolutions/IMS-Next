"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Store, FileText } from "lucide-react";
import MasterCrud from "../common/MasterCrud";
import { legacyApi } from "@/lib/client/http";

const TagList = ({ tags, className }) => (
  <div className="flex flex-wrap gap-1">
    {tags.length > 0 ? (
      tags.map((tag, i) => (
        <span key={i} className={className}>{tag}</span>
      ))
    ) : (
      <span className="text-xs font-medium text-slate-400">NA</span>
    )}
  </div>
);

const splitList = (value) => (value ? value.split(",").map((v) => v.trim()) : []);

export default function VendorMaster() {
  const router = useRouter();

  return (
    <MasterCrud
      icon={Store}
      title="Vendor Master"
      subtitle="Manage your vendors and suppliers"
      entityLabel="Vendor"
      listEndpoint="/Inventory/GetVendorList"
      saveEndpoint="/Inventory/SaveOrUpdateVendor"
      deleteEndpoint="/Inventory/DeleteVendor"
      idKey="vendorId"
      requiredMessage="Please enter vendor firm name"
      deleteConfirm={{ text: "Vendor will be disabled" }}
      saveLabel={(editId) => (editId ? "Update Quick" : "Quick Add Vendor")}
      fetchExtras={async () => {
        const res = await legacyApi.get("/Inventory/GetCategoryDropdown");
        return { categories: res.data?.data || [] };
      }}
      fields={[
        { key: "name", label: "Firm Name", placeholder: "Enter Vendor Firm Name", required: true },
      ]}
      columns={[
        { key: "vendorFirmName", label: "Firm Name", render: (row) => (
          <span className="text-slate-800">{row.vendorFirmName}</span>
        ) },
        {
          key: "dealingCategories",
          label: "Dealing Categories",
          render: (row, extras) => {
            const categories = extras.categories || [];
            const raw = row.vendorDealingCategories || row.DealingCategories || row.dealingCategories;
            const tags = splitList(raw).map((id) => {
              const cat = categories.find((c) => String(c.Value) === id || String(c.categoryId) === id);
              return cat ? (cat.Text || cat.categoryName) : id;
            });
            return <TagList tags={tags} className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-xs font-bold border border-sky-100" />;
          },
        },
        {
          key: "dealingItems",
          label: "Dealing Items",
          render: (row) => (
            <TagList
              tags={splitList(row.vendorDealingItems || row.VendorDealingItems)}
              className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold border border-slate-200"
            />
          ),
        },
      ]}
      rowActions={(row) => (
        <button
          onClick={() => router.push(`/vendorDetails?vendorId=${row.vendorId}`)}
          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 select-none"
          title="Detailed View"
        >
          <FileText size={14} /> Full Details
        </button>
      )}
      buildPayload={(id, values) => ({
        VendorId: id || "0",
        VendorFirmName: (values.name || "").trim(),
      })}
      deletePayload={(id) => ({ vendorId: id })}
      mapEditValues={(row) => ({ name: row.vendorFirmName || "" })}
    />
  );
}



