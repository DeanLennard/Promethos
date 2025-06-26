// src/app/allocations/page.tsx
"use client";

import { useState, useEffect } from "react";
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

interface Project {
    _id: string;
    name: string;
    code: string;
}

interface Resource {
    _id: string;
    name: string;
    role: string;
}

export default function AllocationsPage() {
    useAuthGuard();

    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        async function loadAll() {
            setLoading(true);
            try {
                const [allocRes, projRes, resRes] = await Promise.all([
                    fetch("/api/allocations", { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/projects",    { headers: { Authorization: `Bearer ${token}` } }),
                    fetch("/api/resources",   { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                const [allocData, projData, resData] = await Promise.all([
                    allocRes.json(),
                    projRes.json(),
                    resRes.json(),
                ]);
                setAllocations(allocData);
                setProjects(projData);
                setResources(resData);
            } finally {
                setLoading(false);
            }
        }
        loadAll();
    }, []);

    if (loading) return <p className="p-8">Loading allocations…</p>;

    // Build lookup maps
    const projectMap = Object.fromEntries(projects.map(p => [p._id, p]));
    const resourceMap = Object.fromEntries(resources.map(r => [r._id, r]));

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Allocations</h1>
                <Link
                    href="/allocations/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    New Allocation
                </Link>
            </div>
            <table className="w-full table-auto bg-white shadow-card rounded">
                <thead className="bg-primary-50">
                <tr>
                    {["Project","Resource","From","To","%","Planned","Actions"].map(h => (
                        <th key={h} className="p-2 text-left text-neutral">{h}</th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {allocations.map(a => {
                    const proj = projectMap[a.projectId];
                    const res  = resourceMap[a.resourceId];
                    return (
                        <tr key={a._id} className="border-t">
                            <td className="p-2">
                                {proj
                                    ? `${proj.name} (${proj.code})`
                                    : a.projectId}
                            </td>
                            <td className="p-2">
                                {res
                                    ? `${res.name} – ${res.role}`
                                    : a.resourceId}
                            </td>
                            <td className="p-2">{new Date(a.fromDate).toLocaleDateString()}</td>
                            <td className="p-2">{new Date(a.toDate).toLocaleDateString()}</td>
                            <td className="p-2">{a.allocationPct}%</td>
                            <td className="p-2">{a.plannedDays}</td>
                            <td className="p-2">
                                <Link href={`/allocations/${a._id}`} className="text-primary-600 hover:underline mr-2">
                                    View
                                </Link>
                                <Link href={`/allocations/${a._id}/edit`} className="text-accent-600 hover:underline">
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
