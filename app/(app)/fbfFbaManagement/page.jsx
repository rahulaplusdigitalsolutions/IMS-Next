"use client";
import React from "react";
import FbfFbaManagement from "@/components/fbfFba/FbfFbaManagement";
import { getStoredUser } from "@/lib/client/auth";

export default function FbfFbaManagementPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }

    return <FbfFbaManagement isAdmin={currentUser?.role === "Admin"} currentUser={currentUser} />;
}
