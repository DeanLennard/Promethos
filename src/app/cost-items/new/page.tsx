// src/app/cost-items/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    projectId: string;
    type: "license" | "equipment" | "contractor" | "other";
    description: string;
    amount: number;
    dateIncurred: Date;
    vendor: string;
};

interface Project {
    _id: string;
    name: string;
    code: string;
}

export default function NewCostItemPage() {
    useAuthGuard();
    const search = useSearchParams();
    const preProjectId = search.get("projectId") || "";
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormData>();

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch("/api/projects", {
            headers: { Authorization: `Bearer ${token}` },
        })
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
            type: data.type,
            description: data.description,
            amount: data.amount,
            dateIncurred: data.dateIncurred,
            vendor: data.vendor,
        };

        const token = localStorage.getItem("token");
        const res = await fetch("/api/cost-items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            router.push("/cost-items");
        } else {
            console.error(await res.json());
            alert("Error creating cost item – see console");
        }
    };

    if (loading) return <p className="p-8">Loading projects…</p>;

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">New Cost Item</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Project dropdown */}
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

                {/* Type enum */}
                <div>
                    <label htmlFor="type" className="block text-neutral mb-1">
                        Cost Type
                    </label>
                    <select
                        id="type"
                        {...register("type", { required: "Type is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    >
                        <option value="">Select type…</option>
                        <option value="license">License</option>
                        <option value="equipment">Equipment</option>
                        <option value="contractor">Contractor</option>
                        <option value="other">Other</option>
                    </select>
                    {errors.type && (
                        <p className="text-red-600 text-sm mt-1">{errors.type.message}</p>
                    )}
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-neutral mb-1">
                        Description
                    </label>
                    <input
                        id="description"
                        type="text"
                        {...register("description", { required: "Description is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.description && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.description.message}
                        </p>
                    )}
                </div>

                {/* Amount */}
                <div>
                    <label htmlFor="amount" className="block text-neutral mb-1">
                        Amount (£)
                    </label>
                    <input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...register("amount", {
                            required: "Amount is required",
                            valueAsNumber: true,
                            min: { value: 0, message: "Must be ≥ 0" },
                        })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.amount && (
                        <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
                    )}
                </div>

                {/* Date Incurred */}
                <div>
                    <label htmlFor="dateIncurred" className="block text-neutral mb-1">
                        Date Incurred
                    </label>
                    <input
                        id="dateIncurred"
                        type="date"
                        {...register("dateIncurred", {
                            required: "Date is required",
                            valueAsDate: true,
                        })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.dateIncurred && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.dateIncurred.message}
                        </p>
                    )}
                </div>

                {/* Vendor */}
                <div>
                    <label htmlFor="vendor" className="block text-neutral mb-1">
                        Vendor
                    </label>
                    <input
                        id="vendor"
                        type="text"
                        {...register("vendor", { required: "Vendor is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.vendor && (
                        <p className="text-red-600 text-sm mt-1">{errors.vendor.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Saving…" : "Create Cost Item"}
                </button>
            </form>
        </div>
    );
}
