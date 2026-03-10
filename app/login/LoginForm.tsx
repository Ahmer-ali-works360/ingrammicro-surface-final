"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { logger, logAuth, logError, logSuccess } from "@/lib/logger";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isloading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, isLoggedIn, loading, user } = useAuth();

  // ✅ Simple variable — no useState/useEffect needed
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

    if (!email.trim()) {
      newErrors.email = "E-mail Address is required";
      isValid = false;
    }
    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

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
      // ✅ Step 1: Normal Supabase login try karo
      const { data: normalAuthData, error: normalAuthError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!normalAuthError && normalAuthData?.user) {
        await handleSuccessfulLogin(normalAuthData.user.id, trimmedEmail, startTime, false);
        return;
      }

      // ✅ Step 2: Normal login fail — WordPress legacy migration try karo
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

        // ✅ Step 3: WP migration successful — ab Supabase login karo
        const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
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
      .select("isVerified, firstName, lastName, email, login_count, password, userId")
      .eq("email", userEmail)
      .single();

    if (userError) {
      await logError("db", "user_fetch_failed", `Failed to fetch user data: ${userError.message}`,
        userError, userId, source);
      toast.error("Unable to verify account status", {
        style: { background: "black", color: "white" },
      });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!userData?.isVerified) {
      await logger.warning("auth", "account_not_approved",
        `Login attempt for unapproved account: ${userEmail}`,
        { email: userEmail, userId, isLegacyMigration }, userId, source);
      toast.error("Your account is not approved yet.", {
        style: { background: "black", color: "white" },
      });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const previousCount = parseInt(userData?.login_count || "0", 10);

    // ✅ Background DB updates — user wait nahi karega
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

      Promise.all(dbUpdates).catch(err =>
        console.error("Background DB update failed:", err)
      );

    // ✅ Logs bhi background mein
    logger.info("auth", "login_stats_updated", `Login stats updated for user: ${userEmail}`, {
      email: userEmail, userId, previousCount, executionTime, isLegacyMigration
    }, userId, source);

    logSuccess("auth", "login_successful",
      `User logged in ${isLegacyMigration ? "via legacy migration" : "normally"}: ${userEmail}`, {
      email: userEmail, userId, executionTime, isLegacyMigration,
      userData: {
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        isVerified: userData?.isVerified,
        loginCount: userData?.login_count,
      }
    }, userId, source);

    toast.success("Login successful!", {
      style: { background: "black", color: "white" },
    });

    const redirectTo = searchParams.get("redirect_to");
    const redirectPath = redirectTo ? `/${redirectTo}` : "/";

    logger.info("auth", "redirecting_after_login",
      `Redirecting user to: ${redirectPath}`, {
      email: userEmail, userId, redirectPath, isLegacyMigration
    }, userId, source);

    // ✅ Direct redirect — state clear karna pointless tha
    router.push(redirectPath);
  };

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/computer-mouse-object-background.jpg')" }}
      />
      <div className="absolute inset-0 top-0 bg-white/92"></div>

      <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
        <div className="relative z-10 w-full max-w-md rounded-2xl border-8 border-gray-100 bg-white sm:px-13 px-6 py-14">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="text-center text-2xl font-normal text-black">Login</h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form onSubmit={signin} className="space-y-4">
              <div className="my-3">
                <label htmlFor="email" className="font-semibold text-gray-700 text-sm">Email</label>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && errors.email ? "border-red-500" : "border-gray-300"}`}
                />
                {submitted && errors.email && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">{errors.email}</div>
                )}
              </div>

              <div className="my-3">
                <label htmlFor="password" className="font-semibold text-gray-700 text-sm">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && errors.password ? "border-red-500" : "border-gray-300"}`}
                />
                {submitted && errors.password && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">{errors.password}</div>
                )}
              </div>

              <div className="flex w-full gap-4 mt-6">
                <div className="flex-1">
                  <button
                    type="submit"
                    disabled={isloading}
                    className="w-full rounded-md bg-[#1D76BC] px-6 py-3 cursor-pointer font-semibold text-white transition-all hover:bg-[#1660a0] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isloading ? "Please wait..." : "Login"}
                  </button>
                </div>
                <div className="flex-1">
                  <Link
                    href={"/account-registration"}
                    className="flex items-center justify-center w-full rounded-md bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:shadow-md border border-gray-300"
                  >
                    Register
                  </Link>
                </div>
              </div>

              <Link
                href={"/password-reset"}
                className="flex justify-center font-normal text-[#7c7c7c] hover:text-[#1D76BC] transition-colors mt-6"
              >
                <h4>Forgot your password?</h4>
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}