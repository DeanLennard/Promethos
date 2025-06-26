// src/app/projects/[id]/page.tsx
"use client";

import {useState, useEffect, useMemo, useCallback} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
    ResponsiveContainer,
    LineChart,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line
} from 'recharts';

interface Project {
    _id: string;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    currency: string;
    sprintLengthDays: number;
    budget: number;
}

interface CostItem {
    _id: string;
    projectId: string;
    amount: number;
}

interface Feature {
    _id: string;
    projectId: string;
    storyPoints: number;
    completedPoints: number;
    status: string;
}

interface Resource {
    _id: string;
    name: string;
    role: string;
    dayRate: number;
}

interface MonthlyRecord {
    _id: string;
    projectId: string;
    resourceId: string;
    period: string;        // e.g. "2025-06"
    forecastDays: number;
    actualCost: number;
}

export default function ProjectViewPage() {
    useAuthGuard();
    const { id } = useParams();
    const [project, setProject] = useState<Project | null>(null);
    const [costItems, setCostItems] = useState<CostItem[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [monthly, setMonthly] = useState<MonthlyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        async function loadAll() {
            setLoading(true);
            try {
                const [projRes, costRes, featRes, resRes, monRes] = await Promise.all([
                    fetch(`/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/cost-items`,    { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/features`,      { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/resources`,     { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                    fetch(`/api/monthly-records?projectId=${id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
                ]);
                // unwrap the nested field:
                if ('project' in projRes) {
                    setProject(projRes.project);
                } else {
                    // handle error if needed
                    setProject(null);
                }
                setCostItems(costRes.filter((c: CostItem) => c.projectId === id));
                setFeatures(featRes.filter((f: Feature) => f.projectId === id));
                setResources(resRes);
                setMonthly(monRes);
            } finally {
                setLoading(false);
            }
        }
        loadAll();
    }, [id]);

    const resourceMap = useMemo(
        () => Object.fromEntries(resources.map(r => [r._id, r])),
        [resources]
    );

    const trendData = useMemo(() => {
        const m: Record<string, { forecastCost: number; actualCost: number }> = {};

        monthly.forEach((rec) => {
            // Coerce incoming fields to numbers
            const days   = Number(rec.forecastDays) || 0;
            const cost   = Number(rec.actualCost)   || 0;
            const rate   = resourceMap[rec.resourceId]?.dayRate ?? 0;

            const fc = rate * days;
            const ac = cost;

            if (!m[rec.period]) m[rec.period] = { forecastCost: 0, actualCost: 0 };
            m[rec.period].forecastCost += fc;
            m[rec.period].actualCost   += ac;
        });

        return Object.entries(m)
            .map(([period, { forecastCost, actualCost }]) => ({
                period,
                forecastCost,
                actualCost,
                diffCost: actualCost - forecastCost,
                pctDiff:  forecastCost > 0
                    ? ((actualCost - forecastCost) / forecastCost) * 100
                    : 0,
            }))
            .sort((a, b) => a.period.localeCompare(b.period));
    }, [monthly, resourceMap]);

    const labourForecast = useMemo(() =>
            monthly.reduce((sum, rec) => {
                const days = Number(rec.forecastDays) || 0;
                const rate = resourceMap[rec.resourceId]?.dayRate ?? 0;
                return sum + rate * days;
            }, 0),
        [monthly, resourceMap]
    );

    const labourActual = useMemo(() =>
            monthly.reduce((sum, rec) => sum + (Number(rec.actualCost) || 0), 0),
        [monthly]
    );

    // Non-personnel spend
    const nonPersonnel = useMemo(
        () => costItems.reduce((s, c) => s + c.amount, 0),
        [costItems]
    );
    const totalForecast = labourForecast + nonPersonnel;
    const totalActual   = labourActual   + nonPersonnel;

    // Feature stats
    const totalSP = useMemo(() => features.reduce((s, f) => s + f.storyPoints, 0), [features]);
    const doneSP  = useMemo(() => features.reduce((s, f) => s + f.completedPoints, 0), [features]);
    const statusCounts = useMemo(() => {
        return features.reduce<Record<string, number>>((acc, f) => {
            acc[f.status] = (acc[f.status] || 0) + 1;
            return acc;
        }, {});
    }, [features]);

    // map symbol → ISO code, fallback to project.currency if it already looks valid
    const currencyCode = useMemo(() => {
        const code = project?.currency ?? "";
        // if already a 3-letter uppercase code, use it
        if (/^[A-Z]{3}$/.test(code)) return code;
        // otherwise map common symbols
        const symbolMap: Record<string, string> = {
            "£": "GBP",
            "$": "USD",
            "€": "EUR",
        };
        return symbolMap[code] || "GBP";  // fallback to GBP
    }, [project?.currency]);

    // formatter
    const fmt = useCallback((val: number) => {
        try {
            return val.toLocaleString("en-GB", {
                style: "currency",
                currency: currencyCode,
            });
        } catch {
            // If still invalid, show the raw symbol & value
            const sym = project?.currency ?? "";
            return `${sym}${val.toFixed(2)}`;
        }
    }, [currencyCode, project?.currency]);

    const totalBudget = project?.budget || 0;
    const spent = totalActual;
    const remaining = totalBudget - spent;
    const pctUsed = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

    const breakdown = useMemo(() => {
        if (!selectedPeriod) return [];
        // filter monthly records for that period
        return monthly
            .filter((rec) => rec.period === selectedPeriod)
            .map((rec) => {
                const r = resourceMap[rec.resourceId]!;
                const actualDays = r.dayRate > 0
                    ? rec.actualCost / r.dayRate
                    : 0;
                return {
                    id: rec.resourceId,
                    name: r.name,
                    role: r.role,
                    forecastDays: rec.forecastDays,
                    actualDays,
                };
            });
    }, [selectedPeriod, monthly, resourceMap]);

    function handlePeriodClick(period: string) {
        setSelectedPeriod(period);
    }

    if (loading) return <p className="p-8">Loading project dashboard…</p>;
    if (!project) return <p className="p-8">Project not found</p>;

    return (
        <>
            <div className="p-8 space-y-6">
                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-semibold">
                        {project.name} ({project.code})
                    </h1>
                    <div className="space-x-2">
                        <Link
                            href={`/projects/${id}/edit`}
                            className="px-4 py-2 bg-accent-600 text-white rounded hover:bg-accent-700"
                        >
                            Edit
                        </Link>
                        <Link
                            href="/projects"
                            className="px-4 py-2 bg-neutral-light text-white rounded hover:bg-neutral-dark"
                        >
                            Back
                        </Link>
                    </div>
                </header>

                <nav className="flex space-x-4 mb-6">
                    <Link
                        href={`/resources`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        Resources
                    </Link>
                    <Link
                        href={`/allocations/new?projectId=${id}`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        New Resource Allocation
                    </Link>
                    <Link
                        href={`/cost-items/new?projectId=${id}`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        New Cost Item
                    </Link>
                    <Link
                        href={`/features/new?projectId=${id}`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        New Feature
                    </Link>
                    <Link
                        href={`/projects/${id}/monthly`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        Add Forecast & Actuals
                    </Link>
                    <Link
                        href={`/projects/${id}/calendar`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        Absense Calendar
                    </Link>
                    <Link
                        href={`/projects/${id}/features-board`}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                    >
                        Feature Board
                    </Link>
                </nav>

                {/* Summary metrics */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Budget card */}
                    <div className="bg-white p-4 rounded shadow-card">
                        <h2 className="text-sm font-medium text-neutral">Budget</h2>
                        <p className="text-xl font-bold mt-2">{fmt(totalBudget)}</p>
                        <p className="text-xs text-neutral mt-1">
                            Used: {fmt(spent)} ({pctUsed.toFixed(1)}%)
                        </p>
                        <p className="text-xs text-neutral">
                            Remaining: {fmt(remaining)}
                        </p>
                    </div>

                    {/* Existing cards */}
                    <div className="bg-white p-4 rounded shadow-card">
                        <h2 className="text-sm font-medium text-neutral">Labour Forecast</h2>
                        <p className="text-xl font-bold mt-2">{fmt(labourForecast)}</p>
                    </div>
                    <div className="bg-white p-4 rounded shadow-card">
                        <h2 className="text-sm font-medium text-neutral">Labour Actual</h2>
                        <p className="text-xl font-bold mt-2">{fmt(labourActual)}</p>
                    </div>
                    <div className="bg-white p-4 rounded shadow-card">
                        <h2 className="text-sm font-medium text-neutral">Non-Personnel</h2>
                        <p className="text-xl font-bold mt-2">{fmt(nonPersonnel)}</p>
                    </div>
                    <div className="bg-white p-4 rounded shadow-card">
                        <h2 className="text-sm font-medium text-neutral">Total Forecast</h2>
                        <p className="text-xl font-bold mt-2">{fmt(totalForecast)}</p>
                        <h2 className="text-sm font-medium text-neutral mt-4">Total Actual</h2>
                        <p className="text-xl font-bold mt-2">{fmt(totalActual)}</p>
                    </div>
                </section>

                {/* --- Monthly Trend Section --- */}
                <section className="bg-white shadow-card rounded p-6 space-y-4">
                    <h2 className="text-lg font-medium">Monthly Labour Trend</h2>

                    {/* simple table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-primary-50">
                                {["Month","Forecast","Actual","Δ £","Δ %"].map(h=>(
                                    <th key={h} className="p-2 text-left text-neutral">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {trendData.map(row=>(
                                <tr
                                    key={row.period}
                                    className="border-t odd:bg-gray-50 even:bg-white cursor-pointer"
                                    onClick={() => handlePeriodClick(row.period)}
                                >
                                    <td className="p-2">{row.period}</td>
                                    <td className="p-2">{fmt(row.forecastCost)}</td>
                                    <td className="p-2">{fmt(row.actualCost)}</td>
                                    <td className="p-2">{fmt(row.diffCost)}</td>
                                    <td className="p-2">{row.pctDiff.toFixed(1)}%</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* line chart */}
                    <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart
                                data={trendData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                            >
                                <XAxis dataKey="period" />
                                <YAxis yAxisId="left" label={{ value: "% Δ", angle: -90, position: "insideLeft" }} />
                                <YAxis yAxisId="right" orientation="right" label={{ value: "£ Δ", angle: 90, position: "insideRight" }} />
                                <Tooltip
                                    formatter={(
                                        val: number | string,
                                        name: string
                                    ) => {
                                        // Recharts sometimes passes strings for category axes, but here val will always be numeric
                                        const num = typeof val === "string" ? parseFloat(val) : val;
                                        return name === "pctDiff"
                                            ? `${num.toFixed(1)}%`
                                            : fmt(num);
                                    }}
                                />
                                <Legend />

                                {/* Monthly forecast line */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="forecastCost"
                                    name="Forecast"
                                    strokeWidth={2}
                                    stroke="#4f46e5"
                                />

                                {/* Monthly actual line */}
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="actualCost"
                                    name="Actual"
                                    strokeWidth={2}
                                    stroke="#f59e0b"
                                />

                                {/* Δ lines */}
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="pctDiff"
                                    name="% Δ"
                                    strokeWidth={2}
                                    stroke="#10b981"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="diffCost"
                                    name="£ Δ"
                                    strokeWidth={2}
                                    stroke="#ef4444"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Timeline & counts */}
                <section className="bg-white shadow-card rounded p-6 space-y-4">
                    <h2 className="text-lg font-medium">Project Details</h2>
                    <p>
                        <strong>Start:</strong> {new Date(project.startDate).toLocaleDateString()}
                    </p>
                    <p>
                        <strong>End:</strong> {new Date(project.endDate).toLocaleDateString()}
                    </p>
                    <p>
                        <strong>Sprint Length:</strong> {project.sprintLengthDays} days
                    </p>
                    <p>
                        <strong>Total Features:</strong> {features.length} (
                        {statusCounts.backlog || 0} backlog, {statusCounts["in-progress"] || 0} in-progress,
                        {statusCounts.done || 0} done, {statusCounts.cancelled || 0} cancelled)
                    </p>
                    <p>
                        <strong>Story Points:</strong> {doneSP}/{totalSP} completed
                    </p>
                </section>
            </div>
            {selectedPeriod && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg max-w-2xl w-full p-6">
                        <header className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">
                                Resource Profile Breakdown for {selectedPeriod}
                            </h2>
                            <button onClick={() => setSelectedPeriod(null)}>
                                ✕
                            </button>
                        </header>
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-gray-100">
                                {['Name','Role','Forecast (d)','Actual (d)'].map(h => (
                                    <th key={h} className="p-2 text-left">{h}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {breakdown.map((b) => (
                                <tr key={b.id} className="border-t odd:bg-gray-50 even:bg-white">
                                    <td className="p-2">{b.name}</td>
                                    <td className="p-2">{b.role}</td>
                                    <td className="p-2">{b.forecastDays}</td>
                                    <td className="p-2">{b.actualDays.toFixed(1)}</td>
                                </tr>
                            ))}
                            {breakdown.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-neutral-500">
                                    No data for this month
                                </td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}
