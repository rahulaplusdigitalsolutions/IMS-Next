"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const MasterDropdown = ({ code, placeholder, value, onChange, className, disabled }) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const token = sessionStorage.getItem("pt_auth_token");
                const response = await axios.get(`${API_BASE_URL}/api/dropdown/${code}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                
                if (response.data.success) {
                    setOptions(response.data.data);
                }
            } catch (error) {
                console.error(`Error loading dropdown for ${code}:`, error);
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchOptions();
        }
    }, [code]);

    return (
        <select 
            className={className || "w-full border border-slate-200 p-2.5 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"} 
            value={value} 
            onChange={onChange}
            disabled={loading || disabled}
        >
            <option value="">{loading ? 'Loading...' : placeholder}</option>
            {options.map((opt, index) => (
                <option key={index} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
};

export default MasterDropdown;


