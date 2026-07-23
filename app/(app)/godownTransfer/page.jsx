"use client";
import React from "react";
import GodownTransfer from "@/components/godownTransfer/GodownTransfer";
import { getStoredUser } from "@/lib/client/auth";

export default function GodownTransferPage() {
  let currentUser = null;
  if (typeof window !== "undefined") {
    currentUser = getStoredUser();
  }

  return <GodownTransfer currentUser={currentUser} />;
}
