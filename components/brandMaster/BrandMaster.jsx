"use client";
import React from "react";
import { List } from "lucide-react";
import { printerService } from '@/lib/services/api';
import MasterCrud from "../common/MasterCrud";

export default function BrandMaster() {
  return (
    <MasterCrud
      icon={List}
      title="Brand Master"
      subtitle="Manage your inventory brands"
      entityLabel="Brand"
      listEndpoint="/Inventory/GetBrandList"
      saveEndpoint="/Inventory/SaveOrUpdateBrand"
      deleteEndpoint="/Inventory/DeleteBrand"
      idKey="brandId"
      requiredMessage="Please enter brand name"
      deleteConfirm={{ text: "This brand will be deactivated" }}
      fields={[
        { key: "name", label: "Brand Name", placeholder: "Enter Brand Name", required: true },
        { key: "showInModels", label: "Show in Models", type: "checkbox" },
      ]}
      columns={[
        { key: "brandName", label: "Brand Name" },
        { key: "showInModels", label: "Show in Models", render: (row) => row.showInModels ? "Yes" : "No" },
      ]}
      buildPayload={(id, values) => ({
        BrandId: id || "0",
        BrandName: (values.name || "").trim(),
        ShowInModels: !!values.showInModels,
      })}
      deletePayload={(id) => ({ brandId: id })}
      mapEditValues={(row) => ({ name: row.brandName || "", showInModels: !!row.showInModels })}
    />
  );
}
