// src/app/projects/[id]/monthly/page.tsx
import MonthlyClient from "./MonthlyClient";

interface MonthlyPageProps {
    params: { id: string };
    searchParams?: Record<string, string | string[]>;
}

export default function MonthlyPage({ params }: MonthlyPageProps) {
    return <MonthlyClient projectId={params.id} />;
}
