"use client";
import React from "react";
import Damaged from "@/components/damaged/Damaged";
import { getStoredUser } from "@/lib/client/auth";

export default function DamagedPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Damaged currentUser={currentUser} />;
}
