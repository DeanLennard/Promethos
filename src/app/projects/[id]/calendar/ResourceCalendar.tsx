// src/app/projects/[id]/calendar/ResourceCalendar.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type Absence = {
    _id: string;
    resourceId: string;
    fromDate: string;
    toDate: string;
    type: "holiday" | "sick" | "other";
    note?: string;
};

type Resource = {
    _id: string;
    name: string;
    role: string;
};

type AbsenceForm = {
    type: "holiday" | "sick" | "other";
    fromDate: string;
    toDate: string;
    note?: string;
};

export default function ResourceCalendar() {
    useAuthGuard();

    const [resources, setResources] = useState<Resource[]>([]);
    const [selectedResource, setSelectedResource] = useState<string>("");
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [clickedDate, setClickedDate] = useState<Date | null>(null);

    const { register, handleSubmit, reset } = useForm<AbsenceForm>();

    // 1) Fetch all resources
    useEffect(() => {
        const token = localStorage.getItem("token")!;
        fetch("/api/resources", { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json() as Promise<Resource[]>)
            .then(setResources);
    }, []);

    // 2) Fetch absences whenever selectedResource changes
    useEffect(() => {
        if (!selectedResource) {
            setAbsences([]);
            return;
        }
        const token = localStorage.getItem("token")!;
        fetch(`/api/absences?resourceId=${selectedResource}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((payload: Absence[] | { data: Absence[] }) => {
                // support both direct-array or { data: [...] }
                const arr = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload.data)
                        ? payload.data
                        : [];
                setAbsences(arr);
            });
    }, [selectedResource]);

    // 3) Post a new absence
    const onSubmit: SubmitHandler<AbsenceForm> = async (data) => {
        const token = localStorage.getItem("token")!;
        const res = await fetch("/api/absences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ resourceId: selectedResource, ...data }),
        });
        if (res.ok) {
            const created: Absence = await res.json();
            setAbsences((prev) => [...prev, created]);
            reset({ type: "holiday", fromDate: "", toDate: "", note: "" });
        } else {
            alert("Error logging absence");
        }
    };

    // Helpers
    const formatYMD = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
        ).padStart(2, "0")}`;

    const tileContent = ({
                             date,
                             view,
                         }: {
        date: Date;
        view: string;
    }) => {
        if (view !== "month") return null;
        const dayStr = formatYMD(date);
        const found = absences.find((a) => {
            const from = formatYMD(new Date(a.fromDate));
            const to = formatYMD(new Date(a.toDate));
            return dayStr >= from && dayStr <= to;
        });
        if (!found) return null;
        const colorClass =
            found.type === "holiday"
                ? "bg-accent-300"
                : found.type === "sick"
                    ? "bg-accent-500"
                    : "bg-neutral-light";
        return <div className={`w-full h-2 rounded ${colorClass}`}></div>;
    };

    const clickedAbsences = clickedDate
        ? absences.filter((a) => {
            const day = formatYMD(clickedDate);
            const from = formatYMD(new Date(a.fromDate));
            const to = formatYMD(new Date(a.toDate));
            return day >= from && day <= to;
        })
        : [];

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-semibold">Resource Calendar</h1>

            {/* Resource selector */}
            <div className="max-w-md">
                <label className="block text-neutral mb-1">Select Resource</label>
                <select
                    className="w-full border border-neutral-light rounded px-3 py-2"
                    value={selectedResource}
                    onChange={(e) => setSelectedResource(e.target.value)}
                >
                    <option value="">— choose a resource —</option>
                    {resources.map((r) => (
                        <option key={r._id} value={r._id}>
                            {r.name} – {r.role}
                        </option>
                    ))}
                </select>
            </div>

            {selectedResource && (
                <>
                    <Calendar tileContent={tileContent} onClickDay={setClickedDate} />

                    {/* Modal for clicked date */}
                    {clickedDate && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
                                <h2 className="text-xl font-semibold">
                                    Absences on {clickedDate.toLocaleDateString()}
                                </h2>
                                {clickedAbsences.length ? (
                                    clickedAbsences.map((a) => (
                                        <div key={a._id} className="p-3 border rounded">
                                            <p>
                                                <strong>Type:</strong> {a.type}
                                            </p>
                                            <p>
                                                <strong>From:</strong>{" "}
                                                {new Date(a.fromDate).toLocaleDateString()}
                                            </p>
                                            <p>
                                                <strong>To:</strong>{" "}
                                                {new Date(a.toDate).toLocaleDateString()}
                                            </p>
                                            {a.note && (
                                                <p>
                                                    <strong>Note:</strong> {a.note}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p>No absences recorded.</p>
                                )}
                                <button
                                    onClick={() => setClickedDate(null)}
                                    className="mt-4 px-4 py-2 bg-neutral-light text-white rounded hover:bg-neutral-dark"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Log Absence Form */}
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="max-w-md bg-white shadow-card rounded p-6 space-y-4"
                    >
                        <h2 className="text-xl font-semibold">Log Absence</h2>
                        <div>
                            <label className="block text-neutral mb-1">Type</label>
                            <select
                                {...register("type", { required: true })}
                                className="w-full border border-neutral-light rounded px-3 py-2"
                                defaultValue="holiday"
                            >
                                <option value="holiday">Holiday</option>
                                <option value="sick">Sick</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-neutral mb-1">From</label>
                            <input
                                type="date"
                                {...register("fromDate", { required: true })}
                                className="w-full border border-neutral-light rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-neutral mb-1">To</label>
                            <input
                                type="date"
                                {...register("toDate", { required: true })}
                                className="w-full border border-neutral-light rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-neutral mb-1">Note (optional)</label>
                            <textarea
                                {...register("note")}
                                className="w-full border border-neutral-light rounded px-3 py-2"
                                rows={2}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                        >
                            Save Absence
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
