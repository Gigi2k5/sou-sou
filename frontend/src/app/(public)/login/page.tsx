"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthCard } from "@/components/auth/auth-card";
import { FieldError } from "@/components/auth/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorCode, extractApiErrorMessage } from "@/lib/api";
import { type LoginValues, loginSchema } from "@/lib/auth-schemas";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    try {
      const u = await login(values);
      toast.success("Bienvenue !");
      router.push(u.role === "ADMIN" ? "/admin" : "/");
    } catch (err) {
      // Compte créé mais jamais vérifié : on renvoie vers la saisie du code
      // plutôt que d'afficher une erreur dans laquelle l'user est coincé.
      if (extractApiErrorCode(err) === "EMAIL_NOT_VERIFIED") {
        toast.info("Vérifie ton email pour activer ton compte.");
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      toast.error(extractApiErrorMessage(err, "Connexion impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Bon retour"
      description="Connecte-toi pour reprendre ton aventure d'épargne."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link
            href="/signup"
            className="text-sousou-primary font-semibold hover:underline"
          >
            Crée-en un
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

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-sousou-primary hover:underline"
            >
              Oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1.5"
            aria-invalid={!!errors.password || undefined}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full mt-2"
          disabled={submitting}
        >
          {submitting ? "Connexion..." : "Se connecter"}
        </Button>
      </form>
    </AuthCard>
  );
}
