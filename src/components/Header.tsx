// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        router.push("/login");
    };

    return (
        <header className="bg-white border-b border-neutral-light px-6 py-4 flex justify-between items-center shadow-sm">
            <Link href="/" className="text-2xl font-semibold text-primary-600">
                Promethos
            </Link>
            <button
                onClick={handleLogout}
                className="text-neutral hover:text-primary-600"
            >
                Logout
            </button>
        </header>
    );
}
