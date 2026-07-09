"use client";
import React from "react";
import NewDispatch from "@/components/newDispatch/NewDispatch";
import { getStoredUser } from "@/lib/client/auth";

export default function NewDispatchPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <NewDispatch currentUser={currentUser} />;
}
