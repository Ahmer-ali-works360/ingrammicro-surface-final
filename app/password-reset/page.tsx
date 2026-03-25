"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IoCheckmarkSharp, IoPersonAdd } from "react-icons/io5";
import { LuLogIn } from "react-icons/lu";

export default function Page() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setIsLoggedIn(!!data.session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

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
         <div className="flex-1 flex items-center justify-center w-full bg-[#fbfbfd]">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-145px)]">

      {/* Left Info Panel */}
      
        <div className="flex lg:flex bg-linear-to-b from-[#1D76BC] to-[#1660a0] text-white lg:pl-10 2xl:pl-20 items-center">
          <div className="max-w-2xl space-y-5 2xl:space-y-10">
          <div>
              <h2 className="lg:text-[32px] 2xl:text-[40px] font-semibold mb-4">Welcome to Ingram Micro and Microsoft Surface</h2>
              <p className="text-white/90 lg:text-[18px] xl:text-[20px] 2xl:text-[22px] lg:max-w-[440px] xl:max-w-[550px] 2xl:max-w-[600px]">
                Get started by registering your account and follow the simple steps to create and manage your Demo Kits.
              </p>
          </div>
          <div className="space-y-6 lg:space-y-3 2xl:space-y-6 lg:mt-10 2xl:mt-0">
            <div>
              <div className="font-semibold text-lg flex gap-2 items-center mt-1"><IoPersonAdd /> Register</div>
              <div className="text-white/90 text-md mt-1">Fill out a quick registration form if not registered yet.</div>
            </div>

            <div>
              <div className="font-semibold text-lg flex gap-2 items-center mt-1"><IoCheckmarkSharp /> Approval</div>
              <div className="text-white/90 text-md mt-1">Your registration will be approved by the Program Manager.</div>
            </div>

            <div>
              <div className="font-semibold text-lg flex gap-2 items-center mt-1"><LuLogIn /> Login</div>
              <div className="text-white/90 text-md mt-1">Sign in to your account once it’s approved.</div>
            </div>
          </div>
          
          </div>
        </div>


            {/* ── RIGHT PANEL ── */}
            <div className="bg-white flex items-center justify-center overflow-hidden p-4">
                <div className="w-full max-w-xl bg-white border border-gray-200 rounded-xl shadow-sm sm:p-18 p-8">

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <img
                            src="/reset-pass.png"
                            alt="Reset Password"
                            className="w-10 h-10 object-contain"
                        />
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                            Reset Password
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Enter your email to receive a password reset link
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block font-semibold text-gray-700 text-sm mb-1.5"
                            >
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="enter your email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                }}
                                className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition ${
                                    submitted && error
                                        ? "border-red-400 focus:ring-red-100"
                                        : "border-gray-300 focus:ring-blue-100 focus:border-blue-400"
                                }`}
                            />
                            {submitted && error && (
                                <div className="bg-red-500 text-white px-3 py-2 text-xs rounded-md mt-2">
                                    {error}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg px-6 py-3 font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{ backgroundColor: "#1570EF" }}
                            onMouseEnter={(e) =>
                                !loading && ((e.target as HTMLElement).style.backgroundColor = "#1660a0")
                            }
                            onMouseLeave={(e) =>
                                ((e.target as HTMLElement).style.backgroundColor = "#1570EF")
                            }
                        >
                            {loading ? "Sending..." : "Reset Password"}
                        </button>

                        {!isLoggedIn && (
                            <div className="text-center pt-2">
                                <p className="text-gray-500 text-sm">
                                    Remember your password?{" "}
                                    <a
                                        href="/login"
                                        className="font-semibold transition-colors"
                                        style={{ color: "#1570EF" }}
                                    >
                                        Back to Login
                                    </a>
                                </p>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
        </div>
    );
}