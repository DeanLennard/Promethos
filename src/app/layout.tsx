import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Promethos",
  description: "The Programme Management Tool",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <body className="font-sans bg-primary-50 text-neutral flex flex-col min-h-screen">
        <Header />

        <div className="flex flex-1 overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-auto p-6">
                {children}
            </main>
        </div>

        <Footer />
        </body>
        </html>
    );
}