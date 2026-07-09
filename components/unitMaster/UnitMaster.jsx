"use client";
import React from "react";
import { Ruler } from "lucide-react";
import MasterCrud from "../common/MasterCrud";

export default function UnitMaster() {
  return (
    <MasterCrud
      icon={Ruler}
      title="Unit Master"
      subtitle="Manage units of measurement (PCS, PKT, CTN)"
      entityLabel="Unit"
      listEndpoint="/Inventory/GetUnitList"
      saveEndpoint="/Inventory/SaveOrUpdateUnit"
      deleteEndpoint="/Inventory/DeleteUnit"
      idKey="unitId"
      requiredMessage="Unit name and base quantity are required"
      validate={(values) => Boolean((values.name || "").trim() && values.baseQty)}
      deleteConfirm={{ title: "Delete unit?", text: "Are you sure you want to delete this unit?" }}
      fields={[
        { key: "name", label: "Unit Name", placeholder: "PCS / PKT / CTN" },
        { key: "desc", label: "Description", placeholder: "Pieces / Packet" },
        { key: "baseQty", label: "Base Unit Qty", placeholder: "1 / 10 / 100", type: "number" },
      ]}
      columns={[
        {
          key: "unitName",
          label: "Unit",
          render: (row) => (
            <span className="bg-indigo-50 px-2 py-1 rounded text-indigo-700">{row.unitName}</span>
          ),
        },
        { key: "unitDescription", label: "Description", render: (row) => row.unitDescription || "-" },
        { key: "baseUnitQty", label: "Base Qty" },
      ]}
      buildPayload={(id, values) => ({
        UnitId: id || "0",
        UnitName: (values.name || "").trim(),
        UnitDesc: (values.desc || "").trim(),
        BaseUnitQty: Number(values.baseQty),
      })}
      deletePayload={(id) => ({ unitId: id })}
      mapEditValues={(row) => ({
        name: row.unitName || "",
        desc: row.unitDescription || "",
        baseQty: row.baseUnitQty || "",
      })}
    />
  );
}

