"use client";
import React from "react";
import Users from "@/components/users/Users";
import { getStoredUser } from "@/lib/client/auth";

export default function UsersPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <Users currentUser={currentUser} />;
}
