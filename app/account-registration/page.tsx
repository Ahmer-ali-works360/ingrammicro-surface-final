"use client";

import { emailTemplates, sendEmail } from "@/lib/email";
import { UserRegisterEmail } from "@/lib/emailconst";
import { logAuth, logError, logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Page() {
  const [email, setEmail] = useState("");
  const [FirstName, setFirstName] = useState("");
  const [LastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [ConfirmPassword, setConfirmPassword] = useState("");
  const [reseller, setReseller] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

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

    if (password && ConfirmPassword && password !== ConfirmPassword) {
      newErrors.password = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const formatRegistrationDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return now.toLocaleDateString("en-US", options);
  };

  const getAdminEmails = async (): Promise<string[]> => {
    try {
      const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;

      const { data: admins, error } = await supabase
        .from("users")
        .select("email")
        .eq("role", adminRole)
        .not("email", "is", null);

      if (error) return [];

      return admins
        .map((admin: { email: string }) => admin.email)
        .filter((e: string) => e && e.trim() !== "");
    } catch {
      return [];
    }
  };

  const sendRegistrationEmails = async (
    firstName: string,
    lastName: string,
    userEmail: string,
    resellerName: string,
    registrationDate: string
  ) => {
    try {
      const adminEmails = await getAdminEmails();

      const mergedAdminEmails = [
        ...new Set([...adminEmails, ...UserRegisterEmail]),
      ];

      const userEmailData = {
        firstName,
        lastName,
        email: userEmail,
        reseller: resellerName,
        registrationDate,
      };

      const adminTemplate = emailTemplates.registrationAdminNotification(userEmailData);
      await sendEmail({
        to:
          process.env.NODE_ENV === "development"
            ? ["ahmer.ali@works360.com"]
            : mergedAdminEmails,
        subject: adminTemplate.subject,
        text: adminTemplate.text,
        html: adminTemplate.html,
      });

      const userTemplate = emailTemplates.registrationUserWaiting(userEmailData);
      await sendEmail({
        to: userEmail,
        subject: userTemplate.subject,
        text: userTemplate.text,
        html: userTemplate.html,
      });
    } catch {
      // Email errors should not block registration
    }
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateForm()) return;

    const startTime = Date.now();
    const source = `${process.env.NEXT_PUBLIC_APP_URL || ""}/account-registration`;

    setLoading(true);

    try {
      // 1️⃣ Check if email already exists
      const { data: existingUsers, error: selectError } = await supabase
        .from("users")
        .select("userId")
        .eq("email", email);

      if (selectError && selectError.code !== "PGRST116") {
        await logError(
          "auth",
          "user_check",
          `Error checking existing user: ${selectError.message}`,
          selectError,
          "",
          source
        );
        toast.error(selectError.message || "Error checking existing users", {
          style: { background: "black", color: "white" },
        });
        setLoading(false);
        return;
      }

      // ✅ FIXED: was `!= 0` which caused issues with empty array comparison
      if (existingUsers && existingUsers.length > 0) {
        await logger.warning(
          "auth",
          "duplicate_registration",
          `Duplicate registration attempt: ${email}`,
          { email },
          "",
          source
        );
        toast.error("User already exists with this email", {
          style: { background: "black", color: "white" },
        });
        setLoading(false);
        return;
      }

      await logAuth(
        "registration_start",
        `Registration attempt: ${email}`,
        "",
        { email, firstName: FirstName, lastName: LastName },
        "completed",
        source
      );

      // 2️⃣ Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        await logError(
          "auth",
          "supabase_auth",
          `Auth error: ${authError.message}`,
          authError,
          "",
          source
        );
        toast.error(authError.message || "Signup failed", {
          style: { background: "black", color: "white" },
        });
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;

      if (!userId) {
        await logError(
          "auth",
          "user_id_missing",
          "No user ID returned",
          { email, authData },
          "",
          source
        );
        toast.error("Signup failed: No user ID returned.", {
          style: { background: "black", color: "white" },
        });
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const registrationDate = formatRegistrationDate();

      // 3️⃣ Insert user into users table
      const { error: dbError } = await supabase.from("users").insert({
        userId,
        firstName: FirstName,
        lastName: LastName,
        email,
        role: process.env.NEXT_PUBLIC_SUBSCRIBER,
        reseller,
        registered_at: today,
        login_at: today,
        login_count: 1,
        isVerified: false,
      });

      if (dbError) {
        await logError(
          "db",
          "user_insert",
          `Database insert error: ${dbError.message}`,
          dbError,
          userId,
          source
        );
        toast.error(dbError.message || "Error saving user data", {
          style: { background: "black", color: "white" },
        });
        setLoading(false);
        return;
      }

      await logger.success(
        "auth",
        "user_created",
        `User created: ${email}`,
        { userId, email, firstName: FirstName, lastName: LastName, reseller },
        userId,
        source
      );

      // 4️⃣ Sign out immediately after signup
      await supabase.auth.signOut();

      await logAuth(
        "auto_signout",
        "Auto-signed out after registration",
        userId,
        {},
        "completed",
        source
      );

      // 5️⃣ Send emails (non-blocking)
      sendRegistrationEmails(
        FirstName,
        LastName,
        email,
        reseller,
        registrationDate
      );

      const executionTime = Date.now() - startTime;
      await logger.success(
        "auth",
        "registration_complete",
        `Registration completed: ${email}`,
        {
          email,
          firstName: FirstName,
          lastName: LastName,
          reseller,
          execution_time_ms: executionTime,
        },
        userId,
        source
      );

      // 6️⃣ Clear form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      setConfirmPassword("");
      setReseller("");

      toast.success("Registration successful! Please wait for PM approval.", {
        style: { background: "black", color: "white" },
      });

      router.push("/login");
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      await logError(
        "system",
        "unexpected_error",
        `Unexpected error: ${err?.message || "Unknown"}`,
        {
          error: err?.message,
          stack: err?.stack,
          execution_time_ms: executionTime,
        },
        "",
        source
      );
      toast.error(err?.message || "An unexpected error occurred", {
        style: { background: "black", color: "white" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/computer-mouse-object-background.jpg')" }}
      />
      <div className="absolute inset-0 top-0 bg-white/92"></div>

      <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
        <div className="relative z-10 w-full max-w-md rounded-2xl border-8 border-gray-100 bg-white sm:px-10 px-6 py-14">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="text-center text-2xl font-normal text-black">Registration</h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form onSubmit={signup} className="space-y-4">
              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Email (Username)</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${
                    submitted && errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {submitted && errors.email && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">First Name</label>
                <input
                  type="text"
                  value={FirstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="my-2 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition"
                />
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Last Name</label>
                <input
                  type="text"
                  value={LastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="my-2 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition"
                />
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${
                    submitted && errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Confirm Password</label>
                <input
                  type="password"
                  value={ConfirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${
                    submitted && errors.password ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {submitted && errors.password && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Reseller</label>
                <input
                  type="text"
                  value={reseller}
                  onChange={(e) => setReseller(e.target.value)}
                  className="my-2 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition"
                />
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-56 rounded-md bg-[#1D76BC] px-6 py-3 font-semibold cursor-pointer text-white transition-colors hover:bg-[#1660a0] disabled:opacity-50"
                >
                  {loading ? "Signing up..." : "Sign up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}