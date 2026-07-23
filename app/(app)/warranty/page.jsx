"use client";
import React from "react";
import WarrantyCertificate from "@/components/warranty/WarrantyCertificate";
import { getStoredUser } from "@/lib/client/auth";

export default function WarrantyPage() {
    const currentUser = typeof window !== "undefined" ? getStoredUser() : null;
    const isAdmin = currentUser?.role === "Admin";
    return <WarrantyCertificate isAdmin={isAdmin} currentUser={currentUser} />;
}
