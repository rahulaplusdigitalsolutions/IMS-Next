"use client";
import React from "react";
import HelpChatWindow from "@/components/help/HelpChatWindow";

export default function HelpPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Help & Support</h1>
            <HelpChatWindow />
        </div>
    );
}
