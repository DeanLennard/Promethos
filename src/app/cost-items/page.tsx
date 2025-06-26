// src/app/cost-items/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface CostItem {
    _id: string;
    projectId: string;
    type: string;
    description: string;
    amount: number;
    dateIncurred: string;
    vendor?: string;
}

interface Project {
    _id: string;
    name: string;
    code: string;
}

export default function CostItemsPage() {
    useAuthGuard();

    const [items, setItems] = useState<CostItem[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");

        async function loadData() {
            setLoading(true);
            try {
                const [ciRes, prRes] = await Promise.all([
                    fetch("/api/cost-items", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch("/api/projects", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);
                const [ciData, prData] = await Promise.all([
                    ciRes.json(),
                    prRes.json(),
                ]);
                setItems(ciData);
                setProjects(prData);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return <p className="p-8">Loading cost items…</p>;
    }

    // Build a quick lookup from projectId → project object
    const projectMap: Record<string, Project> = Object.fromEntries(
        projects.map((p) => [p._id, p])
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Cost Items</h1>
                <Link
                    href="/cost-items/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    New Cost Item
                </Link>
            </div>

            <table className="w-full table-auto bg-white shadow-card rounded">
                <thead className="bg-primary-50">
                <tr>
                    {["Project", "Type", "Desc", "Amount", "Date", "Vendor", "Actions"].map(
                        (h) => (
                            <th key={h} className="p-2 text-left text-neutral">
                                {h}
                            </th>
                        )
                    )}
                </tr>
                </thead>

                <tbody>
                {items.map((c) => {
                    const proj = projectMap[c.projectId];
                    return (
                        <tr key={c._id} className="border-t">
                            <td className="p-2">
                                {proj ? `${proj.name} (${proj.code})` : c.projectId}
                            </td>
                            <td className="p-2">{c.type}</td>
                            <td className="p-2">{c.description}</td>
                            <td className="p-2">£{c.amount.toFixed(2)}</td>
                            <td className="p-2">
                                {new Date(c.dateIncurred).toLocaleDateString()}
                            </td>
                            <td className="p-2">{c.vendor ?? "—"}</td>
                            <td className="p-2">
                                <Link
                                    href={`/cost-items/${c._id}`}
                                    className="text-primary-600 hover:underline mr-2"
                                >
                                    View
                                </Link>
                                <Link
                                    href={`/cost-items/${c._id}/edit`}
                                    className="text-accent-600 hover:underline"
                                >
                                    Edit
                                </Link>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
    );
}
