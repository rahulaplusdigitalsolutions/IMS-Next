"use client";
import React from "react";
import Billing from "@/components/billing/Billing";
import { getStoredUser } from "@/lib/client/auth";

export default function BillingPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Billing currentUser={currentUser} />;
}
