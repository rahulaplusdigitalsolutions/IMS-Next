"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import Damaged from "@/components/damaged/Damaged";
import { getStoredUser } from "@/lib/client/auth";
import { useAppData } from "@/lib/client/AppDataContext";

export default function DamagedPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    const searchParams = useSearchParams();
    const initialDayFilter = searchParams.get("day") || "all";
    const initialCustomStart = searchParams.get("start") || "";
    const initialCustomEnd = searchParams.get("end") || "";
    const { returns, refreshData } = useAppData();

    return (
        <Damaged
            currentUser={currentUser}
            returns={returns}
            onRefresh={refreshData}
            initialDayFilter={initialDayFilter}
            initialCustomStart={initialCustomStart}
            initialCustomEnd={initialCustomEnd}
        />
    );
}
