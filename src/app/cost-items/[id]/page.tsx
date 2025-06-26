// src/app/cost-items/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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

interface Project { _id: string; name: string; code: string; }

export default function CostItemViewPage() {
    useAuthGuard();
    const { id } = useParams();
    const [item, setItem] = useState<CostItem | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`/api/cost-items/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then(async (data: CostItem) => {
                setItem(data);
                const p = await fetch(`/api/projects/${data.projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }).then((r) => r.json());
                setProject(p);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p className="p-8">Loading cost item…</p>;
    if (!item) return <p className="p-8">Cost item not found</p>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Cost Item Details</h1>
                <div>
                    <Link
                        href={`/cost-items/${id}/edit`}
                        className="px-4 py-2 bg-accent-600 text-white rounded hover:bg-accent-700 mr-2"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/cost-items"
                        className="px-4 py-2 bg-neutral-light text-white rounded hover:bg-neutral-dark"
                    >
                        Back
                    </Link>
                </div>
            </div>
            <div className="bg-white shadow-card rounded p-6 space-y-4">
                <p>
                    <strong>Project:</strong>{" "}
                    {project
                        ? `${project.name} (${project.code})`
                        : item.projectId}
                </p>
                <p>
                    <strong>Type:</strong> {item.type}
                </p>
                <p>
                    <strong>Description:</strong> {item.description}
                </p>
                <p>
                    <strong>Amount:</strong> £{item.amount.toFixed(2)}
                </p>
                <p>
                    <strong>Date Incurred:</strong>{" "}
                    {new Date(item.dateIncurred).toLocaleDateString()}
                </p>
                <p>
                    <strong>Vendor:</strong> {item.vendor || "—"}
                </p>
            </div>
        </div>
    );
}
