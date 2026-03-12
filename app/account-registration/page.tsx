"use client";

import { emailTemplates, sendEmail } from "@/lib/email";
import { UserRegisterEmail } from "@/lib/emailconst";
import { logAuth, logError, logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LuLogIn } from "react-icons/lu";
import { IoCheckmarkSharp, IoPersonAdd } from "react-icons/io5";

export default function Page() {
  const [email, setEmail] = useState("");
  
  const [name, setName] = useState("");
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

    name: string,
    userEmail: string,
    resellerName: string,
    registrationDate: string
  ) => {
    try {
      const adminEmails = await getAdminEmails();
      const mergedAdminEmails = [...new Set([...adminEmails, ...UserRegisterEmail])];
      const userEmailData = {name,  email: userEmail, reseller: resellerName, registrationDate };

      const adminTemplate = emailTemplates.registrationAdminNotification(userEmailData);
      await sendEmail({
        to: process.env.NODE_ENV === "development" ? ["ahmer.ali@works360.com"] : mergedAdminEmails,
        subject: adminTemplate.subject,
        text: adminTemplate.text,
        html: adminTemplate.html,
      });

      const userTemplate = emailTemplates.registrationUserWaiting(userEmailData);
      await sendEmail({ to: userEmail, subject: userTemplate.subject, text: userTemplate.text, html: userTemplate.html });
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
      const { data: existingUsers, error: selectError } = await supabase
        .from("users").select("userId").eq("email", email);

      if (selectError && selectError.code !== "PGRST116") {
        logError("auth", "user_check", `Error checking existing user: ${selectError.message}`, selectError, "", source);
        toast.error(selectError.message || "Error checking existing users", { style: { background: "black", color: "white" } });
        setLoading(false);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        logger.warning("auth", "duplicate_registration", `Duplicate registration attempt: ${email}`, { email }, "", source);
        toast.error("User already exists with this email", { style: { background: "black", color: "white" } });
        setLoading(false);
        return;
      }

      logAuth("registration_start", `Registration attempt: ${email}`, "", { email,name  }, "completed", source);

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

      if (authError) {
        logError("auth", "supabase_auth", `Auth error: ${authError.message}`, authError, "", source);
        toast.error(authError.message || "Signup failed", { style: { background: "black", color: "white" } });
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        logError("auth", "user_id_missing", "No user ID returned", { email, authData }, "", source);
        toast.error("Signup failed: No user ID returned.", { style: { background: "black", color: "white" } });
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const registrationDate = formatRegistrationDate();

      const { error: dbError } = await supabase.from("users").insert({
        userId, name, email,
        role: process.env.NEXT_PUBLIC_SUBSCRIBER, reseller,
        registered_at: today, login_at: today, login_count: 1, isVerified: false,
      });

      if (dbError) {
        logError("db", "user_insert", `Database insert error: ${dbError.message}`, dbError, userId, source);
        toast.error(dbError.message || "Error saving user data", { style: { background: "black", color: "white" } });
        setLoading(false);
        return;
      }

      logger.success("auth", "user_created", `User created: ${email}`, { userId, email, name, reseller }, userId, source);
      await supabase.auth.signOut();
      logAuth("auto_signout", "Auto-signed out after registration", userId, {}, "completed", source);

      sendRegistrationEmails(name, email, reseller, registrationDate);

      const executionTime = Date.now() - startTime;
      logger.success("auth", "registration_complete", `Registration completed: ${email}`, { email, name, reseller, execution_time_ms: executionTime }, userId, source);

      setEmail(""); setName(""); setPassword(""); setConfirmPassword(""); setReseller("");

      toast.success("Registration successful! Please wait for PM approval.", { style: { background: "black", color: "white" } });
      router.push("/login");
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      logError("system", "unexpected_error", `Unexpected error: ${err?.message || "Unknown"}`, { error: err?.message, stack: err?.stack, execution_time_ms: executionTime }, "", source);
      toast.error(err?.message || "An unexpected error occurred", { style: { background: "black", color: "white" } });
    } finally {
      setLoading(false);
    }
  };

  return (
   
        // <div className="flex-1 flex items-center justify-center w-full bg-[#fbfbfd]">
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

        {/* Left Info Panel */}
        <div className="bg-linear-to-b from-[#1D76BC] to-[#1660a0] text-white p-10 flex flex-col justify-center">
          <h2 className="text-4xl font-semibold mb-4 max-w-xl">Welcome to Ingram Micro and Microsoft Surface</h2>
          <p className="text-lg text-white/90 mb-8 max-w-lg">
            Get started by registering your account and follow the simple steps to create and manage your Demo Kits.
          </p>

          <div className="space-y-6 text-sm">
            <div>
              <div className="font-semibold text-xl flex gap-2 items-center"><IoPersonAdd /> Register</div>
              <div className="text-white/90 text-lg mt-2 max-w-lg">Fill out a quick registration form if not registered yet.</div>
            </div>

            <div>
              <div className="font-semibold text-xl flex gap-2 items-center"><IoCheckmarkSharp /> Approval</div>
              <div className="text-white/90 text-lg mt-2 max-w-md">Your registration will be approved by the Program Manager.</div>
            </div>

            <div>
              <div className="font-semibold text-xl flex gap-2 items-center"><LuLogIn /> Login</div>
              <div className="text-white/90 text-lg mt-2 max-w-lg">Sign in to your account once it’s approved.</div>
            </div>
          </div>
        </div>

        {/* Right: Form Panel */}
          <div className="bg-white border-2 rounded-lg sm:m-12 m-5 sm:p-10 p-8">
          <h2 className="text-3xl font-semibold text-gray-900 text-center mb-8">Registration</h2>

          <form onSubmit={signup} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg border bg-gray-100 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${
                  submitted && errors.email ? "border-red-500 bg-red-50" : "border-transparent"
                }`}
              />
              {submitted && errors.email && (
                <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">{errors.email}</div>
              )}
            </div>

            {/* Name:  */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-gray-100 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Reseller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reseller</label>
              <input
                type="text"
                value={reseller}
                onChange={(e) => setReseller(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-gray-100 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-lg border bg-gray-100 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${
                  submitted && errors.password ? "border-red-500 bg-red-50" : "border-transparent"
                }`}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={ConfirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-lg border bg-gray-100 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${
                  submitted && errors.password ? "border-red-500 bg-red-50" : "border-transparent"
                }`}
              />
              {submitted && errors.password && (
                <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">{errors.password}</div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-[#1D76BC] px-6 py-3 font-semibold text-white transition-all hover:bg-[#1660a0] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing up..." : "Register"}
              </button>
            </div>
          </form>
        </div>

      </div>
    // </div>
  );
}