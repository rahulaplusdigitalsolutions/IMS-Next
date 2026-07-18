"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAppData } from "./AppDataContext";
import { setSession } from "./auth";
import api from "./apiClient";

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [activeCompany, setActiveCompany] = useState(null);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const { loadCoreData } = useAppData();

  useEffect(() => {
    // Attempt to load from localStorage on mount
    const userStr = typeof window !== "undefined" ? window.localStorage.getItem("pt_user") : null;
    const compsStr = typeof window !== "undefined" ? window.localStorage.getItem("pt_companies") : null;
    if (userStr && compsStr) {
      try {
        const user = JSON.parse(userStr);
        const comps = JSON.parse(compsStr);
        setAvailableCompanies(comps);
        const active = comps.find((c) => c.guid === user.companyId);
        if (active) setActiveCompany(active);
      } catch (err) {}
    }
  }, []);

  const switchCompany = async (companyGuid) => {
    try {
      const res = await api.post("/auth/switch-company", { companyGuid });
      const data = res.data;

      // Update session with new token and user
      setSession({ user: data.user, token: data.token });
      window.localStorage.setItem("pt_companies", JSON.stringify(availableCompanies));

      const newActive = availableCompanies.find(c => c.guid === companyGuid);
      if (newActive) setActiveCompany(newActive);

      // Refresh global app data for the new company scope
      loadCoreData();
    } catch (err) {
      console.error("Error switching company:", err);
      alert(err.response?.data?.message || err.message);
    }
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, availableCompanies, switchCompany, setAvailableCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
