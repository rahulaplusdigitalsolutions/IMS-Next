"use client";
import React from "react";
import Models from "@/components/models/Models";
import { useAppData } from "@/lib/client/AppDataContext";
import { getStoredUser } from "@/lib/client/auth";

export default function ModelsPage() {
    const { models, serials, refreshData } = useAppData();
    
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "SuperAdmin";
    const isUser = currentUser?.role === "User";

    return (
        <Models 
            models={models || []} 
            serials={serials || []} 
            onRefresh={refreshData} 
            isAdmin={isAdmin} 
            isUser={isUser} 
            currentUser={currentUser} 
        />
    );
}
