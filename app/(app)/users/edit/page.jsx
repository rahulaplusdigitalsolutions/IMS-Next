"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import UserFormPage from "@/components/users/UserFormPage";
import { getStoredUser } from "@/lib/client/auth";
import { printerService } from "@/lib/services/api";

function EditUserContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [editUser, setEditUser] = useState(null);
    const [loading, setLoading] = useState(true);

    let currentUser = null;
    if (typeof window !== "undefined") {
        currentUser = getStoredUser();
    }

    useEffect(() => {
        const fetchUser = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            try {
                const allUsers = await printerService.getUsers();
                const u = allUsers.find(u => String(u.id) === String(id));
                setEditUser(u || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-slate-500 font-medium">Loading user data...</div>;
    if (!editUser) return <div className="p-10 text-center text-rose-500 font-medium">User not found</div>;

    return <UserFormPage currentUser={currentUser} editUser={editUser} />;
}

export default function EditUserPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading...</div>}>
            <EditUserContent />
        </Suspense>
    );
}
