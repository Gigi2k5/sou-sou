"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { useAuth } from "@/providers/auth-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <div className="size-12 rounded-full border-4 border-sousou-primary/30 border-t-sousou-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      {/* Auto-rendered : ne s'affiche que si user.hasCompletedOnboarding=false. */}
      <OnboardingModal />
    </>
  );
}
