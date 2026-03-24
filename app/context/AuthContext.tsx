'use client';

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
    id: string;
    name: string;
    email: string;
    role: string;
    userId: string;
    reseller: string;
    isVerified: boolean;
    login_at: string | null;
    login_count: string | null;
};

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isLoggedIn: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const currentUserId = useRef<string | null>(null); // ✅ Track current user ID

    const fetchProfile = async (authUser: User | null) => {
        if (!authUser) {
            setProfile(null);
            setIsLoggedIn(false);
            currentUserId.current = null;
            return;
        }

        // ✅ Same user hai toh dobara fetch mat karo
        if (currentUserId.current === authUser.id) {
            return;
        }

        // Pehle userId se try karo (normal users ke liye fast)
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("userId", authUser.id)
            .eq("isVerified", true)
            .single();

        if (!error && data) {
            setProfile(data);
            setIsLoggedIn(true);
            currentUserId.current = authUser.id; // ✅ Save current user ID
            return;
        }

        // Agar nahi mila toh migrate user ho sakta hai - email se try karo
        const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("email", authUser.email)
            .single();

        if (existingUser?.userId == null) {
            await supabase
                .from('users')
                .update({ userId: authUser?.id, password: null })
                .eq('email', authUser.email);
        }

        // Update ke baad dobara fetch
        const { data: updatedUser, error: updatedError } = await supabase
            .from("users")
            .select("*")
            .eq("userId", authUser.id)
            .eq("isVerified", true)
            .single();

        if (!updatedError && updatedUser) {
            setProfile(updatedUser);
            setIsLoggedIn(true);
            currentUserId.current = authUser.id; // ✅ Save current user ID
        } else {
            setProfile(null);
            setIsLoggedIn(false);
            currentUserId.current = null;
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);

            const { data } = await supabase.auth.getSession();
            const authUser = data.session?.user ?? null;
            setUser(authUser);

            if (authUser) {
                await fetchProfile(authUser);
            } else {
                setIsLoggedIn(false);
                setProfile(null);
            }

            setLoading(false);
        };

        loadUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setLoading(true); // ✅ Tab switch par loading true karo

            const authUser = session?.user ?? null;
            setUser(authUser);

            if (authUser) {
                await fetchProfile(authUser);
            } else {
                setIsLoggedIn(false);
                setProfile(null);
            }

            setLoading(false);
        });

        return () => subscription?.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, isLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}