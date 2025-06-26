// src/app/projects/[id]/monthly/MonthlyClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

type Resource = { _id: string; name: string; role: string; dayRate: number };
type Monthly = {
    _id: string;
    projectId: string;
    resourceId: string;
    period: string;
    forecastDays: number;
    actualCost: number;
};

export default function MonthlyClient({
                                          projectId,
                                      }: {
    projectId: string;
}) {
    // 1) State for resource list & selection
    const [resources, setResources] = useState<Resource[]>([]);
    const [resourceId, setResourceId] = useState<string>("");
    const token = localStorage.getItem("token");
    const monthInputRef = useRef<HTMLInputElement>(null);

    // 2) Month & record
    const [period, setPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const [record, setRecord] = useState<Monthly | null>(null);

    // 3) React Hook Form
    const { register, handleSubmit, reset } = useForm<{
        forecastDays: number;
        actualCost: number;
    }>({
        defaultValues: { forecastDays: 0, actualCost: 0 },
    });

    // find the full selected resource (with its dayRate)
    const selectedResourceObj = resources.find(r => r._id === resourceId);
    const dayRate = selectedResourceObj?.dayRate ?? 1; // fallback to 1 to avoid /0

    // Fetch your project’s resources
    useEffect(() => {
        if (!token) return;
        fetch(`/api/resources?projectId=${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data: Resource[]) => {
                // sort alphabetically by name
                data.sort((a, b) => a.name.localeCompare(b.name));
                setResources(data);
            });
    }, [projectId, token]);

    // Whenever projectId, resourceId or period changes, reload the record
    useEffect(() => {
        if (!resourceId || !token) {
            setRecord(null);
            reset({ forecastDays: 0, actualCost: 0 });
            return;
        }
        fetch(
            `/api/monthly-records?projectId=${projectId}&resourceId=${resourceId}&period=${period}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        )
            .then((r) => r.json())
            .then((data: Monthly[]) => {
                if (data.length) {
                    setRecord(data[0]);
                    reset({
                        forecastDays: data[0].forecastDays,
                        actualCost: data[0].actualCost,
                    });
                } else {
                    setRecord(null);
                    reset({ forecastDays: 0, actualCost: 0 });
                }
            });
    }, [projectId, resourceId, period, reset, token]);

    // Save (POST or PUT)
    const onSubmit = async (vals: { forecastDays: number; actualCost: number }) => {
        const payload = { projectId, resourceId, period, ...vals };
        const url = record
            ? `/api/monthly-records/${record._id}`
            : "/api/monthly-records";
        const method = record ? "PUT" : "POST";

        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            const updated = await res.json();
            setRecord(updated);
        } else {
            alert("Error saving record");
        }
    };

    // 1) derive year/month from your `period` (e.g. "2025-06")
    const [yearStr, monthStr] = period.split("-");
    const year  = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // 3) compute days in that month
    const daysInMonth = new Date(year, month, 0).getDate();

    // 4) compute forecast % as before
    const forecastPct = record
        ? Math.min(100, (record.forecastDays / daysInMonth) * 100)
        : 0;

     // 5) derive “actual days” from cost / rate, then % of month
    const actualDays = record
        ? record.actualCost / dayRate
        : 0;
    const actualPct = record
        ? Math.min(100, (actualDays / daysInMonth) * 100)
        : 0;

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-semibold">
                Monthly Forecast & Actuals
            </h1>

            {/* Resource selector */}
            <div className="max-w-md">
                <label className="block mb-1">Resource</label>
                <select
                    className="w-full border border-neutral-light rounded px-3 py-2"
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                >
                    <option value="">— select a resource —</option>
                    {resources.map((r) => (
                        <option key={r._id} value={r._id}>
                            {r.name} — {r.role}
                        </option>
                    ))}
                </select>
            </div>

            {/* Month selector – entire div clickable */}
            <div className="max-w-sm">
                <label className="block mb-1">Period</label>
                <div
                    onClick={() => {
                        // Chrome & Safari: showPicker(); fallback to focus()
                        monthInputRef.current?.showPicker?.();
                        monthInputRef.current?.focus();
                    }}
                    className="w-full border border-neutral-light rounded px-3 py-2 cursor-pointer"
                >
                    <input
                        ref={monthInputRef}
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="w-full appearance-none bg-transparent focus:outline-none"
                    />
                </div>
            </div>

            {/* Form only shows once a resource is selected */}
            {resourceId && (
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4 max-w-sm bg-white shadow-card rounded p-6"
                >
                    <div>
                        <label className="block mb-1">Forecast Days</label>
                        <input
                            type="number"
                            {...register("forecastDays", { valueAsNumber: true })}
                            className="w-full border border-neutral-light rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block mb-1">Actual Cost (£)</label>
                        <input
                            type="number"
                            {...register("actualCost", { valueAsNumber: true })}
                            className="w-full border border-neutral-light rounded px-3 py-2"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                        Save
                    </button>
                </form>
            )}

            {/* Gantt-style bar */}
            {resourceId && (
                <div className="max-w-sm">
                    <div className="mb-1">Forecast vs Actual (of {daysInMonth} days)</div>
                    <div className="w-full h-4 bg-neutral-light rounded overflow-hidden relative">
                        {/* forecast */}
                        <div
                            className="h-full bg-primary-500"
                            style={{ width: `${forecastPct}%` }}
                        />
                        {/* actual on top */}
                        <div
                            className="h-full bg-accent-500 absolute top-0 left-0"
                            style={{ width: `${actualPct}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                        <span>{record?.forecastDays || 0}d</span>
                        <span>{actualDays.toFixed(1)}d</span>
                    </div>
                </div>
            )}
        </div>
    );
}
