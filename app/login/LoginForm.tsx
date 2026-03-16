//src/app/login/LoginForm.tsx

"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { logger, logAuth, logError, logSuccess } from "@/lib/logger";
import { LuLogIn } from "react-icons/lu";
import { IoCheckmarkSharp, IoPersonAdd } from "react-icons/io5";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isloading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, isLoggedIn, loading, user } = useAuth();

  const source = typeof window !== "undefined"
    ? `${window.location.origin}/login`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`;

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn && profile?.isVerified === true) {
      const redirectTo = searchParams.get("redirect_to");
      const redirectPath = redirectTo ? `/${redirectTo}` : "/";
      logAuth("auto_redirect", `User already logged in, redirecting to ${redirectPath}`, user?.id, undefined, "completed", source);
      router.push(redirectPath);
    }
  }, [loading, isLoggedIn, profile, router, searchParams, user?.id, source]);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;
    if (!email.trim()) { newErrors.email = "E-mail Address is required"; isValid = false; }
    if (!password) { newErrors.password = "Password is required"; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const signin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const startTime = Date.now();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();

    try {
      const { data: normalAuthData, error: normalAuthError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail, password,
      });

      if (!normalAuthError && normalAuthData?.user) {
        await handleSuccessfulLogin(normalAuthData.user.id, trimmedEmail, startTime, false);
        return;
      }

      try {
        const verifyResponse = await fetch("/api/user-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();
          try {
            const errorData = JSON.parse(errorText);
            toast.error(errorData.error || "Invalid credentials");
          } catch {
            toast.error("Authentication failed. Please try again.");
          }
          setLoading(false);
          return;
        }

        const verifyData = await verifyResponse.json();
        if (!verifyData.success) {
          toast.error(verifyData.error || "Invalid credentials");
          setLoading(false);
          return;
        }

        const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail, password,
        });

        if (newAuthError) {
          toast.error("Login failed after migration. Please reset your password.");
          setLoading(false);
          return;
        }

        await handleSuccessfulLogin(newAuthData.user.id, trimmedEmail, startTime, true);

      } catch {
        toast.error("Authentication service unavailable");
        setLoading(false);
      }
    } catch {
      toast.error("Authentication error. Please try again.");
      setLoading(false);
    }
  };

  const handleSuccessfulLogin = async (
    userId: string,
    userEmail: string,
    startTime: number,
    isLegacyMigration: boolean
  ) => {
    const executionTime = Date.now() - startTime;

    if (!userId) {
      await logError("auth", "user_id_missing", "No user ID returned after successful login",
        { email: userEmail, isLegacyMigration }, "", source);
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("isVerified, name, email, login_count, password, userId")
      .eq("email", userEmail)
      .single();

    if (userError) {
      await logError("db", "user_fetch_failed", `Failed to fetch user data: ${userError.message}`,
        userError, userId, source);
      toast.error("Unable to verify account status", { style: { background: "black", color: "white" } });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!userData?.isVerified) {
      await logger.warning("auth", "account_not_approved",
        `Login attempt for unapproved account: ${userEmail}`,
        { email: userEmail, userId, isLegacyMigration }, userId, source);
      toast.error("Your account is not approved yet.", { style: { background: "black", color: "white" } });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const previousCount = parseInt(userData?.login_count || "0", 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUpdates: any[] = [
      supabase.from("users").update({
        login_at: new Date().toISOString().split("T")[0],
        login_count: String(previousCount + 1),
      }).eq("userId", userId)
    ];

    if (userData?.userId == null || userData?.password != null) {
      dbUpdates.push(
        supabase.from("users").update({ userId, password: null }).eq("email", userEmail),
        supabase.from("wp_pass").delete().eq("email", userEmail)
      );
    }

    Promise.all(dbUpdates).catch(err => console.error("Background DB update failed:", err));

    logger.info("auth", "login_stats_updated", `Login stats updated for user: ${userEmail}`, {
      email: userEmail, userId, previousCount, executionTime, isLegacyMigration
    }, userId, source);

    logSuccess("auth", "login_successful",
      `User logged in ${isLegacyMigration ? "via legacy migration" : "normally"}: ${userEmail}`, {
      email: userEmail, userId, executionTime, isLegacyMigration,
      userData: { name: userData?.name, isVerified: userData?.isVerified, loginCount: userData?.login_count }
    }, userId, source);

    toast.success("Login successful!", { style: { background: "black", color: "white" } });

    const redirectTo = searchParams.get("redirect_to");
    const redirectPath = redirectTo ? `/${redirectTo}` : "/";

    logger.info("auth", "redirecting_after_login", `Redirecting user to: ${redirectPath}`, {
      email: userEmail, userId, redirectPath, isLegacyMigration
    }, userId, source);

    router.push(redirectPath);
  };




return (
    <div className="flex-1 flex items-center justify-center w-full bg-[#fbfbfd]">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch min-h-[800px]">

        {/* Left Info Panel */}
        <div className="bg-linear-to-b from-[#1D76BC] to-[#1660a0] text-white p-10 flex flex-col justify-center">
          <h2 className="text-4xl font-semibold mb-4">Welcome to Ingram Micro and Microsoft Surface</h2>
          <p className="text-lg text-white/90 mb-8 max-w-lg">
            Get started by registering your account and follow the simple steps to create and manage your Demo Kits.
          </p>

          <div className="space-y-6 text-sm">
            <div>
              <div className="font-semibold text-xl flex gap-2 items-center"><IoPersonAdd /> Register</div>
              <div className="text-white/90 text-lg mt-2">Fill out a quick registration form if not registered yet.</div>
            </div>

            <div>
              <div className="font-semibold text-xl flex gap-2 items-center"><IoCheckmarkSharp /> Approval</div>
              <div className="text-white/90 text-lg mt-2">Your registration will be approved by the Program Manager.</div>
            </div>

            <div>
              <div className="font-semibold text-xl flex gap-2 items-center"><LuLogIn /> Login</div>
              <div className="text-white/90 text-lg mt-2">Sign in to your account once it’s approved.</div>
            </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-xl shadow-sm sm:p-24 p-8">
            <h2 className="text-center text-2xl font-medium text-gray-800 mb-8">
              Login
            </h2>

            <form onSubmit={signin} className="space-y-5">
              {/* Email */}
              <div className="my-8">
                <label className="font-semibold text-gray-700 text-sm">
                  Email
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 transition ${submitted && errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                />
                {submitted && errors.email && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="my-8">
                <label className="font-semibold text-gray-700 text-sm">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`mt-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 transition ${submitted && errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                />
                {submitted && errors.password && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-2 my-8">
                <button
                  type="submit"
                  disabled={isloading}
                  className="flex-1 rounded-md bg-[#1570EF] cursor-pointer px-6 py-3 font-semibold text-white hover:bg-[#1660a0] disabled:opacity-50"
                >
                  {isloading ? "Please wait..." : "Login"}
                </button>

                <Link
                  href={"/account-registration"}
                  className="flex-1 flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Register
                </Link>
              </div>

              <Link
                href={"/password-reset"}
                className="block text-center text-sm text-gray-500 hover:text-[#1660a0] pt-2"
              >
                Forgot your password?
              </Link>
            </form>
          </div>
        </div>

      </div>
    </div>
  );


}