import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client — service role key use karo
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ success: false, error: "Token and password are required" }, { status: 400 });
        }

        // 1. Token DB mein dhundo
        const { data: resetRecord, error: fetchError } = await supabaseAdmin
            .from("password_resets")
            .select("*")
            .eq("token", token)
            .single();

        if (fetchError || !resetRecord) {
            return NextResponse.json({ success: false, error: "Invalid or expired reset link" }, { status: 400 });
        }

        // 2. Check — already used?
        if (resetRecord.used) {
            return NextResponse.json({ success: false, error: "This reset link has already been used" }, { status: 400 });
        }

        // 3. Check — expired?
        if (new Date() > new Date(resetRecord.expires_at)) {
            await supabaseAdmin.from("password_resets").delete().eq("token", token);
            return NextResponse.json({ success: false, error: "Reset link has expired. Please request a new one." }, { status: 400 });
        }

        // 4. User ID lo from auth
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) {
            return NextResponse.json({ success: false, error: "Failed to fetch user" }, { status: 500 });
        }

        const authUser = authUsers.users.find(u => u.email === resetRecord.email);
        if (!authUser) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // 5. Password update karo
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { password }
        );

        if (updateError) {
            return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 });
        }

        // 6. Token mark as used
        await supabaseAdmin
            .from("password_resets")
            .update({ used: true })
            .eq("token", token);

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (err: any) {
        console.error("Update password error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}