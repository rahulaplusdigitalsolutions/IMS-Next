"use client";
import { useState } from 'react';
import { X, Plus, Trash2, Table } from 'lucide-react';

const COL_TYPES = [
  "INT", "BIGINT", "SMALLINT", "TINYINT",
  "VARCHAR(255)", "VARCHAR(100)", "VARCHAR(50)",
  "TEXT", "LONGTEXT", "MEDIUMTEXT",
  "DECIMAL(10,2)", "DECIMAL(15,4)", "FLOAT", "DOUBLE",
  "BOOLEAN", "TINYINT(1)",
  "DATE", "DATETIME", "TIMESTAMP",
  "JSON",
];

const newColumn = () => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  type: 'VARCHAR(255)',
  nullable: true,
  primaryKey: false,
  autoIncrement: false,
  defaultValue: '',
});

function buildPreviewSQL(tableName, columns) {
  if (!tableName || columns.length === 0) return '';
  const defs = columns.map((col) => {
    if (!col.name) return '  -- (unnamed column)';
    let def = `  \`${col.name}\` ${col.type}`;
    if (col.primaryKey) {
      def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
    } else {
      def += col.nullable ? ' NULL' : ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
    }
    return def;
  });
  const pk = columns.find((c) => c.primaryKey);
  if (pk?.name) defs.push(`  PRIMARY KEY (\`${pk.name}\`)`);
  return `CREATE TABLE \`${tableName}\` (\n${defs.join(',\n')}\n);`;
}

export default function CreateTableModal({ onConfirm, onClose }) {
  const [tableName, setTableName]   = useState('');
  const [columns, setColumns]       = useState([newColumn()]);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError]           = useState(null);

  const addColumn = () => setColumns((prev) => [...prev, newColumn()]);

  const removeColumn = (id) => setColumns((prev) => prev.filter((c) => c.id !== id));

  const updateColumn = (id, field, value) =>
    setColumns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, [field]: value };
        // Only one PK allowed
        if (field === 'primaryKey' && value) {
          return { ...updated, nullable: false };
        }
        // Auto-increment only for INT types
        if (field === 'type' && !value.startsWith('INT') && !value.startsWith('BIGINT') && !value.startsWith('SMALLINT') && !value.startsWith('TINYINT')) {
          return { ...updated, autoIncrement: false };
        }
        return updated;
      })
    );

  const setPrimaryKey = (id) =>
    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        primaryKey: c.id === id,
        nullable: c.id === id ? false : c.nullable,
      }))
    );

  const handleSubmit = () => {
    setError(null);
    if (!tableName.trim()) return setError('Table name is required.');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(tableName))
      return setError('Table name must start with a letter/underscore and contain only letters, numbers, underscores.');
    for (const col of columns) {
      if (!col.name.trim()) return setError('All columns must have a name.');
      if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(col.name))
        return setError(`Invalid column name: "${col.name}"`);
    }
    const names = columns.map((c) => c.name.toLowerCase());
    if (new Set(names).size !== names.length) return setError('Column names must be unique.');

    onConfirm({ tableName, columns });
  };

  const isIntType = (type) => ['INT','BIGINT','SMALLINT','TINYINT'].includes(type);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Table size={17} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">Create New Table</h3>
                <p className="text-emerald-200 text-xs mt-0.5">Define columns and data types</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Table name */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value.replace(/\s/g, '_'))}
              placeholder="e.g. products, order_items"
              className="w-full border-2 border-slate-200 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-sm font-mono outline-none transition-colors"
            />
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Columns ({columns.length})
              </label>
              <button
                onClick={addColumn}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} /> Add Column
              </button>
            </div>

            <div className="space-y-2">
              {/* Column header */}
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Name</span>
                <span>Type</span>
                <span>PK</span>
                <span>AI</span>
                <span>Null</span>
                <span></span>
              </div>

              {columns.map((col) => (
                <div key={col.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 items-center bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(col.id, 'name', e.target.value.replace(/\s/g, '_'))}
                    placeholder="column_name"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-white outline-none focus:border-emerald-400"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(col.id, 'type', e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white outline-none focus:border-emerald-400"
                  >
                    {COL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* PK */}
                  <div className="flex justify-center">
                    <input
                      type="radio"
                      name="primaryKey"
                      checked={col.primaryKey}
                      onChange={() => setPrimaryKey(col.id)}
                      className="accent-emerald-600 w-4 h-4 cursor-pointer"
                      title="Set as Primary Key"
                    />
                  </div>

                  {/* Auto Increment */}
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={col.autoIncrement}
                      onChange={(e) => updateColumn(col.id, 'autoIncrement', e.target.checked)}
                      disabled={!col.primaryKey || !isIntType(col.type)}
                      className="accent-emerald-600 w-4 h-4 cursor-pointer disabled:opacity-30"
                      title="Auto Increment (only for INT primary key)"
                    />
                  </div>

                  {/* Nullable */}
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={col.nullable}
                      onChange={(e) => updateColumn(col.id, 'nullable', e.target.checked)}
                      disabled={col.primaryKey}
                      className="accent-slate-600 w-4 h-4 cursor-pointer disabled:opacity-30"
                      title="Allow NULL"
                    />
                  </div>

                  <button
                    onClick={() => removeColumn(col.id)}
                    disabled={columns.length === 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-20 transition-colors"
                    title="Remove column"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SQL Preview toggle */}
          <div>
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {showPreview ? '▲ Hide' : '▼ Show'} SQL Preview
            </button>
            {showPreview && (
              <pre className="mt-2 bg-slate-900 text-emerald-400 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                {buildPreviewSQL(tableName, columns) || '-- Fill in table name and columns above'}
              </pre>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              <span className="flex-shrink-0">✕</span> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 font-medium text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Table size={14} /> Create Table (OTP Required)
          </button>
        </div>
      </div>
    </div>
  );
}

