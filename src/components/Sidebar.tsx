// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Projects", href: "/projects" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <nav className="hidden md:flex md:flex-col bg-primary-600 text-white w-56 p-6 space-y-4">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-3 py-2 rounded hover:bg-primary-700 ${
                            isActive ? "bg-primary-700" : ""
                        }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
