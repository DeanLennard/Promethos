// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ResponsiveContainer,
    LineChart,
    Line,
} from "recharts";

interface ProjectSummary {
    _id: string;
    name: string;
    code: string;
    budget: number;
    forecastToDate: number;
    actualToDate: number;
    trend: { period: string; diffCost: number }[];
}

// shape of the project object returned by /api/projects
interface ProjectFromApi {
    _id: string;
    name: string;
    code: string;
    budget: number;
}

// shape of each record returned by /api/monthly-records
interface MonthlyRecordFromApi {
    forecastDays: number;
    actualCost: number;
    resourceId: string;
    period: string;
}

// shape of each resource (we only need the dayRate here)
interface ResourceRate {
    _id: string;
    dayRate: number;
}

export default function ProjectsDashboard() {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const token =
        typeof window === "undefined"
            ? ""
            : localStorage.getItem("token") ?? "";

    useEffect(() => {
        async function load() {
            // 1) fetch all projects
            const pr = await fetch("/api/projects", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const projList = (await pr.json()) as ProjectFromApi[];

            // 2) for each project, fetch aggregated monthly summary
            const summaries = await Promise.all(
                projList.map(async (p) => {
                    // a) fetch that project’s monthly-records
                    const mrRes = await fetch(
                        `/api/monthly-records?projectId=${p._id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const mr = (await mrRes.json()) as MonthlyRecordFromApi[];

                    // b) fetch that project’s resources so we know dayRate
                    const rrRes = await fetch(
                        `/api/resources?projectId=${p._id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const resList = (await rrRes.json()) as ResourceRate[];
                    const resourceMap = Object.fromEntries(
                        resList.map((r) => [r._id, r.dayRate])
                    );

                    // c) roll up totals and per-period buckets
                    let forecastCostTotal = 0;
                    let actualCostTotal = 0;
                    const byPeriod: Record<
                        string,
                        { forecastCost: number; actualCost: number }
                    > = {};

                    mr.forEach((rec) => {
                        const days = rec.forecastDays || 0;
                        const rate = resourceMap[rec.resourceId] ?? 0;
                        const fc = days * rate;
                        const ac = rec.actualCost || 0;

                        forecastCostTotal += fc;
                        actualCostTotal += ac;

                        if (!byPeriod[rec.period]) {
                            byPeriod[rec.period] = { forecastCost: 0, actualCost: 0 };
                        }
                        byPeriod[rec.period].forecastCost += fc;
                        byPeriod[rec.period].actualCost += ac;
                    });

                    const trend = Object.entries(byPeriod)
                        .map(([period, { forecastCost, actualCost }]) => ({
                            period,
                            diffCost: actualCost - forecastCost,
                        }))
                        .sort((a, b) => a.period.localeCompare(b.period));

                    return {
                        _id: p._id,
                        name: p.name,
                        code: p.code,
                        budget: p.budget,
                        forecastToDate: forecastCostTotal,
                        actualToDate: actualCostTotal,
                        trend,
                    } as ProjectSummary;
                })
            );

            setProjects(summaries);
        }

        load();
    }, [token]);

    return (
        <main className="p-8 bg-gradient-to-r from-indigo-50 to-purple-50 min-h-screen">
            <h1 className="text-4xl font-bold mb-8 text-gray-800">
                Projects Overview
            </h1>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((proj) => {
                    const { budget, forecastToDate: fcTotal, actualToDate: acTotal } =
                        proj;

                    // calculate % differences
                    const pctBudgetDiff =
                        budget > 0 ? (acTotal / budget - 1) * 100 : 0;
                    const pctForecastDiff =
                        fcTotal > 0 ? (acTotal / fcTotal - 1) * 100 : 0;
                    const barFill = Math.min(100, (acTotal / budget) * 100);

                    return (
                        <Link
                            key={proj._id}
                            href={`/projects/${proj._id}`}
                            className="block bg-white rounded-lg shadow hover:shadow-lg transition p-6 relative"
                        >
                            {/* Top usage bar */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 overflow-hidden rounded-t-lg">
                                <div
                                    className={`h-full ${
                                        pctBudgetDiff > 0 ? "bg-red-500" : "bg-primary-600"
                                    }`}
                                    style={{ width: `${barFill}%` }}
                                />
                            </div>

                            <h2 className="text-lg font-semibold text-neutral-900">
                                {proj.name}{" "}
                                <span className="text-sm text-gray-500">({proj.code})</span>
                            </h2>

                            {/* Budget / Forecast / Actual */}
                            <div className="mt-4 space-y-1 text-sm text-gray-700">
                                <p>
                                    <strong>Budget:</strong> £{budget.toLocaleString()}
                                </p>
                                <p>
                                    <strong>Forecast:</strong> £{fcTotal.toLocaleString()}{" "}
                                    <span
                                        className={
                                            pctForecastDiff > 0 ? "text-red-600" : "text-gray-700"
                                        }
                                    >
                                        (
                                            {pctForecastDiff >= 0 ? "+" : ""}
                                            {pctForecastDiff.toFixed(1)}%
                                        )
                                    </span>
                                </p>
                                <p>
                                    <strong>Actual:</strong> £{acTotal.toLocaleString()}{" "}
                                    <span
                                        className={
                                            pctBudgetDiff > 0 ? "text-red-600" : "text-gray-700"
                                        }
                                    >
                                        (
                                            {pctBudgetDiff >= 0 ? "+" : ""}
                                            {pctBudgetDiff.toFixed(1)}%
                                        )
                                    </span>
                                </p>
                            </div>

                            {/* Δ Badges */}
                            <div className="mt-4 flex space-x-2">
                                <span
                                    className={`inline-block ${
                                        pctForecastDiff > 0
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-green-100 text-green-800"
                                    } text-xs font-medium px-2 py-0.5 rounded`}
                                >
                                  Forecast Δ{" "}
                                    {pctForecastDiff >= 0 ? "+" : ""}
                                    {pctForecastDiff.toFixed(1)}%
                                </span>
                                <span
                                    className={`inline-block ${
                                        pctBudgetDiff > 0
                                            ? "bg-red-100 text-red-800"
                                            : "bg-green-100 text-green-800"
                                    } text-xs font-medium px-2 py-0.5 rounded`}
                                >
                                    Budget Δ{" "}
                                    {pctBudgetDiff >= 0 ? "+" : ""}
                                    {pctBudgetDiff.toFixed(1)}%
                                </span>
                            </div>

                            {/* Sparkline */}
                            {proj.trend.length > 1 && (
                                <div className="mt-4 h-16">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={proj.trend}>
                                            <Line
                                                type="monotone"
                                                dataKey="diffCost"
                                                stroke="#4f46e5"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>
        </main>
    );
}
