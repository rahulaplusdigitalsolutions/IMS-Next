"use client";
import React from "react";
import OrderTracking from "@/components/orderTracking/OrderTracking";
import { getStoredUser } from "@/lib/client/auth";

export default function OrderTrackingPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <OrderTracking currentUser={currentUser} />;
}
