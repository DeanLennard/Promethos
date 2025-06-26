// src/app/features/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    projectId: string;
    title: string;
    description: string;
    storyPoints: number;
    completedPoints: number;
    status: "backlog" | "in-progress" | "done" | "cancelled";
    sprintIds:          string[];
};

interface Project { _id: string; name: string; code: string }

interface Sprint {
    _id: string;
    name: string;
}

export default function EditFeaturePage() {
    useAuthGuard();
    const { id } = useParams();
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [sprints,  setSprints]  = useState<Sprint[]>([]);
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { isSubmitting },
    } = useForm<FormData>({
        defaultValues: {
            sprintIds: [],  // default to empty
        }
    });

    const watchedProject = watch("projectId");

    useEffect(() => {
        const token = localStorage.getItem("token");
        Promise.all([
            fetch(`/api/features/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch("/api/projects",    { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([feature, projList]) => {
            // projects dropdown
            setProjects(projList);

            // prefill form
            const proj = projList.find((p: Project) => p._id === feature.projectId);
            if (proj) {
                setValue("projectId", `${proj.name} (${proj.code})`);
            }
            setValue("title",           feature.title);
            setValue("description",     feature.description ?? "");
            setValue("storyPoints",     feature.storyPoints);
            setValue("completedPoints", feature.completedPoints);
            setValue("status",          feature.status);
            setValue("sprintIds",       feature.sprintIds.map((sId: unknown) => String(sId)));
        }).finally(() => {
            setLoading(false);
        });
    }, [id, setValue]);

    useEffect(() => {
        // resolve label → raw _id
        let actualProjectId = watchedProject;
        if (actualProjectId && !/^[0-9a-f]{24}$/.test(actualProjectId)) {
            const match = projects.find(p => `${p.name} (${p.code})` === actualProjectId);
            if (match) actualProjectId = match._id;
        }
        if (!actualProjectId) {
            setSprints([]);
            return;
        }

        const token = localStorage.getItem("token");
        fetch(`/api/sprints?projectId=${actualProjectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.json())
            .then((json: unknown) => {
                // support both Sprint[] or { data: Sprint[] }
                type ApiResponse = { data?: Sprint[] };
                const arr = Array.isArray(json)
                    ? json as Sprint[]
                    : Array.isArray((json as ApiResponse).data)
                        ? (json as ApiResponse).data!
                        : [];
                setSprints(arr);
            });
    }, [projects, watchedProject]);

    const onSubmit = async (data: FormData & { sprintIds?: string[] }) => {
        const proj = projects.find(
            p => `${p.name} (${p.code})` === data.projectId
        );
        if (!proj) {
            alert("Select valid project");
            return;
        }
        const payload = {
            projectId: proj._id,
            title: data.title,
            description: data.description,
            storyPoints: data.storyPoints,
            completedPoints: data.completedPoints,
            sprintIds: data.sprintIds || [],
            status: data.status,
        };
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/features/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) router.push("/features");
        else alert("Error updating feature");
    };

    if (loading) return <p className="p-8">Loading feature…</p>;

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">Edit Feature</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Project */}
                <div>
                    <label className="block text-neutral mb-1">Project</label>
                    <input
                        list="projects-list"
                        {...register("projectId", { required: "Project is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                    <datalist id="projects-list">
                        {projects.map(p => (
                            <option key={p._id} value={`${p.name} (${p.code})`} />
                        ))}
                    </datalist>
                </div>

                {/* Title */}
                <div>
                    <label className="block text-neutral mb-1">Title</label>
                    <input
                        type="text"
                        {...register("title", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-neutral mb-1">Description</label>
                    <input
                        type="text"
                        {...register("description", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>

                {/* Story Points */}
                <div>
                    <label className="block text-neutral mb-1">Story Points</label>
                    <input
                        type="number"
                        {...register("storyPoints", { required: true, valueAsNumber: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">Completed Points</label>
                    <input
                        type="number"
                        {...register("completedPoints", { required: true, valueAsNumber: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-neutral mb-1">Status</label>
                    <select
                        {...register("status", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    >
                        <option value="">Select…</option>
                        {["backlog","in-progress","done","cancelled"].map((s) => (
                            <option key={s} value={s}>
                                {s.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sprint multi-select */}
                <div>
                    <label className="block text-neutral mb-1">Assign to sprints</label>
                    <select
                        multiple
                        {...register("sprintIds")}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                        size={Math.min(5, sprints.length)} // show multiple rows
                    >
                        {sprints.map(s => (
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
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    {isSubmitting ? "Saving…" : "Update Feature"}
                </button>
            </form>
        </div>
    );
}
