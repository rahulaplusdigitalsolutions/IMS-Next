"use client";
import React from "react";
import FbfFbaMaster from "@/components/fbfFba/FbfFbaMaster";
import { getStoredUser } from "@/lib/client/auth";

export default function FbfFbaPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "SuperAdmin";
    
    return <FbfFbaMaster currentUser={currentUser} isAdmin={isAdmin} />;
}
