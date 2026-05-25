"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, ImageIcon, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FieldError } from "@/components/auth/field-error";
import { AvatarPickerDialog } from "@/components/profile/avatar-picker-dialog";
import { NamedListManager } from "@/components/tracker/named-list-manager";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { api, extractApiErrorMessage } from "@/lib/api";
import {
  createExpenseCategory,
  createIncomeSource,
  deleteExpenseCategory,
  deleteIncomeSource,
  listExpenseCategories,
  listIncomeSources,
  updateExpenseCategory,
  updateIncomeSource,
} from "@/lib/tracker-api";
import { useAuth } from "@/providers/auth-provider";
import type { AuthUser } from "@/lib/auth-schemas";
import type { ExpenseCategory, IncomeSource } from "@/types/tracker";

export default function ParametresPage() {
  const [tab, setTab] = useState<"profil" | "sources" | "categories">("profil");
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        listIncomeSources(),
        listExpenseCategories(),
      ]);
      setSources(s);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
          Paramètres
        </h1>
        <p className="text-sm text-sousou-neutral">
          Profil, sources de revenus et catégories de dépenses.
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTab value="profil">Profil</TabsTab>
          <TabsTab value="sources">Sources</TabsTab>
          <TabsTab value="categories">Catégories</TabsTab>
        </TabsList>

        <TabsPanel value="profil" className="rounded-3xl bg-card border border-border/60 p-6">
          <ProfileForm />
        </TabsPanel>

        <TabsPanel value="sources" className="rounded-3xl bg-card border border-border/60 p-6">
          <NamedListManager
            title="Sources de revenu"
            description="Salaire, freelance, allocation... Tu peux les utiliser dans tes transactions."
            emptyText="Aucune source pour l'instant — ajoutes-en une ci-dessus."
            items={sources}
            loading={loading}
            accent="primary"
            onCreate={async (name) => {
              const created = await createIncomeSource(name);
              await refresh();
              return created;
            }}
            onUpdate={async (id, name) => {
              const updated = await updateIncomeSource(id, name);
              await refresh();
              return updated;
            }}
            onDelete={async (id) => {
              await deleteIncomeSource(id);
              await refresh();
            }}
          />
        </TabsPanel>

        <TabsPanel value="categories" className="rounded-3xl bg-card border border-border/60 p-6">
          <NamedListManager
            title="Catégories de dépense"
            description="Courses, loyer, transport, loisirs... Pour pouvoir analyser tes habitudes. Les catégories liées à un pot ou une épargne sont gérées automatiquement."
            emptyText="Aucune catégorie pour l'instant — ajoutes-en une ci-dessus."
            items={categories}
            loading={loading}
            accent="tertiary"
            isLocked={(c) => c.system}
            lockedBadge={(c) => (c.kind === "SAVINGS" ? "Épargne" : "Pot")}
            onCreate={async (name) => {
              const created = await createExpenseCategory(name);
              await refresh();
              return created;
            }}
            onUpdate={async (id, name) => {
              const updated = await updateExpenseCategory(id, name);
              await refresh();
              return updated;
            }}
            onDelete={async (id) => {
              await deleteExpenseCategory(id);
              await refresh();
            }}
          />
        </TabsPanel>
      </Tabs>
    </div>
  );
}

const profileSchema = z.object({
  name: z.string().min(2).max(40),
  currency: z.string().min(2).max(10),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileForm() {
  const { user, refresh: refreshAuth } = useAuth();
  const [avatarOpen, setAvatarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      currency: user?.currency ?? "FCFA",
    },
  });

  useEffect(() => {
    if (user) reset({ name: user.name, currency: user.currency });
  }, [user, reset]);

  async function onSubmit(values: ProfileValues) {
    try {
      const { data } = await api.patch<{ user: AuthUser }>(
        "/users/me",
        values,
      );
      toast.success("Profil mis à jour");
      reset({ name: data.user.name, currency: data.user.currency });
      await refreshAuth();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Mise à jour impossible"));
    }
  }

  return (
    <div className="space-y-8 max-w-md">
      {user && (
        <section>
          <h2 className="font-serif text-xl text-sousou-secondary mb-1">
            Avatar
          </h2>
          <p className="text-sm text-sousou-neutral mb-4">
            Donne un visage à ton compte. Il s&apos;affiche dans la nav et à
            côté de tes articles.
          </p>
          <div className="flex items-center gap-5">
            <Avatar
              avatarUrl={user.avatarUrl}
              name={user.name}
              size="2xl"
              bordered
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setAvatarOpen(true)}
            >
              <ImageIcon className="size-4" />
              Changer l&apos;avatar
            </Button>
          </div>
          <AvatarPickerDialog
            open={avatarOpen}
            onOpenChange={setAvatarOpen}
            user={user}
            onSaved={() => {
              void refreshAuth();
            }}
          />
        </section>
      )}

      <section>
        <h2 className="font-serif text-xl text-sousou-secondary mb-1">
          Mes budgets
        </h2>
        <p className="text-sm text-sousou-neutral mb-4">
          Plafonne tes dépenses par catégorie. Sou&apos;Sou t&apos;avertit
          quand tu approches de la limite.
        </p>
        <Link
          href="/budgets"
          className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center justify-center size-10 rounded-xl bg-sousou-primary-50 text-sousou-primary-700">
            <Wallet className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sousou-secondary">
              Gérer mes budgets
            </p>
            <p className="text-xs text-sousou-neutral mt-0.5">
              Voir, créer ou modifier mes plafonds mensuels
            </p>
          </div>
          <ChevronRight className="size-4 text-sousou-neutral shrink-0" />
        </Link>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user?.email ?? ""}
          disabled
          className="mt-1.5"
        />
        <p className="text-xs text-sousou-neutral mt-1.5">
          L&apos;email ne peut pas être modifié.
        </p>
      </div>

      <div>
        <Label htmlFor="name">Prénom</Label>
        <Input
          id="name"
          type="text"
          className="mt-1.5"
          aria-invalid={!!errors.name || undefined}
          {...register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div>
        <Label htmlFor="currency">Devise</Label>
        <Input
          id="currency"
          type="text"
          className="mt-1.5 uppercase"
          maxLength={10}
          aria-invalid={!!errors.currency || undefined}
          {...register("currency")}
        />
        <p className="text-xs text-sousou-neutral mt-1.5">
          Code ISO (EUR, USD...) ou{" "}
          <span className="font-mono">FCFA</span> pour la zone CFA.
        </p>
        <FieldError message={errors.currency?.message} />
      </div>

      <Button type="submit" disabled={!isDirty || isSubmitting}>
        {isSubmitting ? "Enregistrement..." : "Enregistrer"}
      </Button>
      </form>
    </div>
  );
}
