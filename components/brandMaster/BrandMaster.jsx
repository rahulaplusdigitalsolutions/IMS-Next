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
      ]}
      columns={[
        { key: "brandName", label: "Brand Name" },
      ]}
      buildPayload={(id, values) => ({
        BrandId: id || "0",
        BrandName: (values.name || "").trim(),
      })}
      deletePayload={(id) => ({ brandId: id })}
      mapEditValues={(row) => ({ name: row.brandName || "" })}
    />
  );
}
