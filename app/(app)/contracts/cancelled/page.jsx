"use client";
import React from "react";
import ContractsList from "@/components/contracts/ContractsList";

export default function CancelledContractsPage() {
  return <ContractsList statusFilter="Cancelled" />;
}
