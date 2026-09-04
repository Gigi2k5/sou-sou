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
import { extractApiErrorMessage } from "@/lib/api";
import { type SignupValues, signupSchema } from "@/lib/auth-schemas";
import { useAuth } from "@/providers/auth-provider";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignupValues) {
    setSubmitting(true);
    try {
      const { email } = await signup({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      toast.success("Compte créé — on t'a envoyé un code par email.");
      // Le compte n'est pas encore utilisable : direction la saisie du code.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Inscription impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Crée ton compte"
      description="Quelques infos et c'est parti pour ta première épargne quotidienne."
      footer={
        <>
          Déjà inscrit·e ?{" "}
          <Link
            href="/login"
            className="text-sousou-primary font-semibold hover:underline"
          >
            Connecte-toi
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="name">Prénom</Label>
          <Input
            id="name"
            type="text"
            autoComplete="given-name"
            placeholder="Charbel"
            className="mt-1.5"
            aria-invalid={!!errors.name || undefined}
            {...register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>

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
          <Label htmlFor="password">Mot de passe</Label>
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
          <Label htmlFor="confirmPassword">Confirme le mot de passe</Label>
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
          {submitting ? "Création..." : "Créer mon compte"}
        </Button>
      </form>
    </AuthCard>
  );
}
