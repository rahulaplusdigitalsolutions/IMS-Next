"use client";
import React from "react";
import Returns from "@/components/returns/Returns";
import { getStoredUser } from "@/lib/client/auth";

export default function ReturnsPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Returns currentUser={currentUser} />;
}
