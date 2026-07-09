"use client";
import React from "react";
import Reports from "@/components/reports/Reports";
import { getStoredUser } from "@/lib/client/auth";

export default function ReportsPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Reports currentUser={currentUser} />;
}
