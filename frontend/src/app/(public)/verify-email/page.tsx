"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api";
import { type VerifyEmailValues, verifyEmailSchema } from "@/lib/auth-schemas";
import { useAuth } from "@/providers/auth-provider";

/** Doit rester aligné avec RESEND_COOLDOWN_MS côté backend. */
const RESEND_COOLDOWN_S = 60;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <VerifyEmailInner />
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

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const { verifyEmail, resendVerification } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // Le compte à rebours démarre à l'arrivée : un code vient d'être envoyé.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    setFocus("code");
  }, [setFocus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onResend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    try {
      await resendVerification(email);
      setCooldown(RESEND_COOLDOWN_S);
      toast.success("Nouveau code envoyé — regarde tes emails.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Envoi impossible"));
    } finally {
      setResending(false);
    }
  }, [email, cooldown, resendVerification]);

  async function onSubmit(values: VerifyEmailValues) {
    setSubmitting(true);
    try {
      const u = await verifyEmail({ email, code: values.code });
      toast.success("Compte vérifié — bienvenue chez Sou'Sou !");
      router.push(u.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Vérification impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  // Arrivée directe sur l'URL sans email : on ne peut rien vérifier.
  if (!email) {
    return (
      <AuthCard
        title="Lien incomplet"
        description="On ne sait pas quel compte vérifier. Reprends depuis la connexion."
        footer={
          <Link
            href="/login"
            className="text-sousou-primary font-semibold hover:underline"
          >
            Retour à la connexion
          </Link>
        }
      >
        <div className="rounded-2xl bg-sousou-primary-50 p-4 text-sm text-sousou-primary-700">
          Connecte-toi avec ton email et ton mot de passe : on te renverra ici
          automatiquement avec un nouveau code.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Vérifie ton email"
      description={`On a envoyé un code à 6 chiffres à ${email}. Il est valide 15 minutes.`}
      footer={
        <>
          Mauvaise adresse ?{" "}
          <Link
            href="/signup"
            className="text-sousou-primary font-semibold hover:underline"
          >
            Recommence l&apos;inscription
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="code">Code de vérification</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="mt-1.5 text-center text-2xl font-semibold tracking-[0.4em]"
            aria-invalid={!!errors.code || undefined}
            {...register("code")}
          />
          <FieldError message={errors.code?.message} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={submitting}
        >
          {submitting ? "Vérification..." : "Vérifier mon compte"}
        </Button>

        <div className="text-center text-sm text-sousou-neutral">
          Rien reçu ?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resending}
            className="text-sousou-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {cooldown > 0
              ? `Renvoyer le code (${cooldown}s)`
              : resending
                ? "Envoi..."
                : "Renvoyer le code"}
          </button>
        </div>

        <p className="text-center text-xs text-sousou-neutral">
          Pense à regarder dans tes spams.
        </p>
      </form>
    </AuthCard>
  );
}
