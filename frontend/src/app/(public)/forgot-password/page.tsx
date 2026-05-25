"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { FieldError } from "@/components/auth/field-error";
import { api, extractApiErrorMessage } from "@/lib/api";
import {
  type ForgotPasswordValues,
  forgotPasswordSchema,
} from "@/lib/auth-schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", values);
      setSubmitted(true);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Demande impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthCard
        title="Vérifie tes emails"
        description="Si un compte existe avec cette adresse, un lien de réinitialisation t'a été envoyé. Il est valide pendant 1 heure."
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
          Pense à regarder dans tes spams si tu ne vois rien arriver.
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Mot de passe oublié ?"
      description="Indique ton email — on t'enverra un lien pour en choisir un nouveau."
      footer={
        <>
          <Link
            href="/login"
            className="text-sousou-primary font-semibold hover:underline"
          >
            Retour à la connexion
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="toi@example.com"
            className="mt-1.5"
            aria-invalid={!!errors.email || undefined}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={submitting}
        >
          {submitting ? "Envoi..." : "Envoyer le lien"}
        </Button>
      </form>
    </AuthCard>
  );
}
