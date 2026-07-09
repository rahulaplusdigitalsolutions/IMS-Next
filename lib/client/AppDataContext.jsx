"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { printerService } from "@/lib/services/api";

// Mirrors the core-data slice of Frontend4/src/components/AdminLayout.jsx's
// loadCoreData/loadOrdersData/loadInstallationData — kept in a context so any
// page under app/(app) can read models/serials/dispatches/returns without
// re-fetching. See [[ims-next-migration]].
const AppDataContext = createContext(null);

const getReturnsArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.returns)) return payload.returns;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export function AppDataProvider({ children }) {
  const [models, setModels] = useState([]);
  const [serials, setSerials] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [installations, setInstallations] = useState([]);
  const [installationStats, setInstallationStats] = useState(null);
  const [dataStatus, setDataStatus] = useState({
    models: false,
    serials: false,
    dispatches: false,
    returns: false,
    orders: false,
    installations: false,
    installationStats: false,
  });
  const [coreLoading, setCoreLoading] = useState(true);

  const markDataLoaded = useCallback((nextStatus) => {
    setDataStatus((prev) => ({ ...prev, ...nextStatus }));
  }, []);

  const loadCoreData = useCallback(async () => {
    const results = await Promise.allSettled([
      printerService.getModels(),
      printerService.getSerials(),
      printerService.getDispatches(true),
      printerService.getReturns(),
    ]);

    let hasFailure = false;
    const loadedKeys = {};

    if (results[0].status === "fulfilled") {
      setModels(Array.isArray(results[0].value) ? results[0].value : []);
      loadedKeys.models = true;
    } else {
      hasFailure = true;
      console.error("Failed to load models:", results[0].reason);
    }

    if (results[1].status === "fulfilled") {
      setSerials(Array.isArray(results[1].value) ? results[1].value : []);
      loadedKeys.serials = true;
    } else {
      hasFailure = true;
      console.error("Failed to load serials:", results[1].reason);
    }

    if (results[2].status === "fulfilled") {
      setDispatches(Array.isArray(results[2].value) ? results[2].value : []);
      loadedKeys.dispatches = true;
    } else {
      hasFailure = true;
      console.error("Failed to load dispatches:", results[2].reason);
    }

    if (results[3].status === "fulfilled") {
      setReturns(getReturnsArray(results[3].value));
      loadedKeys.returns = true;
    } else {
      hasFailure = true;
      console.error("Failed to load returns:", results[3].reason);
    }

    markDataLoaded(loadedKeys);
    setCoreLoading(false);
    return !hasFailure;
  }, [markDataLoaded]);

  const loadOrdersData = useCallback(async () => {
    try {
      const data = await printerService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
      markDataLoaded({ orders: true });
      return true;
    } catch (error) {
      console.error("Failed to load orders:", error);
      return false;
    }
  }, [markDataLoaded]);

  const loadInstallationData = useCallback(async () => {
    const results = await Promise.allSettled([
      printerService.getInstallations(),
      printerService.getInstallationStats(),
    ]);

    let hasFailure = false;
    const loadedKeys = {};

    if (results[0].status === "fulfilled") {
      setInstallations(Array.isArray(results[0].value) ? results[0].value : []);
      loadedKeys.installations = true;
    } else {
      hasFailure = true;
      console.error("Failed to load installations:", results[0].reason);
    }

    if (results[1].status === "fulfilled") {
      setInstallationStats(results[1].value || null);
      loadedKeys.installationStats = true;
    } else {
      hasFailure = true;
      console.error("Failed to load installation stats:", results[1].reason);
    }

    markDataLoaded(loadedKeys);
    return !hasFailure;
  }, [markDataLoaded]);

  const refreshData = useCallback(
    async ({ includeOrders = dataStatus.orders, includeInstallations = dataStatus.installations || dataStatus.installationStats } = {}) => {
      const tasks = [loadCoreData()];
      if (includeOrders) tasks.push(loadOrdersData());
      if (includeInstallations) tasks.push(loadInstallationData());
      await Promise.all(tasks);
    },
    [dataStatus.orders, dataStatus.installations, dataStatus.installationStats, loadCoreData, loadOrdersData, loadInstallationData]
  );

  const value = {
    models,
    serials,
    dispatches,
    returns,
    orders,
    installations,
    installationStats,
    dataStatus,
    coreLoading,
    loadCoreData,
    loadOrdersData,
    loadInstallationData,
    refreshData,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
