"use client";
import React from "react";
import ProfilePage from "@/components/profile/ProfilePage";
import { getStoredUser } from "@/lib/client/auth";

export default function ProfileRoute() {
    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }
    
    return <ProfilePage currentUser={currentUser} />;
}
