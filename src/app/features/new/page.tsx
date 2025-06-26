// src/app/features/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    projectId: string;
    title: string;
    description: string;
    storyPoints: number;
    status: "backlog" | "in-progress" | "done" | "cancelled";
    sprintIds:          string[];
};

interface Project {
    _id: string;
    name: string;
    code: string;
}

interface Sprint {
    _id: string;
    name: string;
}

export default function NewFeaturePage() {
    useAuthGuard();
    const search = useSearchParams();
    const preProjectId = search?.get("projectId") || "";
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [sprints,  setSprints]  = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>();

    const watchedProject = watch("projectId");

    // load projects for the dropdown
    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch("/api/projects", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data: Project[]) => setProjects(data))
            .finally(() => setLoading(false));
    }, []);

    // once projects are loaded, if we have a preProjectId, set the form value
    useEffect(() => {
        if (preProjectId && projects.length) {
            const p = projects.find(p => p._id === preProjectId);
            if (p) {
                // show the human label, not the raw id
                setValue("projectId", `${p.name} (${p.code})`);
            }
        }
    }, [preProjectId, projects, setValue]);

    useEffect(() => {
        // resolve our projectId label into a real _id
        let actualProjectId = watchedProject;

        // if it looks like “Name (CODE)”, find its _id
        if (actualProjectId && !/^[0-9a-f]{24}$/.test(actualProjectId)) {
            const match = projects.find(
                p => `${p.name} (${p.code})` === actualProjectId
            );
            if (match) actualProjectId = match._id;
        }

        if (!actualProjectId) return;

        const token = localStorage.getItem("token");
        fetch(`/api/sprints?projectId=${actualProjectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then((json: unknown) => {
                // local helper to guard for `{ data?: Sprint[] }`
                type MaybeData = { data?: Sprint[] };
                const arr = Array.isArray(json)
                    ? json as Sprint[]
                    : Array.isArray((json as MaybeData).data)
                        ? (json as MaybeData).data!
                        : [];
                setSprints(arr);
            });
    }, [projects, watchedProject]);

    const onSubmit = async (data: FormData) => {
        let projectId = data.projectId;

        // if user typed a label instead of an _id, resolve it
        if (!/^[0-9a-f]{24}$/.test(projectId)) {
            const typed = projects.find(p => `${p.name} (${p.code})` === projectId);
            if (!typed) {
                return alert("Please select a valid project from the list");
            }
            projectId = typed._id;
        }

        const payload = {
            projectId,
            title: data.title,
            description: data.description,
            storyPoints: data.storyPoints,
            completedPoints: 0,
            sprintIds: [],       // no sprint assignment at creation
            status: data.status,
        };

        const token = localStorage.getItem("token");
        const res = await fetch("/api/features", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            router.push("/features");
        } else {
            const err = await res.json();
            console.error("Feature create error:", err);
            alert("Error creating feature – see console");
        }
    };

    if (loading) {
        return <p className="p-8">Loading projects…</p>;
    }

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">New Feature</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Project searchable dropdown */}
                <div>
                    <label className="block text-neutral mb-1">Project</label>
                    <input
                        list="projects-list"
                        {...register("projectId", { required: "Project is required" })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Select or type project…"
                    />
                    <datalist id="projects-list">
                        {projects.map(p => (
                            <option key={p._id} value={`${p.name} (${p.code})`} />
                        ))}
                    </datalist>
                    {errors.projectId && <p className="text-red-600 text-sm mt-1">{errors.projectId.message}</p>}
                </div>

                {/* Title */}
                <div>
                    <label className="block text-neutral mb-1">Title</label>
                    <input
                        type="text"
                        {...register("title", { required: "Title is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.title && (
                        <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-neutral mb-1">Description</label>
                    <input
                        type="text"
                        {...register("description", {
                            required: "Description is required",
                        })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.description && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.description.message}
                        </p>
                    )}
                </div>

                {/* Story Points */}
                <div>
                    <label className="block text-neutral mb-1">Story Points</label>
                    <input
                        type="number"
                        {...register("storyPoints", {
                            required: "Story points are required",
                            valueAsNumber: true,
                            min: { value: 0, message: "Must be ≥ 0" },
                        })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.storyPoints && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.storyPoints.message}
                        </p>
                    )}
                </div>

                {/* Status */}
                <div>
                    <label className="block text-neutral mb-1">Status</label>
                    <select
                        {...register("status", { required: "Status is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    >
                        <option value="">Select status…</option>
                        <option value="backlog">Backlog</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    {errors.status && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.status.message}
                        </p>
                    )}
                </div>

                {/* Sprint multi-select */}
                <div>
                    <label className="block text-neutral mb-1">Assign to sprints</label>
                    <select
                        multiple
                        {...register("sprintIds")}
                        className="w-full border rounded px-3 py-2"
                        size={Math.min(5, sprints.length)} // show multiple rows
                    >
                        {sprints.map((s) => (
                            <option key={s._id} value={s._id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-neutral mt-1">
                        (hold ⌘/Ctrl to select multiple)
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Saving…" : "Create Feature"}
                </button>
            </form>
        </div>
    );
}
