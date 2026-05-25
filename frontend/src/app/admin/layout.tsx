"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { useAuth } from "@/providers/auth-provider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    } else if (!loading && user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-svh flex items-center justify-center bg-sousou-secondary">
        <div className="size-12 rounded-full border-4 border-white/20 border-t-sousou-primary animate-spin" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
