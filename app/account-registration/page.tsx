// src/app/account-registration/page.tsx

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
      if (data.session) router.replace("/");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;
    if (!email.trim()) { newErrors.email = "E-mail Address is required"; isValid = false; }
    if (!password) { newErrors.password = "Password is required"; isValid = false; }
    if (password && ConfirmPassword && password !== ConfirmPassword) { newErrors.password = "Passwords do not match"; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const formatRegistrationDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // const getAdminEmails = async (): Promise<string[]> => {
  //   try {
  //     const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
  //     const { data: admins, error } = await supabase.from("users").select("email").eq("role", adminRole).not("email", "is", null);
  //     if (error) return [];
  //     return admins.map((admin: { email: string }) => admin.email).filter((e: string) => e && e.trim() !== "");
  //   } catch { return []; }
  // };

  const sendRegistrationEmails = async (name: string, userEmail: string, resellerName: string, registrationDate: string) => {
    try {
      // const adminEmails = await getAdminEmails();
      // const mergedAdminEmails = [...new Set([...adminEmails, ...UserRegisterEmail])];
      const mergedAdminEmails = UserRegisterEmail.filter((e) => e && e.trim() !== "");
      const userEmailData = { name, email: userEmail, reseller: resellerName, registrationDate };
      const adminTemplate = emailTemplates.registrationAdminNotification(userEmailData);
      await sendEmail({ to: process.env.NODE_ENV === "development" ? ["ahmer.ali@works360.com"] : mergedAdminEmails, subject: adminTemplate.subject, text: adminTemplate.text, html: adminTemplate.html });
      const userTemplate = emailTemplates.registrationUserWaiting(userEmailData);
      await sendEmail({ to: userEmail, subject: userTemplate.subject, text: userTemplate.text, html: userTemplate.html });
    } catch { }
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!validateForm()) return;
    const startTime = Date.now();
    const source = `${process.env.NEXT_PUBLIC_APP_URL || ""}/account-registration`;
    setLoading(true);
    try {
      const { data: existingUsers, error: selectError } = await supabase.from("users").select("userId").eq("email", email);
      if (selectError && selectError.code !== "PGRST116") { toast.error(selectError.message || "Error checking existing users", { style: { background: "black", color: "white" } }); setLoading(false); return; }
      if (existingUsers && existingUsers.length > 0) { toast.error("User already exists with this email", { style: { background: "black", color: "white" } }); setLoading(false); return; }
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { toast.error(authError.message || "Signup failed", { style: { background: "black", color: "white" } }); setLoading(false); return; }
      const userId = authData.user?.id;
      if (!userId) { toast.error("Signup failed: No user ID returned.", { style: { background: "black", color: "white" } }); setLoading(false); return; }
      const today = new Date().toISOString().split("T")[0];
      const registrationDate = formatRegistrationDate();
      const { error: dbError } = await supabase.from("users").insert({ userId, name, email, role: process.env.NEXT_PUBLIC_SUBSCRIBER, reseller, registered_at: today, login_at: today, login_count: 1, isVerified: false });
      if (dbError) { toast.error(dbError.message || "Error saving user data", { style: { background: "black", color: "white" } }); setLoading(false); return; }
      await supabase.auth.signOut();
      sendRegistrationEmails(name, email, reseller, registrationDate);
      setEmail(""); setName(""); setPassword(""); setConfirmPassword(""); setReseller("");
      toast.success("Registration successful! Awaiting for PM approval.", { style: { background: "black", color: "white" } });
      router.push("/login");
    } catch (err: any) {
      toast.error(err?.message || "An unexpected error occurred", { style: { background: "black", color: "white" } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-2">

      {/* Left Info Panel */}
      <div className="bg-gradient-to-b from-[#1D76BC] to-[#1660a0] text-white p-6 lg:p-8 flex flex-col justify-center overflow-hidden">
        <h2 className="text-2xl lg:text-3xl xl:text-4xl font-semibold mb-3 max-w-xl">
          Welcome to Ingram Micro and Microsoft Surface
        </h2>
        <p className="text-sm lg:text-base text-white/90 mb-6 max-w-md">
          Get started by registering your account and follow the simple steps to create and manage your Demo Kits.
        </p>

        <div className="space-y-4 text-sm">
          <div>
            <div className="font-semibold text-base lg:text-lg flex gap-2 items-center"><IoPersonAdd /> Register</div>
            <div className="text-white/90 text-sm lg:text-base mt-1 max-w-lg">Fill out a quick registration form if not registered yet.</div>
          </div>
          <div>
            <div className="font-semibold text-base lg:text-lg flex gap-2 items-center"><IoCheckmarkSharp /> Approval</div>
            <div className="text-white/90 text-sm lg:text-base mt-1 max-w-md">Your registration will be approved by the Program Manager.</div>
          </div>
          <div>
            <div className="font-semibold text-base lg:text-lg flex gap-2 items-center"><LuLogIn /> Login</div>
            <div className="text-white/90 text-sm lg:text-base mt-1 max-w-lg">Sign in to your account once it's approved.</div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="bg-white flex items-center justify-center overflow-hidden p-4">
        <div className="w-full max-w-md border-2 rounded-lg p-5 lg:p-6">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-5">Registration</h2>

          <form onSubmit={signup} className="space-y-3">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-lg border bg-gray-100 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${submitted && errors.email ? "border-red-500 bg-red-50" : "border-transparent"}`}
              />
              {submitted && errors.email && (
                <div className="bg-[#c74a4a] text-white px-3 py-1.5 text-sm rounded mt-1">{errors.email}</div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-gray-100 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Reseller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reseller</label>
              <input
                type="text"
                value={reseller}
                onChange={(e) => setReseller(e.target.value)}
                className="w-full rounded-lg border border-transparent bg-gray-100 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-lg border bg-gray-100 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${submitted && errors.password ? "border-red-500 bg-red-50" : "border-transparent"}`}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={ConfirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-lg border bg-gray-100 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition ${submitted && errors.password ? "border-red-500 bg-red-50" : "border-transparent"}`}
              />
              {submitted && errors.password && (
                <div className="bg-[#c74a4a] text-white px-3 py-1.5 text-sm rounded mt-1">{errors.password}</div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-[#1570EF] px-6 py-2.5 font-semibold text-white transition-all cursor-pointer hover:bg-[#1660a0] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing up..." : "Register"}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}