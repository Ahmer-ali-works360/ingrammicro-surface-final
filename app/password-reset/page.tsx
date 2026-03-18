"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import APPCONSTANTS from "@/lib/constants/constant";
import { toast } from "sonner";

export default function Page() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setIsLoggedIn(!!data.session)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session)
        })

        return () => subscription.unsubscribe()
    }, [])

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!email.trim()) {
        setError("Email address is required");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return;
    }

    setLoading(true);
    setError("");

    try {
        const response = await fetch("/api/password-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            toast.error(data.error || "Failed to send reset email", {
                style: { background: "black", color: "white" },
            });
            return;
        }

        toast.success("Password reset link sent to your email", {
            style: { background: "black", color: "white" },
        });

        setEmail("");
    } catch (err: any) {
        toast.error("Something went wrong. Please try again.", {
            style: { background: "black", color: "white" },
        });
    } finally {
        setLoading(false);
    }
};


    return (
        <div className="relative min-h-screen">
            {/* Background image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/computer-mouse-object-background.jpg')",
                }}
            />

            {/* White overlay for entire content area */}
            <div className="absolute inset-0 top-0 bg-white/92"></div>

            {/* Content */}
            <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
                <div className="relative z-10 w-full max-w-md rounded-2xl border-8 border-gray-100 bg-white sm:px-10 px-6 py-14">
                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                            Password Reset
                        </h1>
                        <p className="text-gray-600 mb-8">
                            To reset your password, please enter your email address or username below.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block font-semibold text-gray-700 text-sm mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="Enter your work email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(""); // Clear error when user starts typing
                                }}
                                className={`w-full rounded-md border px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && error ? "border-red-500" : "border-gray-300"
                                    }`}
                            />
                            {submitted && error && (
                                <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-2">
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-md bg-[#1570EF] px-6 py-3 cursor-pointer font-semibold text-white transition-colors hover:bg-[#1660a0] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Sending..." : "Reset Password"}
                            </button>
                        </div>
                        {!isLoggedIn && (
                            <>
                                <div className="text-center pt-4">
                                    <p className="text-gray-600 text-sm">
                                        Remember your password?{" "}
                                        <a
                                            href="/login"
                                            className="font-semibold text-[#1D76BC] hover:text-[#1660a0] transition-colors"
                                        >
                                            Back to Login
                                        </a>
                                    </p>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}