"use client";
import React from "react";
import Dispatch from "@/components/dispatch/Dispatch";
import { getStoredUser } from "@/lib/client/auth";

export default function DispatchPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Dispatch currentUser={currentUser} />;
}
