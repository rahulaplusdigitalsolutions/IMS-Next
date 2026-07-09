"use client";
import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { Edit2, Trash2, Plus, Loader2 } from "lucide-react";
import { legacyApi } from "@/lib/client/http";
import PageHeader from "./PageHeader";
import Pagination from "./Pagination";

/**
 * Generic single-entity master screen (Brand / Category / Unit ...).
 * Renders the standard header + form + paginated table layout and wires the
 * legacy /Inventory CRUD endpoints. Each master only supplies its config:
 *
 *   fields:  [{ key, label, placeholder, type }]
 *   columns: [{ key, label, render?(row) }]
 *   buildPayload(id, values) -> save request body
 *   deletePayload(id)        -> delete request body
 *   mapEditValues(row)       -> values object for the form when editing
 */
export default function MasterCrud({
  icon,
  title,
  subtitle,
  entityLabel,
  entityLabelPlural,
  listEndpoint,
  saveEndpoint,
  deleteEndpoint,
  idKey,
  fields,
  columns,
  buildPayload,
  deletePayload,
  mapEditValues,
  validate,
  requiredMessage,
  deleteConfirm = {},
  fetchExtras,
  rowActions,
  saveLabel,
}) {
  const emptyValues = Object.fromEntries(fields.map((f) => [f.key, f.type === "checkbox" ? false : ""]));
  const plural = entityLabelPlural || `${entityLabel.toLowerCase()}s`;

  const [rows, setRows] = useState([]);
  const [editId, setEditId] = useState("");
  const [values, setValues] = useState(emptyValues);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [extras, setExtras] = useState({});

  useEffect(() => {
    if (!fetchExtras) return;
    fetchExtras().then(setExtras).catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRows = useCallback(async (page, limit) => {
    setTableLoading(true);
    try {
      const response = await legacyApi.get(listEndpoint, { params: { page, limit } });
      setRows(response.data?.data || []);
      setTotalRecords(response.data?.total || 0);
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setTableLoading(false);
    }
  }, [listEndpoint]);

  useEffect(() => {
    fetchRows(currentPage, pageSize);
  }, [fetchRows, currentPage, pageSize]);

  const isValid = validate
    ? validate(values)
    : fields.every((f) => !f.required || String(values[f.key] || "").trim());

  const handleSave = async () => {
    if (!isValid) {
      Swal.fire("Warning", requiredMessage || `Please enter ${entityLabel.toLowerCase()} name`, "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await legacyApi.post(saveEndpoint, buildPayload(editId, values));
      if (res.data?.message === "Success") {
        Swal.fire("Success", `${entityLabel} ${editId ? "updated" : "saved"} successfully`, "success");
        resetForm();
        fetchRows(currentPage, pageSize);
      } else {
        Swal.fire("Error", res.data?.message || `Failed to save ${entityLabel.toLowerCase()}`, "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: deleteConfirm.title || "Are you sure?",
      text: deleteConfirm.text || `This ${entityLabel.toLowerCase()} will be deactivated`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      setTableLoading(true);
      try {
        const res = await legacyApi.post(deleteEndpoint, deletePayload(id));
        if (res.data?.message === "Success") {
          Swal.fire("Deleted", `${entityLabel} deleted successfully`, "success");
          fetchRows(currentPage, pageSize);
        } else {
          Swal.fire("Error", res.data?.message || "Failed to delete", "error");
        }
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Something went wrong", "error");
      } finally {
        setTableLoading(false);
      }
    });
  };

  const handleEdit = (row) => {
    setEditId(row[idKey] || "");
    setValues({ ...emptyValues, ...mapEditValues(row) });
  };

  const resetForm = () => {
    setEditId("");
    setValues(emptyValues);
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 min-h-screen">
      <PageHeader icon={icon} title={title} subtitle={subtitle} />

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-6 items-end">
          <div className="flex-1 w-full flex flex-col md:flex-row gap-6">
            {fields.map((field) => (
              <div key={field.key} className={field.type === "checkbox" ? "flex-none w-full md:w-56" : "flex-1"}>
                {field.type === "checkbox" ? (
                  <>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{field.label}</label>
                    <label className="flex items-center gap-2.5 w-full bg-white border border-slate-300 rounded-xl px-4 py-3 cursor-pointer shadow-sm hover:border-indigo-300 transition-all">
                      <input
                        type="checkbox"
                        checked={!!values[field.key]}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-slate-700">{values[field.key] ? "Yes" : "No"}</span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{field.label}</label>
                    <input
                      type={field.type || "text"}
                      value={values[field.key] || ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                      placeholder={field.placeholder}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4 lg:mt-0 w-full lg:w-auto">
            {editId && (
              <button
                onClick={resetForm}
                className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-all shadow-sm"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {saveLabel ? saveLabel(editId) : editId ? `Update ${entityLabel}` : `Save ${entityLabel}`}
            </button>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Sr. No.</th>
                {columns.map((col) => (
                  <th key={col.key} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">{col.label}</th>
                ))}
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-48">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={row[idKey] || index} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                    <td className="py-4 px-6 text-sm text-slate-600">{(currentPage - 1) * pageSize + index + 1}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="py-4 px-6 text-sm font-bold text-slate-700">
                        {col.render ? col.render(row, extras) : row[col.key]}
                      </td>
                    ))}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {rowActions && rowActions(row)}
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors tooltip"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(row[idKey])}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors tooltip"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 2} className="py-8 px-6 text-center">
                    {tableLoading ? (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="animate-spin mb-2" size={24} />
                        <span className="text-sm font-medium">Loading {plural}...</span>
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-slate-500">No {plural} found</div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalRecords={totalRecords}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}


