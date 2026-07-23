"use client";
import React from "react";
import FbfFbaMaster from "@/components/fbfFba/FbfFbaMaster";
import { getStoredUser } from "@/lib/client/auth";

export default function FbfFbaMasterPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }

    return <FbfFbaMaster isAdmin={currentUser?.role === "Admin"} currentUser={currentUser} />;
}
