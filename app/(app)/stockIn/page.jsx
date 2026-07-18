"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import StockIn from "@/components/stockIn/StockIn";

export default function StockInPage() {
    const searchParams = useSearchParams();
    const initialDayFilter = searchParams.get("day") || "all";
    const initialCustomStart = searchParams.get("start") || "";
    const initialCustomEnd = searchParams.get("end") || "";
    return (
        <StockIn
            initialDayFilter={initialDayFilter}
            initialCustomStart={initialCustomStart}
            initialCustomEnd={initialCustomEnd}
        />
    );
}
