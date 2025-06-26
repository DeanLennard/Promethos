// src/app/projects/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface Project {
    _id: string;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    currency: string;
}

export default function ProjectsPage() {
    useAuthGuard();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        fetch('/api/projects', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    console.error('Failed to load projects:', data);
                    setProjects([]);
                } else if (Array.isArray(data)) {
                    setProjects(data);
                } else {
                    console.error('Unexpected projects payload:', data);
                    setProjects([]);
                }
            })
            .catch((err) => {
                console.error('Network error loading projects:', err);
                setProjects([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) return <p>Loading projects…</p>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Projects</h1>
                <Link
                    href="/projects/new"
                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    New Project
                </Link>
            </div>
            <table className="w-full table-auto bg-white shadow-card rounded">
                <thead className="bg-primary-50">
                <tr>
                    {['Name','Code','Start','End','Currency','Actions'].map((h) => (
                        <th key={h} className="p-2 text-left text-neutral">
                            {h}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {projects.map((p) => (
                    <tr key={p._id} className="border-t">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2">{p.code}</td>
                        <td className="p-2">{new Date(p.startDate).toLocaleDateString()}</td>
                        <td className="p-2">{new Date(p.endDate).toLocaleDateString()}</td>
                        <td className="p-2">{p.currency}</td>
                        <td className="p-2">
                            <Link href={`/projects/${p._id}`} className="text-primary-600 hover:underline mr-2">
                                View
                            </Link>
                            <Link href={`/projects/${p._id}/edit`} className="text-accent-600 hover:underline">
                                Edit
                            </Link>
                        </td>
                    </tr>
                ))}
                {projects.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-4 text-center text-neutral-500">
                            No projects found.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}
