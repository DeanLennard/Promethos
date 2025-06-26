// src/app/allocations/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface Allocation {
    _id: string;
    projectId: string;
    resourceId: string;
    fromDate: string;
    toDate: string;
    allocationPct: number;
    plannedDays: number;
}

interface Project { _id: string; name: string; code: string; }
interface Resource { _id: string; name: string; role: string; }

export default function AllocationViewPage() {
    useAuthGuard();
    const { id } = useParams();
    const [alloc, setAlloc] = useState<Allocation | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [resource, setResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`/api/allocations/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then(async (data: Allocation) => {
                setAlloc(data);
                const [p, rsc] = await Promise.all([
                    fetch(`/api/projects/${data.projectId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }).then((r) => r.json()),
                    fetch(`/api/resources/${data.resourceId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    }).then((r) => r.json()),
                ]);
                setProject(p);
                setResource(rsc);
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p className="p-8">Loading allocation…</p>;
    if (!alloc) return <p className="p-8">Allocation not found</p>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Allocation Details</h1>
                <div>
                    <Link
                        href={`/allocations/${id}/edit`}
                        className="px-4 py-2 bg-accent-600 text-white rounded hover:bg-accent-700 mr-2"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/allocations"
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
                        : alloc.projectId}
                </p>
                <p>
                    <strong>Resource:</strong>{" "}
                    {resource
                        ? `${resource.name} – ${resource.role}`
                        : alloc.resourceId}
                </p>
                <p>
                    <strong>From:</strong>{" "}
                    {new Date(alloc.fromDate).toLocaleDateString()}
                </p>
                <p>
                    <strong>To:</strong>{" "}
                    {new Date(alloc.toDate).toLocaleDateString()}
                </p>
                <p>
                    <strong>Allocation %:</strong> {alloc.allocationPct}%
                </p>
                <p>
                    <strong>Planned Days:</strong> {alloc.plannedDays}
                </p>
            </div>
        </div>
    );
}
