// src/app/allocations/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    projectId: string;    // will hold the descriptive label
    resourceId: string;   // descriptive label
    fromDate: string;
    toDate: string;
    allocationPct: number;
    plannedDays: number;
};

export default function NewAllocationPage() {
    useAuthGuard();
    const search = useSearchParams();
    const preProjectId = search?.get("projectId") || "";
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormData>();
    const router = useRouter();

    // fetched lists
    const [projects, setProjects] = useState<
        { _id: string; name: string; code: string }[]
    >([]);
    const [resources, setResources] = useState<
        { _id: string; name: string; role: string }[]
    >([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        Promise.all([
            fetch("/api/projects", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
            fetch("/api/resources", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        ])
            .then(([projData, resData]) => {
                setProjects(projData);
                setResources(resData);
            })
            .finally(() => setLoadingData(false));
    }, []);

    // once projects are loaded, if we have a preProjectId, set the form value
    useEffect(() => {
        if (preProjectId && projects.length) {
            const p = projects.find(p => p._id === preProjectId);
            if (p) {
                // this needs to match whatever your user sees in the dropdown
                setValue("projectId", `${p.name} (${p.code})`);
            }
        }
    }, [preProjectId, projects, setValue]);

    const onSubmit = async (data: FormData) => {
        // match the user-entered label back to the ID
        const selectedProject = projects.find(
            (p) => `${p.name} (${p.code})` === data.projectId
        );
        const selectedResource = resources.find(
            (r) => `${r.name} – ${r.role}` === data.resourceId
        );

        if (!selectedProject) {
            alert("Please select a valid project from the list");
            return;
        }
        if (!selectedResource) {
            alert("Please select a valid resource from the list");
            return;
        }

        const payload = {
            projectId: selectedProject._id,
            resourceId: selectedResource._id,
            fromDate: data.fromDate,
            toDate: data.toDate,
            allocationPct: data.allocationPct,
            plannedDays: data.plannedDays,
        };

        const token = localStorage.getItem("token");
        const res = await fetch("/api/allocations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) router.push("/allocations");
        else alert("Error creating allocation");
    };

    if (loadingData) return <p className="p-8">Loading form data…</p>;

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">New Allocation</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Project dropdown */}
                <div>
                    <label htmlFor="projectId" className="block text-neutral mb-1">
                        Project
                    </label>
                    <input
                        list="projects-list"
                        id="projectId"
                        {...register("projectId", { required: "Project is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    <datalist id="projects-list">
                        {projects.map((p) => (
                            <option
                                key={p._id}
                                value={`${p.name} (${p.code})`}
                            />
                        ))}
                    </datalist>
                    {errors.projectId && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.projectId.message}
                        </p>
                    )}
                </div>

                {/* Resource dropdown */}
                <div>
                    <label htmlFor="resourceId" className="block text-neutral mb-1">
                        Resource
                    </label>
                    <input
                        list="resources-list"
                        id="resourceId"
                        {...register("resourceId", { required: "Resource is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    <datalist id="resources-list">
                        {resources.map((r) => (
                            <option
                                key={r._id}
                                value={`${r.name} – ${r.role}`}
                            />
                        ))}
                    </datalist>
                    {errors.resourceId && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.resourceId.message}
                        </p>
                    )}
                </div>

                {/* Other fields */}
                <div>
                    <label className="block text-neutral mb-1">From Date</label>
                    <input
                        type="date"
                        {...register("fromDate", { required: "From date is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.fromDate && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.fromDate.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-neutral mb-1">To Date</label>
                    <input
                        type="date"
                        {...register("toDate", { required: "To date is required" })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.toDate && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.toDate.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-neutral mb-1">Allocation %</label>
                    <input
                        type="number"
                        {...register("allocationPct", {
                            required: "Allocation % is required",
                            min: 0,
                            max: 100,
                        })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.allocationPct && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.allocationPct.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-neutral mb-1">Planned Days</label>
                    <input
                        type="number"
                        {...register("plannedDays", {
                            required: "Planned days is required",
                            min: 0,
                        })}
                        className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    />
                    {errors.plannedDays && (
                        <p className="text-red-600 text-sm mt-1">
                            {errors.plannedDays.message}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Saving…" : "Create Allocation"}
                </button>
            </form>
        </div>
    );
}
