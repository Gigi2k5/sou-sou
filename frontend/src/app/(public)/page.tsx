"use client";

import { ArrowRight, Coins, Sparkles, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Si l'utilisateur est connecté, on l'envoie sur son espace par défaut.
  // Les admins atterrissent directement sur le back-office, les users sur le dashboard.
  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "ADMIN" ? "/admin" : "/dashboard");
    }
  }, [loading, user, router]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-12 sm:mb-16">
        <BrandMark size="md" />
        {!loading && !user && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/login")}
            >
              Connexion
            </Button>
            <Button size="sm" onClick={() => router.push("/signup")}>
              Commencer
            </Button>
          </div>
        )}
      </header>

      <section className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
        <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
          <span className="inline-block px-3 py-1 rounded-full bg-sousou-primary-100 text-sousou-primary-700 text-xs font-semibold tracking-wide uppercase">
            Pensé pour l&apos;Afrique francophone
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-sousou-secondary leading-[1.05]">
            Épargne maline,{" "}
            <span className="text-sousou-primary">vie sereine</span>.
          </h1>
          <p className="text-base sm:text-lg text-sousou-neutral max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Suis tes revenus et dépenses, atteins tes objectifs d&apos;épargne
            quotidiens et gagne des points en t&apos;amusant. Conçu pour les
            jeunes adultes francophones.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
            <Button
              size="lg"
              className="px-6"
              nativeButton={false}
              render={
                <Link href="/signup">
                  Créer mon compte <ArrowRight className="ml-1.5" />
                </Link>
              }
            />
            <Button
              variant="outline"
              size="lg"
              className="px-6"
              nativeButton={false}
              render={<Link href="/login">J&apos;ai déjà un compte</Link>}
            />
          </div>
        </div>

        <div className="flex justify-center order-1 lg:order-2">
          <Image
            src="/mascot.png"
            alt="Sou'Sou la mascotte"
            width={320}
            height={320}
            priority
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 256px, 192px"
            className="w-48 sm:w-64 lg:w-80 h-auto drop-shadow-2xl animate-[float_3s_ease-in-out_infinite]"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 sm:mt-24">
        <FeatureCard
          icon={<Coins className="text-sousou-primary" />}
          title="Tracker"
          text="Note tes revenus et dépenses en quelques secondes, par catégorie."
        />
        <FeatureCard
          icon={<Trophy className="text-sousou-primary" />}
          title="Objectifs gamifiés"
          text="Définis un montant quotidien, débloque points, badges et streaks."
        />
        <FeatureCard
          icon={<Sparkles className="text-sousou-primary" />}
          title="Articles & ressources"
          text="Lis des conseils concrets et publie tes propres astuces d'épargne."
        />
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/60">
      <div className="size-10 rounded-xl bg-sousou-primary-50 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-sousou-secondary mb-1">
        {title}
      </h2>
      <p className="text-sm text-sousou-neutral leading-relaxed">{text}</p>
    </div>
  );
}
