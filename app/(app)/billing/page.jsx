"use client";
import React, { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Billing from "@/components/billing/Billing";
import { getStoredUser } from "@/lib/client/auth";
import { useAppData } from "@/lib/client/AppDataContext";
import { printerService } from "@/lib/services/api";

export default function BillingPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    const { models, serials, dispatches, refreshData } = useAppData();
    const searchParams = useSearchParams();
    const initialDayFilter = searchParams.get("day") || "all";
    const initialCustomStart = searchParams.get("start") || "";
    const initialCustomEnd = searchParams.get("end") || "";

    const handleUpdate = useCallback(
        async (ids, updatedData) => {
            await printerService.updateDispatch(ids, updatedData);
            await refreshData();
        },
        [refreshData]
    );

    return (
        <Billing
            models={models}
            serials={serials}
            dispatches={dispatches}
            currentUser={currentUser}
            onUpdate={handleUpdate}
            onRefresh={refreshData}
            initialDayFilter={initialDayFilter}
            initialCustomStart={initialCustomStart}
            initialCustomEnd={initialCustomEnd}
        />
    );
}
