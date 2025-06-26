// src/app/features/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";

interface Feature {
    _id: string;
    projectId: string;
    title: string;
    storyPoints: number;
    completedPoints: number;
    status: string;
}

interface Project {
    _id: string;
    name: string;
    code: string;
}

export default function FeaturesPage() {
    useAuthGuard();

    const [features, setFeatures] = useState<Feature[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        async function loadAll() {
            setLoading(true);
            try {
                const [fRes, pRes] = await Promise.all([
                    fetch("/api/features", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch("/api/projects", {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);
                const [fData, pData] = await Promise.all([fRes.json(), pRes.json()]);
                setFeatures(fData);
                setProjects(pData);
            } finally {
                setLoading(false);
            }
        }
        loadAll();
    }, []);

    if (loading) return <p className="p-8">Loading features…</p>;

    // Map projectId → project
    const projectMap: Record<string, Project> = Object.fromEntries(
        projects.map((p) => [p._id, p])
    );

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Features</h1>
                <Link
                    href="/features/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    New Feature
                </Link>
            </div>

            <table className="w-full table-auto bg-white shadow-card rounded">
                <thead className="bg-primary-50">
                <tr>
                    {["Title", "Project", "SP", "Done", "Status", "Actions"].map((h) => (
                        <th key={h} className="p-2 text-left text-neutral">
                            {h}
                        </th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {features.map((f) => {
                    const proj = projectMap[f.projectId];
                    const projectDisplay = proj
                        ? `${proj.name} (${proj.code})`
                        : f.projectId;

                    return (
                        <tr key={f._id} className="border-t">
                            <td className="p-2">{f.title}</td>
                            <td className="p-2">{projectDisplay}</td>
                            <td className="p-2">{f.storyPoints}</td>
                            <td className="p-2">{f.completedPoints}</td>
                            <td className="p-2">{f.status}</td>
                            <td className="p-2">
                                <Link
                                    href={`/features/${f._id}`}
                                    className="text-primary-600 hover:underline mr-2"
                                >
                                    View
                                </Link>
                                <Link
                                    href={`/features/${f._id}/edit`}
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
