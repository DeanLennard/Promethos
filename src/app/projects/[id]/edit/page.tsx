// src/app/projects/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    currency: string;
    sprintLengthDays: number;
    budget: number;
};

export default function EditProjectPage() {
    useAuthGuard();
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormData>();

    // load existing project
    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`/api/projects/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((payload: { project: FormData }) => {
                const proj = payload.project ?? payload;

                setValue("name", proj.name);
                setValue("code", proj.code);
                setValue("startDate", proj.startDate.split("T")[0]);
                setValue("endDate", proj.endDate.split("T")[0]);
                setValue("currency", proj.currency);
                setValue("sprintLengthDays", proj.sprintLengthDays);
                setValue("budget", proj.budget);
            })
            .finally(() => setLoading(false));
    }, [id, setValue]);

    const onSubmit = async (form: FormData) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(form),
        });
        if (res.ok) router.push("/projects");
        else alert("Error updating project");
    };

    if (loading) return <p className="p-8">Loading project…</p>;

    // define our fields with proper keyof typing
    const fields: Array<{
        label: string;
        name: keyof FormData;
        type: "text" | "date" | "number";
    }> = [
        { label: "Name", name: "name", type: "text" },
        { label: "Code", name: "code", type: "text" },
        { label: "Start Date", name: "startDate", type: "date" },
        { label: "End Date", name: "endDate", type: "date" },
        { label: "Currency", name: "currency", type: "text" },
        { label: "Sprint Length (days)", name: "sprintLengthDays", type: "number" },
        { label: "Budget", name: "budget", type: "number" },
    ];

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">Edit Project</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {fields.map(({ label, name, type }) => (
                    <div key={name}>
                        <label className="block text-neutral mb-1">{label}</label>
                        <input
                            type={type}
                            step={type === "number" ? "1" : undefined}
                            {...register(name, { required: `${label} is required` })}
                            className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                        />
                        {errors[name] && (
                            <p className="text-red-600 text-sm mt-1">
                                {errors[name]?.message}
                            </p>
                        )}
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Saving…" : "Update Project"}
                </button>
            </form>
        </div>
    );
}
