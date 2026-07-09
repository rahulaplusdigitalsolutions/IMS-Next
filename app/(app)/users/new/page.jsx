"use client";
import React from "react";
import UserFormPage from "@/components/users/UserFormPage";
import { getStoredUser } from "@/lib/client/auth";

export default function NewUserPage() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <UserFormPage currentUser={currentUser} editUser={null} />;
}
