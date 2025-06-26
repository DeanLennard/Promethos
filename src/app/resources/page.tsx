// src/app/resources/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface Resource {
    _id: string;
    name: string;
    role: string;
    dayRate: number;
    skillTags: string[];
    contact: string;
}

export default function ResourcesPage() {
    useAuthGuard();
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch("/api/resources", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setResources(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="p-8">Loading resources…</p>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Resources</h1>
                <Link
                    href="/resources/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    New Resource
                </Link>
            </div>
            <table className="w-full table-auto bg-white shadow-card rounded">
                <thead className="bg-primary-50">
                <tr>
                    {["Name", "Role", "Day Rate", "Skills", "Contact", "Actions"].map((h) => (
                        <th key={h} className="p-2 text-left text-neutral">
                            {h}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {resources.map((r) => (
                    <tr key={r._id} className="border-t">
                        <td className="p-2">{r.name}</td>
                        <td className="p-2">{r.role}</td>
                        <td className="p-2">£{r.dayRate.toFixed(2)}</td>
                        <td className="p-2">{r.skillTags.join(", ")}</td>
                        <td className="p-2">{r.contact}</td>
                        <td className="p-2">
                            <Link
                                href={`/resources/${r._id}`}
                                className="text-primary-600 hover:underline mr-2"
                            >
                                View
                            </Link>
                            <Link
                                href={`/resources/${r._id}/edit`}
                                className="text-accent-600 hover:underline"
                            >
                                Edit
                            </Link>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}
