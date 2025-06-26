// src/app/resources/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    name: string;
    role: string;
    dayRate: number;
    skillTags: string; // comma-separated
    contact: string;
};

interface ResourceFromApi {
    name: string;
    role: string;
    dayRate: number;
    skillTags: string[];
    contact: string;
}

export default function EditResourcePage() {
    useAuthGuard();
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } =
        useForm<FormData>();

    useEffect(() => {
        const token = localStorage.getItem("token");
        fetch(`/api/resources/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data: ResourceFromApi) => {
                setValue("name", data.name);
                setValue("role", data.role);
                setValue("dayRate", data.dayRate);
                setValue("skillTags", data.skillTags.join(", "));
                setValue("contact", data.contact);
            })
            .finally(() => setLoading(false));
    }, [id, setValue]);

    const onSubmit = async (form: FormData) => {
        const payload = {
            ...form,
            skillTags: form.skillTags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t),
        };
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/resources/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) router.push("/resources");
        else alert("Error updating resource");
    };

    if (loading) return <p className="p-8">Loading resource…</p>;

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">Edit Resource</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {(
                    [
                        { label: "Name", name: "name", type: "text" },
                        { label: "Role", name: "role", type: "text" },
                        { label: "Day Rate (£)", name: "dayRate", type: "number" },
                        { label: "Skill Tags (comma-separated)", name: "skillTags", type: "text" },
                        { label: "Contact", name: "contact", type: "text" },
                    ] as const
                ).map(({ label, name, type }) => {
                    const field = name as keyof FormData;
                    return (
                        <div key={field}>
                            <label className="block text-neutral mb-1">{label}</label>
                            <input
                                type={type}
                                {...register(field, { required: `${label} is required` })}
                                className="w-full border border-neutral-light rounded px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                                step={type === "number" ? "0.01" : undefined}
                            />
                            {errors[field] && (
                                <p className="text-red-600 text-sm mt-1">
                                    {errors[field]?.message}
                                </p>
                            )}
                        </div>
                    );
                })}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                    {isSubmitting ? "Saving…" : "Update Resource"}
                </button>
            </form>
        </div>
    );
}
