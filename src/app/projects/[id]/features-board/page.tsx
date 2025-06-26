// src/app/projects/[id]/features-board/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useForm } from 'react-hook-form';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import Link from "next/link";

type FeatureStatus = 'backlog' | 'in-progress' | 'done' | 'cancelled';

type Feature = {
    _id: string;
    title: string;
    description: string;
    storyPoints: number;
    completedPoints: number;
    status: FeatureStatus;
    sprintIds: string[];
};

type Sprint  = { _id: string; name: string; };

export default function FeatureBoard() {
    useAuthGuard();
    const { id: projectId } = useParams();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [sprints, setSprints]     = useState<Sprint[]>([]);
    const [filterSprint, setFilter] = useState<string>('');
    const [isModalOpen, setModalOpen] = useState(false);
    const statuses = ['backlog','in-progress','done','cancelled'];
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

    // load features + sprints
    const reload = useCallback(async () => {
        const [fRes, sRes] = await Promise.all([
            fetch(`/api/features?projectId=${projectId}`, { headers:{ Authorization:`Bearer ${token}` }}),
            fetch(`/api/sprints?projectId=${projectId}`,  { headers:{ Authorization:`Bearer ${token}` }})
        ]);
        const [fJson, sJson] = await Promise.all([fRes.json(), sRes.json()]);
        setFeatures(fJson.data || fJson);
        setSprints(sJson.data || sJson);
    }, [projectId, token]);

    useEffect(() => { reload(); }, [reload]);

    // when you drag from column A to B:
    const onDragEnd = async (res: DropResult) => {
        if (!res.destination) return;
        const feat = features.find(f=>f._id===res.draggableId)!;
        const newStatus = res.destination.droppableId as FeatureStatus;
        const updated: Feature = { ...feat, status: newStatus };
        // if destination is a sprint column, also add sprintId:
        if (newStatus.startsWith('sprint:')) {
            const sprintId = newStatus.split(':')[1];
            updated.sprintIds = Array.from(new Set([...(feat.sprintIds||[]), sprintId]));
        }
        // optimistically update UI
        setFeatures(fs=>fs.map(f=>f._id===feat._id ? updated : f));
        // persist
        const token = localStorage.getItem('token');
        await fetch(`/api/features/${feat._id}`, {
            method: 'PUT',
            headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
            body: JSON.stringify(updated),
        });
    };

    // optionally filter features by sprint
    const shown = filterSprint
        ? features.filter(f=>f.sprintIds.includes(filterSprint))
        : features;

    // --- modal form to add sprint ---
    const { register, handleSubmit, reset, formState:{ errors, isSubmitting } } = useForm<{
        name: string;
        startDate: string;
        endDate: string;
    }>();

    const onAddSprint = async (data: { name:string, startDate:string, endDate:string }) => {
        await fetch('/api/sprints', {
            method: 'POST',
            headers: {
                'Content-Type':'application/json',
                Authorization:`Bearer ${token}`
            },
            body: JSON.stringify({
                projectId,
                name: data.name,
                startDate: data.startDate,
                endDate: data.endDate
            })
        });
        reset();
        setModalOpen(false);
        await reload();
    };

    return (
        <div className="p-8 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl">Feature Board</h1>
                <div className="flex items-center space-x-4">
                    <select
                        value={filterSprint}
                        onChange={e=>setFilter(e.target.value)}
                        className="border px-2 py-1 rounded"
                    >
                        <option value="">— All Sprints —</option>
                        {sprints.map(s=>(
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={()=>setModalOpen(true)}
                        className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                        + Add Sprint
                    </button>
                </div>
            </header>

            <nav className="flex space-x-4 mb-6">
                <Link
                    href={`/features/new?projectId=${projectId}`}
                    className="px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                >
                    New Feature
                </Link>
            </nav>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-4 gap-4">
                    {statuses.map(status=>(
                        <Droppable key={status} droppableId={status}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="bg-white rounded shadow p-4 flex flex-col"
                                >
                                    <h2 className="font-semibold mb-2 capitalize">{status}</h2>
                                    <div className="space-y-2 flex-1">
                                        {shown.filter(f=>f.status===status).map((feat, idx) => (
                                            <Draggable key={feat._id} draggableId={feat._id} index={idx}>
                                                {(prov) => {
                                                    // assume your Feature type now also has completedPoints
                                                    const pct = feat.storyPoints > 0
                                                        ? Math.min(100, (feat.completedPoints / feat.storyPoints) * 100)
                                                        : 0;

                                                    return (
                                                        <div
                                                            ref={prov.innerRef}
                                                            {...prov.draggableProps}
                                                            {...prov.dragHandleProps}
                                                            className="bg-primary-50 p-3 rounded shadow-sm cursor-move flex flex-col space-y-2"
                                                        >
                                                            {/* header row: title + edit */}
                                                            <div className="flex justify-between items-start">
                                                                <p className="font-medium">{feat.title}</p>
                                                                <Link
                                                                    href={`/features/${feat._id}/edit`}
                                                                    className="text-xs text-primary-600 hover:underline"
                                                                >
                                                                    Edit
                                                                </Link>
                                                            </div>

                                                            {/* description */}
                                                            <p className="text-sm text-neutral-700 line-clamp-2">
                                                                {feat.description || <em>No description</em>}
                                                            </p>

                                                            {/* progress bar */}
                                                            <div className="w-full h-1 bg-neutral-light rounded overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary-600"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>

                                                            {/* footer row: SP badge and completed */}
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="inline-block bg-primary-200 text-primary-800 rounded-full px-2 py-0.5">
                                                                  {feat.storyPoints} SP
                                                                </span>
                                                                <span className="text-neutral-600">
                                                                  {feat.completedPoints}/{feat.storyPoints}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            </Draggable>
                                        ))}

                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    ))}

                    {/* Bonus: one more column for unassigned-to-sprint */}
                    <Droppable droppableId="unassigned">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="bg-gray-100 rounded shadow p-4 flex flex-col"
                            >
                                <h2 className="font-semibold mb-2">Unassigned to Sprint</h2>
                                <div className="space-y-2 flex-1">
                                    {shown.filter(f => f.sprintIds.length === 0).map((feat, idx) => (
                                        <Draggable key={feat._id} draggableId={feat._id} index={idx}>
                                            {prov => (
                                                <div
                                                    ref={prov.innerRef}
                                                    {...prov.draggableProps}
                                                    {...prov.dragHandleProps}
                                                    className="bg-primary-50 p-3 rounded shadow-sm cursor-move"
                                                >
                                                    <p className="font-medium">{feat.title}</p>
                                                    <p className="text-xs text-neutral">SP: {feat.storyPoints}</p>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            </div>
                        )}
                    </Droppable>
                </div>
            </DragDropContext>

            {/* --- Add Sprint Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded shadow-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-semibold mb-4">New Sprint</h2>
                        <form onSubmit={handleSubmit(onAddSprint)} className="space-y-4">
                            <div>
                                <label className="block mb-1">Name</label>
                                <input
                                    {...register('name',{ required:'Required' })}
                                    className="w-full border px-3 py-2 rounded"
                                />
                                {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
                            </div>
                            <div>
                                <label className="block mb-1">Start Date</label>
                                <input
                                    type="date"
                                    {...register('startDate',{ required:'Required' })}
                                    className="w-full border px-3 py-2 rounded"
                                />
                                {errors.startDate && <p className="text-red-600 text-sm">{errors.startDate.message}</p>}
                            </div>
                            <div>
                                <label className="block mb-1">End Date</label>
                                <input
                                    type="date"
                                    {...register('endDate',{ required:'Required' })}
                                    className="w-full border px-3 py-2 rounded"
                                />
                                {errors.endDate && <p className="text-red-600 text-sm">{errors.endDate.message}</p>}
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    type="button"
                                    onClick={()=>{ reset(); setModalOpen(false); }}
                                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving…' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
