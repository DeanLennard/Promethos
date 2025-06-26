// src/app/cost-items/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    projectLabel: string;
    type: "license" | "equipment" | "contractor" | "other";
    description: string;
    amount: number;
    dateIncurred: string;
    vendor: string;
};

interface Project { _id: string; name: string; code: string }

export default function EditCostItemPage() {
    useAuthGuard();
    const { id } = useParams();
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const { register, handleSubmit, setValue, formState: { isSubmitting } } =
        useForm<FormData>();

    useEffect(() => {
        const token = localStorage.getItem("token");
        Promise.all([
            fetch(`/api/cost-items/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch("/api/projects", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([ci, pr]) => {
            setProjects(pr);
            // project label
            const proj = pr.find((p: Project) => p._id === ci.projectId);
            if (proj) setValue("projectLabel", `${proj.name} (${proj.code})`);

            // other fields
            setValue("type", ci.type);
            setValue("description", ci.description);
            setValue("amount", ci.amount);
            setValue("dateIncurred", ci.dateIncurred.split("T")[0]);
            setValue("vendor", ci.vendor || "");
        }).finally(() => setLoading(false));
    }, [id, setValue]);

    const onSubmit = async (data: FormData) => {
        const proj = projects.find(p => `${p.name} (${p.code})` === data.projectLabel);
        if (!proj) {
            alert("Select valid project");
            return;
        }
        const payload = {
            projectId: proj._id,
            type: data.type,
            description: data.description,
            amount: data.amount,
            dateIncurred: data.dateIncurred,
            vendor: data.vendor,
        };
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/cost-items/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) router.push("/cost-items");
        else alert("Error updating cost item");
    };

    if (loading) return <p className="p-8">Loading cost item…</p>;

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">Edit Cost Item</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Project */}
                <div>
                    <label className="block text-neutral mb-1">Project</label>
                    <input
                        list="projects-list"
                        {...register("projectLabel", { required: "Project is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                    <datalist id="projects-list">
                        {projects.map((p) => (
                            <option key={p._id} value={`${p.name} (${p.code})`} />
                        ))}
                    </datalist>
                </div>

                {/* Type */}
                <div>
                    <label className="block text-neutral mb-1">Type</label>
                    <select
                        {...register("type", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    >
                        <option value="">Select…</option>
                        {["license","equipment","contractor","other"].map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                {/* Others */}
                <div>
                    <label className="block text-neutral mb-1">Description</label>
                    <input
                        type="text"
                        {...register("description", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">Amount</label>
                    <input
                        type="number"
                        step="0.01"
                        {...register("amount", { required: true, valueAsNumber: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">Date Incurred</label>
                    <input
                        type="date"
                        {...register("dateIncurred", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-neutral mb-1">Vendor</label>
                    <input
                        type="text"
                        {...register("vendor", { required: true })}
                        className="w-full border border-neutral-light rounded px-3 py-2"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                    {isSubmitting ? "Saving…" : "Update Cost Item"}
                </button>
            </form>
        </div>
    );
}
