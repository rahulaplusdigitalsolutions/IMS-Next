"use client";
import React from "react";
import { Palette } from "lucide-react";
import MasterCrud from "../common/MasterCrud";

export default function ColorTypeMaster() {
  return (
    <MasterCrud
      icon={Palette}
      title="Color Type Master"
      subtitle="Manage color type options shown on Printer variants (Monochrome, Color, etc.)"
      entityLabel="Color Type"
      listEndpoint="/Inventory/GetColorTypeList"
      saveEndpoint="/Inventory/SaveOrUpdateColorType"
      deleteEndpoint="/Inventory/DeleteColorType"
      idKey="colorTypeId"
      requiredMessage="Color type name is required"
      validate={(values) => Boolean((values.name || "").trim())}
      deleteConfirm={{ title: "Delete color type?", text: "Are you sure you want to delete this color type?" }}
      fields={[
        { key: "name", label: "Color Type Name", placeholder: "Monochrome / Color" },
      ]}
      columns={[
        {
          key: "colorTypeName",
          label: "Color Type",
          render: (row) => (
            <span className="bg-indigo-50 px-2 py-1 rounded text-indigo-700">{row.colorTypeName}</span>
          ),
        },
      ]}
      buildPayload={(id, values) => ({
        ColorTypeId: id || "0",
        ColorTypeName: (values.name || "").trim(),
      })}
      deletePayload={(id) => ({ colorTypeId: id })}
      mapEditValues={(row) => ({
        name: row.colorTypeName || "",
      })}
    />
  );
}
