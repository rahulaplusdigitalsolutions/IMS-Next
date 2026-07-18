"use client";
import React from "react";
import NewDispatch from "@/components/newDispatch/NewDispatch";
import { getStoredUser } from "@/lib/client/auth";
import { useAppData } from "@/lib/client/AppDataContext";

export default function NewDispatchPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    const { models, serials, refreshData } = useAppData();

    return <NewDispatch models={models} serials={serials} currentUser={currentUser} onRefresh={refreshData} />;
}
