"use client";
import React from "react";
import GodownMaster from "@/components/godownMaster/GodownMaster";
import { getStoredUser } from "@/lib/client/auth";

export default function GodownsPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <GodownMaster currentUser={currentUser} />;
}
