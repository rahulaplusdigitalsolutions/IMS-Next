"use client";
import React from "react";
import ContractsList from "@/components/contracts/ContractsList";

export default function ContractsPage() {
  return <ContractsList statusFilter="Active" />;
}
