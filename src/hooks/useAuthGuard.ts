// src/hooks/useAuthGuard.ts
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthGuard() {
    const router = useRouter();
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.replace('/login');
        }
    }, [router]);
}
