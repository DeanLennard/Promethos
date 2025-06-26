// src/app/resources/new/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type FormData = {
    name: string;
    role: string;
    dayRate: number;
    skillTags: string; // comma-separated
    contact: string;
};

export default function NewResourcePage() {
    useAuthGuard();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>();
    const router = useRouter();

    const onSubmit = async (data: FormData) => {
        // prepare payload: split tags
        const payload = {
            name: data.name,
            role: data.role,
            dayRate: data.dayRate,
            skillTags: data.skillTags
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t),
            contact: data.contact,
        };

        const token = localStorage.getItem("token");
        const res = await fetch("/api/resources", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            router.push("/resources");
        } else {
            alert("Error creating resource");
        }
    };

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">New Resource</h1>
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
                    // name is now a literal of type keyof FormData
                    const fieldName = name as keyof FormData;
                    return (
                        <div key={fieldName}>
                            <label className="block text-neutral mb-1">{label}</label>
                            <input
                                type={type}
                                {...register(fieldName, { required: `${label} is required` })}
                                className="w-full rounded border border-neutral-light px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                                step={type === "number" ? "0.01" : undefined}
                            />
                            {errors[fieldName] && (
                                <p className="text-red-600 text-sm mt-1">
                                    {errors[fieldName]?.message}
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
                    {isSubmitting ? "Saving…" : "Create Resource"}
                </button>
            </form>
        </div>
    );
}
