"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminArticlesFilters } from "@/components/admin/admin-articles-filters";
import { AdminArticlesList } from "@/components/admin/admin-articles-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { listAdminArticles } from "@/lib/admin-articles-api";
import type {
  AdminArticleTab,
  AdminArticlesList as AdminArticlesListType,
} from "@/types/admin-articles";

const PAGE_SIZE = 20;

export default function AdminArticlesPage() {
  const [data, setData] = useState<AdminArticlesListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState<AdminArticleTab>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tab]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdminArticles({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        tab,
      });
      setData(result);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const totalLabel = useMemo(() => {
    if (!data) return "";
    return `${data.total.toLocaleString("fr-FR")} article${data.total > 1 ? "s" : ""}`;
  }, [data]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-sousou-secondary">
          Modération du blog
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          {totalLabel || "Tous les articles publiés sur Sou'Sou"}
        </p>
      </header>

      <AdminArticlesFilters
        search={search}
        onSearchChange={setSearch}
        tab={tab}
        onTabChange={setTab}
      />

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <AdminArticlesList articles={data.items} />
          {data.pageCount > 1 && (
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              onPageChange={setPage}
              loading={loading}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
  loading,
}: {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1 || loading}
      >
        Précédent
      </Button>
      <span className="text-sm text-sousou-neutral tabular-nums">
        Page {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount || loading}
      >
        Suivant
      </Button>
    </div>
  );
}
