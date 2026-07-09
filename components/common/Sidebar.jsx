"use client";
import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Printer,
  Barcode,
  Bell,
  Truck,
  RotateCcw,
  FileText,
  Receipt,
  Package, Tags, Ruler, Link2, Layers,
  Wrench,
  Users as UsersIcon,
  History,
  User,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  Warehouse,
  ChevronLeft as HideIcon,
  Settings,
  ShieldAlert,
  Mail,
  Box
} from "lucide-react";

export default function Sidebar({ currentUser, isAdmin }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});

  const activeTab = pathname.split("/")[1] || "dashboard";

  const toggleSubmenu = (menu) => {
    setExpandedMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const navItems = [
    // Masters
    { id: "categoryMaster", label: "Category Master", icon: Tags, group: "masters" },
    { id: "brandMaster", label: "Brand Master", icon: Barcode, group: "masters" },
    { id: "vendorMaster", label: "Vendor Master", icon: UsersIcon, group: "masters" },
    { id: "categoryBrandMapping", label: "Cate-Brand Mapping", icon: FileText, group: "masters" },
    { id: "unitMaster", label: "Unit Master", icon: Ruler, group: "masters" },
    { id: "itemMaster", label: "Item Master", icon: Package, group: "masters" },
    { id: "comboMaster", label: "Combos Master", icon: Layers, group: "masters" },
    { id: "godownMaster", label: "Godown Master", icon: Warehouse, group: "masters" },
    { id: "fbfFbaMaster", label: "FBF / FBA Master", icon: Layers, group: "masters" },

    // Inventory
    { id: "models", label: "Models", icon: Printer, group: "inventory" },
    { id: "serials", label: "Serials", icon: Barcode, group: "inventory" },
    { id: "warranty", label: "Warranty Certs", icon: ShieldAlert, group: "inventory" }, // Using ShieldAlert for ShieldCheck as fallback
    { id: "stockIn", label: "Stock In", icon: Truck, group: "inventory" },
    { id: "currentStock", label: "Current Stock", icon: Package, group: "inventory" },
    { id: "fbfFbaManagement", label: "FBF / FBA Stock", icon: Package, group: "inventory" },

    // Order Processing
    { id: "orderTracking", label: "Order Processing", icon: Package, group: "orders" },
    { id: "dispatch", label: " Dispatch", icon: Truck, group: "orders" },
    { id: "stockOut", label: "Stock Out", icon: Receipt, group: "orders" },

    // Operations
    { id: "returns", label: "Returns", icon: RotateCcw, group: "operations" },
    { id: "damaged", label: "Damaged", icon: Bell, group: "operations" }, // Using Bell or AlertOctagon if imported. Wait, I imported Bell.
    { id: "installations", label: "Installations", icon: Wrench, group: "operations", badgeColor: "orange" }, // Badge value can be passed if needed

    // Independent
    { id: "billing", label: "Billing", icon: Receipt },
  ];

  if (!isSidebarVisible) {
    return (
      <aside className="bg-white border-r flex flex-col items-center py-4 w-16 transition-all">
        <div className="flex flex-col items-center justify-center flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aplus.png" alt="Company Logo" className="h-8 w-auto object-contain mb-[-35px]" />
        </div>
        <button
          onClick={() => setIsSidebarVisible(true)}
          className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shadow-sm flex items-center justify-center bg-white mt-auto"
          title="Expand Menu"
        >
          <ChevronRight size={18} />
        </button>
      </aside>
    );
  }

  // Settings mode
  if (['users','userActivity','reports','profile','settings','notifications','warrantyEmail'].includes(activeTab)) {
    return (
      <aside className="bg-white border-r flex flex-col w-64 h-full shrink-0 animate-sidebar-in transition-all">
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex flex-col items-center justify-center flex-1">
            <img src="/aplus.png" alt="Company Logo" className="h-12 w-auto object-contain" />
          </div>
          <button onClick={() => setIsSidebarVisible(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 border border-slate-200 shadow-sm">
            <HideIcon size={18} />
          </button>
        </div>
        <div className="p-4 font-bold text-indigo-600 text-lg flex items-center gap-2">
          Inventory Management
        </div>
        <div className="px-4 py-3 flex items-center gap-2.5 border-b border-slate-100">
          <Settings size={18} className="text-indigo-600" />
          <span className="font-bold text-indigo-600 text-base">Settings</span>
        </div>
        <nav className="flex-1 px-2 py-2 flex flex-col overflow-y-auto gap-1">
          <button onClick={() => router.push('/profile')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <User size={18} /> <span>My Profile</span>
          </button>
          <button onClick={() => router.push('/users')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <UsersIcon size={18} /> <span>User Management</span>
          </button>
          <button onClick={() => router.push('/userActivity')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'userActivity' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <History size={18} /> <span>User Activity</span>
          </button>
          <button onClick={() => router.push('/reports')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <FileText size={18} /> <span>Reports</span>
          </button>
          <button onClick={() => router.push('/notifications')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Bell size={18} /> <span>Notifications</span>
          </button>
          <div className="flex-1" />
          <div className="border-t border-slate-100 pt-2">
            <button onClick={() => router.push('/')} className="w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
              <LayoutDashboard size={18} /> <span>Back to Dashboard</span>
            </button>
          </div>
        </nav>
      </aside>
    );
  }

  // Normal mode
  return (
    <aside className="bg-white border-r flex flex-col w-64 h-full shrink-0 transition-all">
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex flex-col items-center justify-center flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aplus.png" alt="Company Logo" className="h-12 w-auto object-contain" />
        </div>
        <button onClick={() => setIsSidebarVisible(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 border border-slate-200 shadow-sm">
          <HideIcon size={18} />
        </button>
      </div>
      <div className="p-4 font-bold text-indigo-600 text-lg">Inventory Management</div>
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto pb-4">
        <button
          onClick={() => router.push("/")}
          className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "dashboard" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        {/* MASTERS */}
        <div className="space-y-1">
          <button onClick={() => toggleSubmenu("masters")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100">
            <div className="flex items-center gap-3"><Package size={18} /><span>Masters</span></div>
            {expandedMenus.masters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expandedMenus.masters && (
            <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1">
              {navItems.filter(i => i.group === "masters").map(item => (
                <button key={item.id} onClick={() => router.push(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {item.icon && <item.icon size={14} />} <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INVENTORY */}
        <div className="space-y-1">
          <button onClick={() => toggleSubmenu("inventory")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100">
            <div className="flex items-center gap-3"><Warehouse size={18} /><span>Inventory</span></div>
            {expandedMenus.inventory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expandedMenus.inventory && (
            <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1">
              {navItems.filter(i => i.group === "inventory").map(item => (
                <button key={item.id} onClick={() => router.push(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {item.icon && <item.icon size={14} />} <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ORDER PROCESSING */}
        <div className="space-y-1">
          <button onClick={() => toggleSubmenu("orders")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100">
            <div className="flex items-center gap-3"><ShoppingCart size={18} /><span>Order Processing</span></div>
            {expandedMenus.orders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expandedMenus.orders && (
            <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1">
              {navItems.filter(i => i.group === "orders").map(item => (
                <button key={item.id} onClick={() => router.push(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {item.icon && <item.icon size={14} />} <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* OPERATIONS */}
        <div className="space-y-1">
          <button onClick={() => toggleSubmenu("operations")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100">
            <div className="flex items-center gap-3"><RotateCcw size={18} /><span>Returns & Damaged</span></div>
            {expandedMenus.operations ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {expandedMenus.operations && (
            <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1">
              {navItems.filter(i => i.group === "operations").map(item => (
                <button key={item.id} onClick={() => router.push(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {item.icon && <item.icon size={14} />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* BILLING */}
        <button onClick={() => router.push('/billing')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Receipt size={18} /> <span>Billing</span>
        </button>

        {/* SUPER ADMIN */}
        {currentUser?.role === "SuperAdmin" && (
          <button onClick={() => router.push('/superAdmin')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'superAdmin' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-100'}`}>
            <ShieldAlert size={18} /> <span>Super Admin</span>
          </button>
        )}

        {/* SETTINGS */}
        <button onClick={() => router.push('/profile')} className="w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100">
          <Settings size={18} /> <span>Settings</span>
        </button>

      </nav>
    </aside>
  );
}
