// src/app/resources/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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

export default function ResourceViewPage() {
    useAuthGuard();
    const { id } = useParams();
    const [resource, setResource] = useState<Resource | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`/api/resources/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data: Resource) => setResource(data))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <p className="p-8">Loading resource…</p>;
    if (!resource) return <p className="p-8">Resource not found</p>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">{resource.name}</h1>
                <div>
                    <Link
                        href={`/resources/${id}/edit`}
                        className="px-4 py-2 bg-accent-600 text-white rounded hover:bg-accent-700 mr-2"
                    >
                        Edit
                    </Link>
                    <Link
                        href="/resources"
                        className="px-4 py-2 bg-neutral-light text-white rounded hover:bg-neutral-dark"
                    >
                        Back
                    </Link>
                </div>
            </div>
            <div className="bg-white shadow-card rounded p-6 space-y-4">
                <p>
                    <strong>Role:</strong> {resource.role}
                </p>
                <p>
                    <strong>Day Rate:</strong> £{resource.dayRate.toFixed(2)}
                </p>
                <p>
                    <strong>Skills:</strong> {resource.skillTags.join(", ")}
                </p>
                <p>
                    <strong>Contact:</strong> {resource.contact}
                </p>
            </div>
        </div>
    );
}
