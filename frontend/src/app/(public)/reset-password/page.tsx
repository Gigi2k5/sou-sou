"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, extractApiErrorMessage } from "@/lib/api";
import {
  type ResetPasswordValues,
  resetPasswordSchema,
} from "@/lib/auth-schemas";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function AuthCardSkeleton() {
  return (
    <AuthCard title="Chargement..." description="Un instant.">
      <div className="h-32" />
    </AuthCard>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) {
      toast.error("Lien invalide — token manquant.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        password: values.password,
      });
      toast.success("Mot de passe mis à jour. Connecte-toi !");
      router.push("/login");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Réinitialisation impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthCard
        title="Lien invalide"
        description="Ce lien de réinitialisation est incomplet ou expiré."
        footer={
          <Link
            href="/forgot-password"
            className="text-sousou-primary font-semibold hover:underline"
          >
            Demander un nouveau lien
          </Link>
        }
      >
        <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          Aucun token n&apos;a été fourni dans l&apos;URL.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Nouveau mot de passe"
      description="Choisis un mot de passe d'au moins 8 caractères."
      footer={
        <Link
          href="/login"
          className="text-sousou-primary font-semibold hover:underline"
        >
          Retour à la connexion
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            className="mt-1.5"
            aria-invalid={!!errors.password || undefined}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirme</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className="mt-1.5"
            aria-invalid={!!errors.confirmPassword || undefined}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={submitting}
        >
          {submitting ? "Mise à jour..." : "Réinitialiser"}
        </Button>
      </form>
    </AuthCard>
  );
}
