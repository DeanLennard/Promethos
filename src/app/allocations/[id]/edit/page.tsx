// src/app/allocations/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    projectLabel: string;    // e.g. "Name (CODE)"
    resourceLabel: string;   // e.g. "Name – Role"
    fromDate: string;
    toDate: string;
    allocationPct: number;
    plannedDays: number;
};

interface Project { _id: string; name: string; code: string }
interface Resource { _id: string; name: string; role: string }

export default function EditAllocationPage() {
    useAuthGuard();
    const { id } = useParams();
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { isSubmitting },
    } = useForm<FormData>();

    useEffect(() => {
        const token = localStorage.getItem("token");
        Promise.all([
            fetch("/api/allocations/" + id, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch("/api/projects",    { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch("/api/resources",   { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([alloc, projData, resData]) => {
            // prefill allocation
            const proj = projData.find((p: Project) => p._id === alloc.projectId);
            const res = resData.find((r: Resource) => r._id === alloc.resourceId);

            setProjects(projData);
            setResources(resData);

            if (proj) setValue("projectLabel", `${proj.name} (${proj.code})`);
            if (res)  setValue("resourceLabel", `${res.name} – ${res.role}`);
            setValue("fromDate", alloc.fromDate.split("T")[0]);
            setValue("toDate",   alloc.toDate.split("T")[0]);
            setValue("allocationPct", alloc.allocationPct);
            setValue("plannedDays", alloc.plannedDays);
        }).finally(() => setLoading(false));
    }, [id, setValue]);

    const onSubmit = async (data: FormData) => {
        // look up ids from labels
        const proj = projects.find(p => `${p.name} (${p.code})` === data.projectLabel);
        const res  = resources.find(r => `${r.name} – ${r.role}` === data.resourceLabel);
        if (!proj || !res) {
            alert("Please select valid project & resource");
            return;
        }

        const payload = {
            projectId: proj._id,
            resourceId: res._id,
            fromDate: data.fromDate,
            toDate: data.toDate,
            allocationPct: data.allocationPct,
            plannedDays: data.plannedDays,
        };

        const token = localStorage.getItem("token");
        const resp = await fetch("/api/allocations/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (resp.ok) router.push("/allocations");
        else alert("Error updating allocation");
    };

    if (loading) return <p className="p-8">Loading allocation…</p>;

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">Edit Allocation</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* Project */}
                <div>
                    <label className="block text-neutral mb-1">Project</label>
                    <input
                        list="projects-list"
                        {...register("projectLabel", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                    <datalist id="projects-list">
                        {projects.map(p => (
                            <option key={p._id} value={`${p.name} (${p.code})`} />
                        ))}
                    </datalist>
                </div>

                {/* Resource */}
                <div>
                    <label className="block text-neutral mb-1">Resource</label>
                    <input
                        list="resources-list"
                        {...register("resourceLabel", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                    <datalist id="resources-list">
                        {resources.map(r => (
                            <option key={r._id} value={`${r.name} – ${r.role}`} />
                        ))}
                    </datalist>
                </div>

                {/* Dates & numbers */}
                <div>
                    <label className="block text-neutral mb-1">From Date</label>
                    <input
                        type="date"
                        {...register("fromDate", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">To Date</label>
                    <input
                        type="date"
                        {...register("toDate", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">Allocation %</label>
                    <input
                        type="number"
                        {...register("allocationPct", { required: true, min: 0, max: 100 })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">Planned Days</label>
                    <input
                        type="number"
                        {...register("plannedDays", { required: true, min: 0 })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    {isSubmitting ? "Saving…" : "Update Allocation"}
                </button>
            </form>
        </div>
    );
}
