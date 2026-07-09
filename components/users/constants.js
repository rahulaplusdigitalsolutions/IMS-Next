import {
  BarChart3, Printer, Barcode, ShieldCheck, Eye, ShoppingCart, Receipt, Package,
  Wrench, AlertOctagon, Tags, Layers, History, FileText, Bell, Shield, Database,
  Ruler, ArrowDownCircle, ArrowUpCircle, Plus, Truck, Settings2, Users,
} from "lucide-react";

export const PERMISSIONS_LIST = [
  { id: "dashboard",          label: "Dashboard",              icon: BarChart3 },
  { id: "print_models",       label: "Printer Models",         icon: Printer },
  { id: "print_serials",      label: "Printer Serials",        icon: Barcode },
  { id: "warranty",           label: "Warranty Certificates",  icon: ShieldCheck },
  { id: "print_models_view",  label: "View Printer Models",    icon: Eye },
  { id: "print_models_edit",  label: "Edit Printer Models",    icon: Printer },
  { id: "print_serials_view", label: "View Printer Serials",   icon: Eye },
  { id: "print_serials_edit", label: "Edit Printer Serials",   icon: Barcode },
  { id: "orders",             label: "Order Processing",       icon: ShoppingCart },
  { id: "create_order",       label: "Create Orders",          icon: ShoppingCart },
  { id: "billing",            label: "Billing",                icon: Receipt },
  { id: "dispatch",           label: "Dispatch",               icon: Package },
  { id: "stat_category",      label: "Category Master",        icon: Database },
  { id: "stat_brand",         label: "Brand Master",           icon: Tags },
  { id: "stat_vendor",        label: "Vendor Master",          icon: Users },
  { id: "stat_item",          label: "Item Master",            icon: Package },
  { id: "stat_combo",         label: "Combos Master",          icon: Layers },
  { id: "stat_mapping",       label: "Cate-Brand Mapping",     icon: FileText },
  { id: "stat_unit",          label: "Unit Master",            icon: Ruler },
  { id: "stat_stock_in",      label: "Stock-In",               icon: ArrowDownCircle },
  { id: "stat_stock_out",     label: "Stock-Out",              icon: ArrowUpCircle },
  { id: "stat_current_stock", label: "Current Stock",          icon: History },
  { id: "installation",       label: "Installation",           icon: Wrench },
  { id: "damage",             label: "Damage Records",         icon: AlertOctagon },
  { id: "returns",            label: "Returns",                icon: History },
  { id: "notifications",      label: "Notifications",          icon: Bell },
  { id: "users",              label: "User Management",        icon: Shield },
  { id: "reports",            label: "System Reports",         icon: FileText },
  { id: "godownMaster",       label: "Godown Master",          icon: Database },
  { id: "fbfFbaMaster",       label: "FBF/FBA Master",         icon: Database },
  { id: "fbfFbaManagement",   label: "FBF/FBA Stock",          icon: Database },
];

export const PERMISSION_GROUPS = [
  { name: "Sales & Orders",   icon: ShoppingCart, color: "indigo",  permissions: ["orders", "create_order", "billing", "dispatch", "installation", "stat_stock_out", "returns", "damage"] },
  { name: "Master Data",      icon: Database,     color: "violet",  permissions: ["stat_category", "stat_brand", "stat_vendor", "stat_item", "stat_combo", "stat_mapping", "stat_unit", "godownMaster", "fbfFbaMaster"] },
  { name: "Inventory",        icon: History,      color: "sky",     permissions: ["print_models", "print_serials", "warranty", "stat_stock_in", "stat_current_stock", "fbfFbaManagement"] },
  { name: "Admin & Analytics",icon: BarChart3,    color: "emerald", permissions: ["dashboard", "notifications", "users", "reports"] },
];

