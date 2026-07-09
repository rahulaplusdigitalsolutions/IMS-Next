"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  Printer, Package, Truck, CheckCircle2, AlertTriangle, TrendingUp,
  RotateCcw, AlertOctagon, Search, X, Banknote, Coins,
  XCircle, Sparkles, ArrowUpRight, ArrowDownRight,
  FileText, Receipt, Warehouse, CalendarDays, Flame, ArrowDownCircle
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, differenceInDays } from "date-fns";
import { getStoredUser } from "@/lib/client/auth";
import { useAppData } from "@/lib/client/AppDataContext";
import { inventoryService } from "@/lib/services/inventoryService";

// Full port of Frontend4/src/components/dashboard/Dashboard.jsx. models/serials/
// dispatches/returns now come from AppDataContext (app/(app)/layout.jsx) instead
// of AdminLayout props; onNavigate maps tab ids to Next.js routes matching the
// route names AdminLayout used, so this keeps working as each page lands. See
// [[ims-next-migration]].

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const router = useRouter();
  const { models, serials, dispatches, returns } = useAppData();
  const currentUser = typeof window !== "undefined" ? getStoredUser() : null;
  const userRole = currentUser?.role || "User";
  const isAdmin = userRole === "Admin" || userRole === "SuperAdmin";
  const isSupervisor = userRole === "Supervisor";
  const isAccountant = userRole === "Accountant";

  const onNavigate = (tab) => router.push(`/${tab === "dashboard" ? "" : tab}`);
  const onOpenOrderDetails = (orderId) => {
    if (orderId === null || orderId === undefined || String(orderId).trim() === "") return;
    router.push(`/orderTracking?focus=${encodeURIComponent(String(orderId).trim())}`);
  };

  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stationeryStockValue, setStationeryStockValue] = useState(0);
  const [loadingStationery, setLoadingStationery] = useState(true);
  const [todayStockIn, setTodayStockIn] = useState(0);

  useEffect(() => {
    const fetchStationeryValue = async () => {
      try {
        const response = await inventoryService.getCurrentStock({ limit: 1 });
        setStationeryStockValue(Number(response.totalValue) || 0);
      } catch (error) {
        console.error("Failed to fetch stationery stock value:", error);
      } finally {
        setLoadingStationery(false);
      }
    };
    fetchStationeryValue();

    const today = new Date().toLocaleDateString("en-CA");
    inventoryService
      .getStockInList(1, today, today, 1, 1)
      .then((res) => setTodayStockIn(res?.total || 0))
      .catch(() => {});
  }, []);

  /* ================= CALCULATIONS ================= */
  const LOW_STOCK_THRESHOLD = 3;
  const damagedStock = serials.filter((s) => s.status === "Damaged").length;

  const activeDispatches = dispatches.filter((d) => !d.isDeleted);

  const pendingBillsGroups = {};
  activeDispatches.forEach((d) => {
    if (d.status === "Send for Billing") {
      const firm = String(d.firmName || "").trim();
      const customer = String(d.customerName || d.customer || "").trim();
      const bid = String(d.bidNumber || "").trim();
      const key = bid ? `${firm}__${bid}` : customer ? `${firm}__${customer}` : `single__${d.id}`;
      if (!pendingBillsGroups[key]) pendingBillsGroups[key] = [];
      pendingBillsGroups[key].push(d);
    }
  });

  const pendingBillsCount = Object.keys(pendingBillsGroups).length;
  let overdueBillsCount = 0;
  Object.values(pendingBillsGroups).forEach((group) => {
    const d = group[0];
    const refDate = new Date(d.updatedAt || d.dispatchDate || d.createdAt || new Date());
    if (differenceInDays(new Date(), refDate) >= 2) overdueBillsCount++;
  });

  const printerStockValue = serials
    .filter((s) => s.status === "Available")
    .reduce((sum, item) => sum + (Number(item.landingPrice) || 0), 0);

  const totalInventoryValue = printerStockValue + stationeryStockValue;

  const totalRevenue = activeDispatches.reduce((sum, item) => sum + (Number(item.sellingPrice) || 0), 0);

  const allModelsStock = models.map((m) => {
    const stockCount = serials.filter((s) => s.modelGuid === m.id && s.status === "Available").length;
    return { name: m.name, stock: stockCount };
  });

  const chartData = [...allModelsStock].sort((a, b) => b.stock - a.stock).slice(0, 10);

  const lowStockModels = allModelsStock.filter((m) => m.stock < LOW_STOCK_THRESHOLD);

  const showReports = isAdmin || isAccountant || isSupervisor;
  const showFinancials = isAdmin || isAccountant;

  const todayStr = new Date().toDateString();
  const todayDispatches = activeDispatches.filter((d) => new Date(d.dispatchDate || d.createdAt).toDateString() === todayStr).length;
  const todayReturns = returns.filter((r) => new Date(r.returnDate || r.createdAt).toDateString() === todayStr).length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDispatches = activeDispatches.filter((d) => new Date(d.dispatchDate || d.createdAt) >= thirtyDaysAgo);
  const modelDispatchCount = {};
  recentDispatches.forEach((d) => {
    const serial = serials.find((s) => (s.guid || s.id) === (d.serialGuid || d.serialNumberId));
    const model = serial ? models.find((m) => (m.guid || m.id) === serial.modelGuid) : null;
    const name = model?.name || d.modelName || null;
    if (name) modelDispatchCount[name] = (modelDispatchCount[name] || 0) + 1;
  });
  const topModels = Object.entries(modelDispatchCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const topModelsMax = topModels[0]?.count || 1;

  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString("en-IN", { month: "short" }) + " '" + String(d.getFullYear()).slice(2);
    const count = activeDispatches.filter((x) => {
      const xd = new Date(x.dispatchDate || x.createdAt);
      return xd.getMonth() === d.getMonth() && xd.getFullYear() === d.getFullYear();
    }).length;
    return { month: label, count };
  });

  const godownMap = {};
  serials
    .filter((s) => s.status === "Available")
    .forEach((s) => {
      const name = s.godownName || "Unassigned";
      godownMap[name] = (godownMap[name] || 0) + 1;
    });
  const godownData = Object.entries(godownMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  const godownTotal = godownData.reduce((s, x) => s + x.count, 0) || 1;
  const GODOWN_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  const handleAvailableStockClick = () => {
    Swal.fire({
      title: "View Stock",
      text: "Select a view to explore available inventory",
      icon: "question",
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Current Stock",
      denyButtonText: "Serials",
      confirmButtonColor: "#6366F1",
      denyButtonColor: "#10B981",
    }).then((result) => {
      if (result.isConfirmed) {
        onNavigate("currentStock");
      } else if (result.isDenied) {
        onNavigate("serials");
      }
    });
  };

  const handleDispatchClick = () => {
    Swal.fire({
      title: "Dispatch Options",
      text: "Choose between performing a new Stock Out or viewing Dispatch History",
      icon: "question",
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Stock Out",
      denyButtonText: "Dispatch",
      confirmButtonColor: "#F59E0B",
      denyButtonColor: "#EF4444",
    }).then((result) => {
      if (result.isConfirmed) {
        onNavigate("stockOut");
      } else if (result.isDenied) {
        onNavigate("dispatch");
      }
    });
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setGlobalSearch(query);

    if (!query.trim()) {
      setSearchResult(null);
      setShowModal(false);
      return;
    }

    const lowerQuery = query.toLowerCase();

    let foundSerial = serials.find((s) => s.value.toLowerCase() === lowerQuery);

    if (!foundSerial) {
      const foundDispatch = dispatches.find((d) => d.customerName && d.customerName.toLowerCase() === lowerQuery);
      if (foundDispatch) {
        foundSerial = serials.find((s) => (s.guid || s.id) === (foundDispatch.serialGuid || foundDispatch.serialNumberId));
      }
    }

    if (!foundSerial) {
      const foundDispatch = dispatches.find((d) => d.warranty && d.warranty.toLowerCase().includes(lowerQuery));
      if (foundDispatch) {
        foundSerial = serials.find((s) => (s.guid || s.id) === (foundDispatch.serialGuid || foundDispatch.serialNumberId));
      }
    }

    if (foundSerial) {
      const model = models.find((m) => (m.guid || m.id) === foundSerial.modelGuid);

      const dispatchInfo = dispatches
        .filter((d) => (d.serialGuid || d.serialNumberId) === (foundSerial.guid || foundSerial.id) && !d.isDeleted)
        .sort((a, b) => new Date(b.dispatchDate) - new Date(a.dispatchDate))[0];

      const cancelledDispatchInfo = dispatches
        .filter((d) => (d.serialGuid || d.serialNumberId) === (foundSerial.guid || foundSerial.id) && d.isDeleted)
        .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt))[0];

      const returnInfo = returns
        .filter((r) => r.serialGuid === foundSerial.id)
        .sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate))[0];

      setSearchResult({
        serial: foundSerial.value,
        model: model?.name || "Unknown",
        status: foundSerial.status,
        company: model?.company || "Unknown",
        dispatch: dispatchInfo,
        cancelledDispatch: cancelledDispatchInfo,
        returnRecord: returnInfo,
        landingPrice: foundSerial.landingPrice,
      });
      setShowModal(true);
    } else {
      setSearchResult(null);
      setShowModal(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-lg px-3 py-2 rounded-lg shadow-lg border border-slate-100">
          <p className="text-xs font-bold text-slate-800">{label}</p>
          <p className="text-sm font-bold text-indigo-600">{payload[0].value} units</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 relative">
      <div className="relative">
        <div className="absolute -top-4 -left-4 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Inventory Dashboard</h1>
          </div>

          <div className="relative w-full md:w-72 group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-white rounded-xl shadow-md border border-slate-200/50 overflow-hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                placeholder="Search Serial or Order ID..."
                value={globalSearch}
                onChange={handleSearchChange}
              />
              {globalSearch && (
                <button
                  onClick={() => {
                    setGlobalSearch("");
                    setShowModal(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg px-3 py-2 border border-indigo-100 shadow-sm flex items-center gap-3">
          <CalendarDays size={18} className="text-indigo-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Today's Date</p>
            <p className="text-sm font-extrabold text-indigo-700 leading-tight">
              {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <div
          className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg px-3 py-2 border border-amber-100 shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-3"
          onClick={() => onNavigate("dispatch")}
        >
          <Truck size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Dispatched Today</p>
            <p className="text-lg font-extrabold text-amber-700 leading-tight">{todayDispatches}</p>
          </div>
        </div>
        <div
          className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg px-3 py-2 border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-3"
          onClick={() => onNavigate("returns")}
        >
          <RotateCcw size={18} className="text-orange-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Returns Today</p>
            <p className="text-lg font-extrabold text-orange-700 leading-tight">{todayReturns}</p>
          </div>
        </div>
        <div
          className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg px-3 py-2 border border-emerald-100 shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-3"
          onClick={() => onNavigate("stockIn")}
        >
          <ArrowDownCircle size={18} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Stock In Today</p>
            <p className="text-lg font-extrabold text-emerald-700 leading-tight">{todayStockIn}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigate("models")}
          className="group relative bg-white rounded-xl px-3 py-2.5 border border-slate-200/60 shadow-sm hover:shadow-md hover:shadow-indigo-500/10 transition-all cursor-pointer overflow-hidden flex items-center gap-3"
        >
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm shadow-indigo-500/30 shrink-0">
            <Printer size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Printer Models</p>
            <h3 className="text-lg font-extrabold text-slate-800 leading-tight">{models.length}</h3>
          </div>
          <ArrowUpRight size={13} className="text-slate-300 group-hover:text-indigo-500 shrink-0 transition-all" />
        </div>

        <div
          onClick={handleAvailableStockClick}
          className="group relative bg-white rounded-xl px-3 py-2.5 border border-slate-200/60 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all cursor-pointer overflow-hidden flex items-center gap-3"
        >
          <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-sm shadow-emerald-500/30 shrink-0">
            <Package size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Available Stock</p>
            <h3 className="text-base font-extrabold text-slate-800 leading-tight">View Details</h3>
          </div>
          <ArrowUpRight size={13} className="text-slate-300 group-hover:text-emerald-500 shrink-0 transition-all" />
        </div>

        <div
          onClick={handleDispatchClick}
          className="group relative bg-white rounded-xl px-3 py-2.5 border border-slate-200/60 shadow-sm hover:shadow-md hover:shadow-amber-500/10 transition-all cursor-pointer overflow-hidden flex items-center gap-3"
        >
          <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg shadow-sm shadow-amber-500/30 shrink-0">
            <Truck size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Dispatches</p>
            <h3 className="text-base font-extrabold text-slate-800 leading-tight">Manage</h3>
            <p className="text-[9px] text-slate-400">Stock Out / History</p>
          </div>
          <ArrowUpRight size={13} className="text-slate-300 group-hover:text-amber-500 shrink-0 transition-all" />
        </div>

        <div
          onClick={() => onNavigate("returns")}
          className="group relative bg-white rounded-xl px-3 py-2.5 border border-slate-200/60 shadow-sm hover:shadow-md hover:shadow-orange-500/10 transition-all cursor-pointer overflow-hidden flex items-center gap-3"
        >
          <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-sm shadow-orange-500/30 shrink-0">
            <RotateCcw size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Returned</p>
            <h3 className="text-lg font-extrabold text-slate-800 leading-tight">{returns.length}</h3>
          </div>
          <ArrowUpRight size={13} className="text-slate-300 group-hover:text-orange-500 shrink-0 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigate("damaged")}
          className="group relative bg-gradient-to-br from-red-50 to-rose-50 rounded-xl px-3 py-2.5 border border-red-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-sm shadow-red-500/30 shrink-0">
            <AlertOctagon size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Damaged</p>
            <h3 className="text-lg font-extrabold text-red-600 leading-tight">{damagedStock}</h3>
          </div>
          <ArrowUpRight size={13} className="text-red-200 group-hover:text-red-500 shrink-0 transition-all" />
        </div>

        {showReports && (
          <div
            onClick={() => onNavigate("reports")}
            className="group relative bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl px-3 py-2.5 border border-violet-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="p-1.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg shadow-sm shadow-violet-500/30 shrink-0">
              <FileText size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide">Reports & Analytics</p>
              <h3 className="text-base font-extrabold text-violet-700 leading-tight">View Stats</h3>
            </div>
            <ArrowUpRight size={13} className="text-violet-200 group-hover:text-violet-500 shrink-0 transition-all" />
          </div>
        )}

        {showReports && (
          <div
            onClick={() => onNavigate("billing")}
            className="group relative bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl px-3 py-2.5 border border-cyan-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-sm shadow-cyan-500/30 shrink-0">
              <Receipt size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-cyan-500 uppercase tracking-wide">Pending Bills</p>
              <h3 className="text-lg font-extrabold text-cyan-700 leading-tight">{pendingBillsCount}</h3>
            </div>
            <ArrowUpRight size={13} className="text-cyan-200 group-hover:text-cyan-500 shrink-0 transition-all" />
          </div>
        )}

        {showReports && (
          <div
            onClick={() => onNavigate("billing")}
            className="group relative bg-gradient-to-br from-orange-50 to-red-50 rounded-xl px-3 py-2.5 border border-orange-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
          >
            <div className="relative shrink-0">
              <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-sm shadow-orange-500/30">
                <AlertTriangle size={14} className="text-white" />
              </div>
              {overdueBillsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">Overdue Bills</p>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-lg font-extrabold text-orange-700 leading-tight">{overdueBillsCount}</h3>
                <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">&gt; 2 Days</span>
              </div>
            </div>
            <ArrowUpRight size={13} className="text-orange-200 group-hover:text-orange-500 shrink-0 transition-all" />
          </div>
        )}

        {showFinancials ? (
          <>
            <div
              onClick={() => setShowStockModal(true)}
              className="group relative bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl px-3 py-2.5 border border-emerald-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-sm shadow-emerald-500/30 shrink-0">
                <Banknote size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Total Stock Value</p>
                <h3 className="text-base font-extrabold text-emerald-700 leading-tight">₹{totalInventoryValue.toLocaleString("en-IN")}</h3>
                <p className="text-[9px] text-emerald-400 font-medium">Click for breakdown</p>
              </div>
              <ArrowUpRight size={13} className="text-emerald-300 group-hover:text-emerald-500 shrink-0 transition-all" />
            </div>

            <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl px-3 py-2.5 border border-blue-100 shadow-sm flex items-center gap-3">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm shadow-blue-500/30 shrink-0">
                <Coins size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Total Revenue</p>
                <h3 className="text-base font-extrabold text-blue-700 leading-tight">₹{totalRevenue.toLocaleString("en-IN")}</h3>
              </div>
              <div className="flex items-center gap-0.5 text-emerald-500 shrink-0">
                <TrendingUp size={11} />
                <span className="text-[9px] font-bold">Active</span>
              </div>
            </div>
          </>
        ) : (
          <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl px-3 py-2.5 border border-blue-100 shadow-sm col-span-2 md:col-span-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm shadow-blue-500/30 shrink-0">
                <CheckCircle2 size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">System Health</p>
                <h3 className="text-base font-extrabold text-blue-700">All Systems Operational</h3>
              </div>
            </div>
            <span className="text-xl font-black text-emerald-500">100%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <TrendingUp size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Stock Distribution</h3>
                  <p className="text-[10px] text-slate-400">Available stock by model</p>
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{models.length} Models</span>
            </div>
          </div>

          <div className="p-4">
            {chartData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                <Package size={36} className="mb-2 text-slate-300" />
                <p className="text-sm font-medium">No inventory data</p>
                <p className="text-xs text-slate-400">Add models to see chart</p>
              </div>
            ) : (
              <div style={{ width: "100%", minWidth: 0, height: 250, minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <defs>
                      {COLORS.map((color, index) => (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: "#64748b", fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="stock" radius={[6, 6, 0, 0]} barSize={35}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#gradient-${index % COLORS.length})`}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${lowStockModels.length > 0 ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-emerald-500 to-green-600"}`}>
                <AlertTriangle size={14} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Stock Health</h3>
                <p className="text-[10px] text-slate-400">Low stock alerts</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-80 custom-scrollbar">
            {lowStockModels.length > 0 ? (
              <div className="space-y-2">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 shadow-md shadow-red-500/25">
                  <AlertTriangle size={14} />
                  <div>
                    <p className="font-bold text-xs">{lowStockModels.length} Model(s) Low</p>
                    <p className="text-[10px] text-white/80">Stock &lt; {LOW_STOCK_THRESHOLD}</p>
                  </div>
                </div>

                {lowStockModels.map((model, index) => (
                  <div key={index} className="flex justify-between items-center p-2.5 bg-gradient-to-r from-slate-50 to-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500">
                        <Printer size={14} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[80px]">{model.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowDownRight size={12} className="text-red-500" />
                      <span className="text-sm font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">{model.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 size={28} className="text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-emerald-700">All Healthy!</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Sufficient stock levels</p>
                <div className="mt-2 px-2 py-1 bg-emerald-50 rounded-full">
                  <span className="text-[9px] font-semibold text-emerald-600">Min: {LOW_STOCK_THRESHOLD} units</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <TrendingUp size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Monthly Trend</h3>
              <p className="text-[10px] text-slate-400">Dispatches — last 6 months</p>
            </div>
          </div>
          <div className="p-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} name="Dispatches" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
              <Flame size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Top Models</h3>
              <p className="text-[10px] text-slate-400">Fast-moving — last 30 days</p>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {topModels.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">No dispatches in last 30 days</div>
            ) : (
              topModels.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`text-[10px] font-black w-5 text-center rounded ${i === 0 ? "text-amber-600" : "text-slate-400"}`}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">{m.name}</span>
                      <span className="text-xs font-extrabold text-indigo-600 ml-2">{m.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${(m.count / topModelsMax) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <Warehouse size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Godown Stock</h3>
              <p className="text-[10px] text-slate-400">Available units by location</p>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {godownData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-xs">No available stock</div>
            ) : (
              godownData.map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: GODOWN_COLORS[i % GODOWN_COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">{g.name}</span>
                      <span className="text-xs font-extrabold text-slate-600 ml-2">
                        {g.count} <span className="text-slate-400 font-normal">({Math.round((g.count / godownTotal) * 100)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(g.count / godownTotal) * 100}%`, background: GODOWN_COLORS[i % GODOWN_COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="pt-1 border-t border-slate-100 flex justify-between text-[10px] font-bold text-slate-400">
              <span>Total Available</span>
              <span>{godownTotal} units</span>
            </div>
          </div>
        </div>
      </div>

      {showModal && searchResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

              <div className="relative flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider mb-0.5">Serial Number</p>
                  <h3 className="text-lg font-extrabold text-white tracking-wide">#{searchResult.serial}</h3>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setGlobalSearch("");
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-center">
                <span
                  className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 ${
                    searchResult.status === "Available"
                      ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200"
                      : searchResult.status === "Damaged"
                        ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200"
                        : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {searchResult.status === "Available" && <CheckCircle2 size={14} />}
                  {searchResult.status === "Damaged" && <AlertOctagon size={14} />}
                  {searchResult.status === "Dispatched" && <Truck size={14} />}
                  {searchResult.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Model</p>
                  <p className="text-sm font-bold text-slate-700 truncate" title={searchResult.model}>
                    {searchResult.model}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Company</p>
                  <p className="text-sm font-bold text-slate-700">{searchResult.company}</p>
                </div>
              </div>

              {showFinancials && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-3 rounded-xl border border-emerald-200 text-center">
                  <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-wider mb-0.5">Landing Price</p>
                  <p className="text-xl font-extrabold text-emerald-700">₹{searchResult.landingPrice?.toLocaleString("en-IN") || 0}</p>
                </div>
              )}

              {searchResult.status === "Dispatched" && searchResult.dispatch && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 relative">
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">DISPATCHED</div>
                  <h4 className="text-[10px] font-bold text-blue-600 uppercase mb-3 flex items-center gap-1.5">
                    <Truck size={14} /> Shipment Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-blue-100">
                      <span className="text-slate-500">Platform</span>
                      <span className="font-semibold text-slate-700">{searchResult.dispatch.firmName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-blue-100">
                      <span className="text-slate-500">Order ID</span>
                      <span className="font-semibold text-slate-700">{searchResult.dispatch.customerName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-blue-100">
                      <span className="text-slate-500">Date</span>
                      <span className="font-semibold text-slate-700">{format(new Date(searchResult.dispatch.dispatchDate), "dd MMM yyyy")}</span>
                    </div>
                    {showFinancials && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Selling Price</span>
                        <span className="text-base font-extrabold text-emerald-600">₹{searchResult.dispatch.sellingPrice?.toLocaleString("en-IN") || 0}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onOpenOrderDetails(searchResult.dispatch.customerName);
                      setShowModal(false);
                      setGlobalSearch("");
                    }}
                    className="mt-3 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Truck size={16} /> View Full Order
                  </button>
                </div>
              )}

              {searchResult.cancelledDispatch && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 relative">
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">CANCELLED</div>
                  <h4 className="text-[10px] font-bold text-red-600 uppercase mb-3 flex items-center gap-1.5">
                    <XCircle size={14} /> Cancelled Dispatch
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-red-100">
                      <span className="text-slate-500">Platform</span>
                      <span className="font-semibold text-slate-400 line-through">{searchResult.cancelledDispatch.firmName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-red-100">
                      <span className="text-slate-500">Order ID</span>
                      <span className="font-semibold text-slate-400 line-through">{searchResult.cancelledDispatch.customerName}</span>
                    </div>
                    <div className="py-1.5 border-b border-red-100">
                      <span className="text-slate-500 block mb-0.5">Reason</span>
                      <span className="font-semibold text-red-600">{searchResult.cancelledDispatch.cancellationReason || "N/A"}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Cancelled On</span>
                      <span className="font-semibold text-slate-600">
                        {searchResult.cancelledDispatch.cancelledAt ? format(new Date(searchResult.cancelledDispatch.cancelledAt), "dd MMM yyyy") : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(searchResult.status === "Available" || searchResult.status === "Damaged") && searchResult.returnRecord && (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 relative">
                  <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">RETURNED</div>
                  <h4 className="text-[10px] font-bold text-orange-600 uppercase mb-3 flex items-center gap-1.5">
                    <RotateCcw size={14} /> Return History
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-orange-100">
                      <span className="text-slate-500">From</span>
                      <span className="font-semibold text-slate-700">{searchResult.returnRecord.firmName}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-orange-100">
                      <span className="text-slate-500">Date</span>
                      <span className="font-semibold text-slate-700">{format(new Date(searchResult.returnRecord.returnDate), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Condition</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          searchResult.returnRecord.condition === "Damaged" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        }`}
                      >
                        {searchResult.returnRecord.condition}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t">
              <button
                onClick={() => {
                  setShowModal(false);
                  setGlobalSearch("");
                }}
                className="w-full py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold rounded-xl hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg active:scale-[0.98]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Stock Valuation</h3>
                  <p className="text-emerald-100 text-xs font-medium opacity-80">Inventory Assets Breakdown</p>
                </div>
                <button onClick={() => setShowStockModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assets Value</p>
                <p className="text-3xl font-black text-slate-800">₹{totalInventoryValue.toLocaleString("en-IN")}</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Printer size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-700">Printer Stock</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Serialized Items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-indigo-600">₹{printerStockValue.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] font-bold text-slate-400">{((printerStockValue / (totalInventoryValue || 1)) * 100).toFixed(1)}% of total</p>
                  </div>
                </div>

                <div className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-700">Stationery Stock</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Non-Serialized Items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600">{loadingStationery ? "Loading..." : `₹${stationeryStockValue.toLocaleString("en-IN")}`}</p>
                    <p className="text-[10px] font-bold text-slate-400">{((stationeryStockValue / (totalInventoryValue || 1)) * 100).toFixed(1)}% of total</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-600">
                <Sparkles size={16} className="shrink-0" />
                <p className="text-[10px] font-medium leading-relaxed">
                  Printer stock includes all serialized units in "Available" status. Stationery includes all consumables and other items managed by quantity.
                </p>
              </div>
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={() => setShowStockModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #c7d2fe, #a5b4fc);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
