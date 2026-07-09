"use client";
import React from "react";
import Installations from "@/components/installations/Installations";
import { getStoredUser } from "@/lib/client/auth";

export default function InstallationsPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Installations currentUser={currentUser} />;
}