export const EDIT_PERMISSIONS = [
  { key: "allow_edit_models",           label: "Edit Printer Models",       icon: Printer,      group: "Printers" },
  { key: "allow_edit_serials",          label: "Edit Printer Serials",      icon: Barcode,      group: "Printers" },
  { key: "allow_edit_godown",           label: "Edit Godown Master",        icon: Database,     group: "Inventory" },
  { key: "allow_edit_fbf_fba",          label: "Edit FBF/FBA Master & Stock",icon: Database,    group: "Inventory" },
  { key: "allow_create_order",          label: "Create Orders",             icon: Plus,         group: "Orders" },
  { key: "allow_edit_order_processing", label: "Edit Orders",               icon: ShoppingCart, group: "Orders" },
  { key: "allow_edit_billing",          label: "Edit Billing",              icon: Receipt,      group: "Orders" },
  { key: "allow_edit_dispatch",         label: "Edit Dispatch",             icon: Truck,        group: "Orders" },
  { key: "allow_edit_installations",    label: "Edit Installations",        icon: Wrench,       group: "Operations" },
  { key: "allow_edit_returns",          label: "Edit Returns",              icon: History,      group: "Operations" },
  { key: "allow_edit_damaged",          label: "Edit Damaged",              icon: AlertOctagon, group: "Operations" },
  { key: "allow_edit_warranty",         label: "Edit Warranty Certificates",icon: Shield,       group: "Operations" },
];

export const DEFAULT_ROLE_PERMISSIONS = {
  Admin:      PERMISSIONS_LIST.map((p) => p.id),
  Supervisor: ["dashboard", "print_models", "print_serials", "warranty", "orders", "create_order", "dispatch", "installation", "notifications", "damage", "stat_current_stock", "stat_stock_in", "stat_stock_out", "returns", "reports"],
  Accountant: ["dashboard", "billing", "notifications", "reports", "stat_current_stock", "stat_stock_in", "stat_stock_out"],
  Operator:   ["dashboard", "orders", "create_order", "dispatch", "notifications", "stat_current_stock", "stat_stock_in", "stat_stock_out"],
  User:       ["dashboard", "print_models", "notifications", "stat_current_stock"],
};

export const INITIAL_FORM = {
  username: "", password: "", role: "User", fullName: "", email: "", phone: "",
  permissions: DEFAULT_ROLE_PERMISSIONS["User"],
  allow_edit_models: false, allow_edit_serials: false, allow_edit_godown: false,
  allow_create_order: false, allow_edit_order_processing: false, allow_edit_billing: false,
  allow_edit_dispatch: false, allow_edit_installations: false, allow_edit_damaged: false,
  allow_edit_returns: false, allow_edit_fbf_fba: false, allow_edit_warranty: false,
};

export const ROLE_CONFIG = {
  Admin:      { bg: "bg-indigo-100",  text: "text-indigo-700",  border: "border-indigo-200",  dot: "bg-indigo-500",  avatar: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  Supervisor: { bg: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500",     avatar: "bg-sky-100 text-sky-700 border-sky-300" },
  Accountant: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", avatar: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  User:       { bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500",   avatar: "bg-amber-100 text-amber-700 border-amber-300" },
  Operator:   { bg: "bg-violet-100",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500",  avatar: "bg-violet-100 text-violet-700 border-violet-300" },
};

export const GROUP_COLORS = {
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  icon: "text-indigo-500",  header: "bg-indigo-50 border-indigo-100",   checked: "bg-indigo-600 text-white",  checkedCard: "bg-indigo-50/80 border-indigo-200 text-indigo-900" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  icon: "text-violet-500",  header: "bg-violet-50 border-violet-100",   checked: "bg-violet-600 text-white",  checkedCard: "bg-violet-50/80 border-violet-200 text-violet-900" },
  sky:     { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     icon: "text-sky-500",     header: "bg-sky-50 border-sky-100",         checked: "bg-sky-600 text-white",     checkedCard: "bg-sky-50/80 border-sky-200 text-sky-900" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500", header: "bg-emerald-50 border-emerald-100", checked: "bg-emerald-600 text-white", checkedCard: "bg-emerald-50/80 border-emerald-200 text-emerald-900" },
};
