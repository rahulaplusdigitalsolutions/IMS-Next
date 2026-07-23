"use client";
import React from "react";
import ApiLogs from "@/components/apiLogs/ApiLogs";
import { getStoredUser } from "@/lib/client/auth";

export default function ApiLogsPage() {
  let currentUser = null;
  if (typeof window !== "undefined") {
    currentUser = getStoredUser();
  }

  return <ApiLogs currentUser={currentUser} />;
}
