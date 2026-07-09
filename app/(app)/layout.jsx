"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, User, Loader2 } from "lucide-react";
import { getStoredUser, clearSession } from "@/lib/client/auth";
import { AppDataProvider, useAppData } from "@/lib/client/AppDataContext";
import Sidebar from "@/components/common/Sidebar";

// Minimal authenticated shell, ported from Frontend4/src/components/AdminLayout.jsx's
// auth-guard + top-level chrome. The full sidebar (35 nav items across
// Masters/Inventory/Order Processing/Returns groups) is being ported
// incrementally as each corresponding page lands — see [[ims-next-migration]].
function AppLayoutInner({ children, currentUser, handleLogout, router, pathname, isAdmin }) {
  const { loadCoreData } = useAppData();

  useEffect(() => {
    loadCoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden md:flex shrink-0">
        <Sidebar currentUser={currentUser} isAdmin={isAdmin} />
      </div>

      <main className="flex-1 overflow-auto flex flex-col">
        <div className="hidden md:flex items-center justify-end gap-3 px-6 py-2 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
              <User size={14} className="text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{currentUser.fullName || currentUser.username || "User"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAdmin ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"}`}>
              {currentUser.role || "User"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            Log Out
          </button>
        </div>
        <div className="max-w-full mx-auto p-4 md:p-6 w-full">{children}</div>
      </main>
    </div>
  );
}

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const userStr = typeof window !== "undefined" ? window.localStorage.getItem("pt_user") : null;
    if (!userStr) {
      router.replace("/login");
      return;
    }
    try {
      setCurrentUser(JSON.parse(userStr));
    } catch {
      clearSession();
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/login");
  };

  if (!checked || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const isAdmin = currentUser.role === "Admin" || currentUser.role === "SuperAdmin";

  return (
    <AppDataProvider>
      <AppLayoutInner
        currentUser={currentUser}
        handleLogout={handleLogout}
        router={router}
        pathname={pathname}
        isAdmin={isAdmin}
      >
        {children}
      </AppLayoutInner>
    </AppDataProvider>
  );
}
