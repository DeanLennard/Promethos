// src/app/projects/[id]/calendar/page.tsx
"use client";

import { useParams } from "next/navigation";
import ResourceCalendar from "./ResourceCalendar";

export default function ProjectCalendarPage() {
    // grab the projectId from the URL in the client
    const { id: projectId } = useParams();

    if (!projectId) {
        return <p className="p-8">No project selected</p>;
    }

    return <ResourceCalendar projectId={projectId} />;
}
