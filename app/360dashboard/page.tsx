"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();

    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const superSubscriberRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;

    const allowedRoles = [adminRole, superSubscriberRole].filter(Boolean);
    const isAuthorized = profile?.role && allowedRoles.includes(profile?.role);

    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            router.replace('/login/?redirect_to=360dashboard');
            return;
        }

        if (!isAuthorized) {
            router.replace('/product-category/alldevices');
            return;
        }
    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1570EF]"></div>
            </div>
        );
    }

return (
        <div className="fixed inset-0 bg-gray-50 overflow-hidden">
        <div className="absolute inset-0 top-16"> {/* top-16 = 64px navbar height */}
            <iframe
                src="https://lookerstudio.google.com/embed/reporting/e91840aa-eb1a-455d-a8f3-e01ec7f6c938/page/QnVsF"
                className="w-full h-full block"
                frameBorder={0}
                style={{ border: 0 }}
                allowFullScreen
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                loading="lazy"
                title="360 Dashboard"
            />
        </div>
    </div>
);
}