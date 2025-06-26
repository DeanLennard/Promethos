// src/app/projects/new/page.tsx
'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';

type FormData = {
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    currency: string;
    sprintLengthDays: number;
    budget: number;
};

const FIELDS: Array<{ label: string; name: keyof FormData; type: string }> = [
    { label: 'Name',               name: 'name',               type: 'text'   },
    { label: 'Code',               name: 'code',               type: 'text'   },
    { label: 'Start Date',         name: 'startDate',          type: 'date'   },
    { label: 'End Date',           name: 'endDate',            type: 'date'   },
    { label: 'Currency',           name: 'currency',           type: 'text'   },
    { label: 'Sprint Length (days)', name: 'sprintLengthDays', type: 'number' },
    { label: 'Budget',             name: 'budget',             type: 'number' },
];

export default function NewProjectPage() {
    useAuthGuard();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>();
    const router = useRouter();

    const onSubmit = async (data: FormData) => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            router.push('/projects');
        } else {
            alert('Error creating project');
        }
    };

    return (
        <div className="max-w-lg mx-auto p-8 bg-white shadow-card rounded mt-12">
            <h1 className="text-2xl font-semibold mb-4">New Project</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {FIELDS.map(({ label, name, type }) => (
                    <div key={name}>
                        <label className="block text-neutral mb-1">{label}</label>
                        <input
                            type={type}
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
                    {isSubmitting ? 'Saving…' : 'Create Project'}
                </button>
            </form>
        </div>
    );
}
