"use client";

import { ExternalLink, EyeOff, FileText, MessageSquare, User } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AdminReportTarget } from "@/types/admin-reports";

export function ReportTargetPreview({
  target,
}: {
  target: AdminReportTarget | null;
}) {
  if (!target) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm text-sousou-neutral">
          La cible signalée a été supprimée — le signalement reste pour
          l&apos;audit.
        </p>
      </div>
    );
  }

  if (target.type === "ARTICLE") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sousou-neutral font-semibold">
          <FileText className="size-3.5" />
          Article signalé
          {target.isHidden && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-sousou-neutral px-2 py-0.5 normal-case tracking-normal text-[10px]">
              <EyeOff className="size-3" />
              Masqué
            </span>
          )}
        </div>
        <div>
          <h3 className="font-serif text-xl text-sousou-secondary leading-tight">
            {target.title}
          </h3>
          {target.excerpt && (
            <p className="text-sm text-sousou-neutral mt-1.5 line-clamp-3">
              {target.excerpt}
            </p>
          )}
        </div>
        <Link
          href={`/admin/users/${target.author.id}`}
          className="inline-flex items-center gap-2 text-sm hover:text-sousou-secondary transition-colors"
        >
          <Avatar
            avatarUrl={target.author.avatarUrl}
            name={target.author.name}
            size="sm"
          />
          <span className="font-medium text-sousou-secondary">
            {target.author.name}
          </span>
          {target.author.isBanned && (
            <span className="text-[9px] uppercase tracking-wide bg-sousou-tertiary text-white rounded px-1.5 py-0.5">
              Banni
            </span>
          )}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/admin/articles/${target.id}`}>
                <ExternalLink className="size-4" />
                Ouvrir l&apos;article
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (target.type === "USER") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sousou-neutral font-semibold">
          <User className="size-3.5" />
          Utilisateur signalé
          {target.isBanned && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sousou-tertiary/10 text-sousou-tertiary px-2 py-0.5 normal-case tracking-normal text-[10px]">
              Banni
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Avatar
            avatarUrl={target.avatarUrl}
            name={target.name}
            size="lg"
          />
          <div className="min-w-0">
            <p className="font-semibold text-sousou-secondary truncate">
              {target.name}
            </p>
            <p className="text-xs text-sousou-neutral truncate">
              {target.email}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href={`/admin/users/${target.id}`}>
              <ExternalLink className="size-4" />
              Ouvrir le profil
            </Link>
          }
        />
      </div>
    );
  }

  // COMMENT placeholder
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <MessageSquare className="size-6 text-sousou-neutral mx-auto mb-2" />
      <p className="text-sm text-sousou-neutral">
        Le système de commentaires n&apos;est pas encore implémenté.
      </p>
    </div>
  );
}
