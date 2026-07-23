"use client";
import React from "react";
import CompanyTransfer from "@/components/companyTransfer/CompanyTransfer";
import { getStoredUser } from "@/lib/client/auth";

export default function CompanyTransferPage() {
  let currentUser = null;
  if (typeof window !== "undefined") {
    currentUser = getStoredUser();
  }

  return <CompanyTransfer currentUser={currentUser} />;
}
