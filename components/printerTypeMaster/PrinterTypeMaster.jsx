"use client";
import React from "react";
import { Printer } from "lucide-react";
import MasterCrud from "../common/MasterCrud";

export default function PrinterTypeMaster() {
  return (
    <MasterCrud
      icon={Printer}
      title="Printer Type Master"
      subtitle="Manage printer type options shown on Printer variants (Single-Function, Multi-Function, etc.)"
      entityLabel="Printer Type"
      listEndpoint="/Inventory/GetPrinterTypeList"
      saveEndpoint="/Inventory/SaveOrUpdatePrinterType"
      deleteEndpoint="/Inventory/DeletePrinterType"
      idKey="printerTypeId"
      requiredMessage="Printer type name is required"
      validate={(values) => Boolean((values.name || "").trim())}
      deleteConfirm={{ title: "Delete printer type?", text: "Are you sure you want to delete this printer type?" }}
      fields={[
        { key: "name", label: "Printer Type Name", placeholder: "Single-Function / Multi-Function" },
      ]}
      columns={[
        {
          key: "printerTypeName",
          label: "Printer Type",
          render: (row) => (
            <span className="bg-indigo-50 px-2 py-1 rounded text-indigo-700">{row.printerTypeName}</span>
          ),
        },
      ]}
      buildPayload={(id, values) => ({
        PrinterTypeId: id || "0",
        PrinterTypeName: (values.name || "").trim(),
      })}
      deletePayload={(id) => ({ printerTypeId: id })}
      mapEditValues={(row) => ({
        name: row.printerTypeName || "",
      })}
    />
  );
}
