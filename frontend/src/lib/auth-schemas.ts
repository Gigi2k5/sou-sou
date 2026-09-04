import { z } from "zod";

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "2 caractères minimum")
      .max(40, "40 caractères maximum"),
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "8 caractères minimum")
      .max(72, "72 caractères maximum"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

export type SignupValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code fait 6 chiffres"),
});

export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;

// --- API types ---------------------------------------------------------------
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  currency: string;
  role: "USER" | "ADMIN";
  /** String opaque : "preset:..." | "upload:..." | null. Cf. lib/avatar.ts */
  avatarUrl: string | null;
  totalPoints: number;
  currentStreak: number;
  bestStreak: number;
  /** Préférence de thème — "light" | "dark" | "system". */
  theme: "light" | "dark" | "system";
  /** True si l'user a fini son onboarding (backfillé true pour les comptes pré-V4). */
  hasCompletedOnboarding: boolean;
  /** Step en cours (0-N). Permet de reprendre où on s'était arrêté. */
  onboardingStep: number;
  /** Email confirmé via le code à 6 chiffres (backfillé true pour les comptes pré-V5). */
  emailVerified: boolean;
  createdAt: string;
}

/** Réponse de POST /auth/signup — aucun token tant que le code n'est pas validé. */
export interface SignupResult {
  email: string;
  expiresInMinutes: number;
}
