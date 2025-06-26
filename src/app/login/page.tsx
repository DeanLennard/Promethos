// app/login/page.tsx
"use client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

type FormData = { email: string; password: string };

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();
    const router = useRouter();

    const onSubmit = async (data: FormData) => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Login failed");
            const { token } = await res.json();
            localStorage.setItem("token", token);
            router.push("/");
        } catch {
            alert("Invalid email or password");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-primary-50">
            <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-card">
                <h1 className="text-3xl font-semibold text-primary-700 text-center">
                    Welcome back
                </h1>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {[
                        { label: "Email", name: "email" },
                        { label: "Password", name: "password", type: "password" },
                    ].map(({ label, name, type = "text" }) => (
                        <div key={name}>
                            <label className="block text-neutral mb-1">{label}</label>
                            <input
                                type={type}
                                {...register(name as keyof FormData, { required: `${label} is required` })}
                                className="w-full rounded border border-neutral-light px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                            />
                            {errors[name as keyof FormData] && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors[name as keyof FormData]?.message}
                                </p>
                            )}
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded bg-primary-600 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                        {isSubmitting ? "Signing in…" : "Login"}
                    </button>
                </form>
                <p className="text-center text-sm text-neutral">
                    Don’t have an account?{" "}
                    <a href="/register" className="font-medium text-accent-600 hover:text-accent-700">
                        Register
                    </a>
                </p>
            </div>
        </div>
    );
}
