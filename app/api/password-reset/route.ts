import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import crypto from "crypto";
import { emailTemplates } from "@/lib/email"; // apna path

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // 1. Check user exists
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("userId, name, email")
            .eq("email", trimmedEmail)
            .single();

        if (userError || !user) {
            return NextResponse.json({ success: false, error: "User not found with this email" }, { status: 404 });
        }

        // 2. Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // 3. Delete old tokens for this email
        await supabase
            .from("password_resets")
            .delete()
            .eq("email", trimmedEmail);

        // 4. Save new token in DB
        const { error: insertError } = await supabase
            .from("password_resets")
            .insert({
                email: trimmedEmail,
                token,
                expires_at: expiresAt.toISOString(),
                used: false,
            });

        if (insertError) {
            return NextResponse.json({ success: false, error: "Failed to generate reset token" }, { status: 500 });
        }

        // 5. Build reset link
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/update-password?token=${token}`;

        // 6. Format expiry time
        const expiryTime = expiresAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
        });

        // 7. Get email template
        const template = emailTemplates.passwordReset({
            name: user.name,
            email: trimmedEmail,
            resetLink,
            expiryTime,
        });

        // 8. Send email via your SMTP API
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: trimmedEmail,
                subject: template.subject,
                text: template.text,
                html: template.html,
            }),
        }).catch(err => console.error("Email send failed:", err));

        return NextResponse.json({ success: true, message: "Password reset email sent" });

    } catch (err: any) {
        console.error("Password reset error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}