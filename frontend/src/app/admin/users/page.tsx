"use client";

import Papa from "papaparse";
import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminUsersFilters } from "@/components/admin/admin-users-filters";
import { AdminUsersList } from "@/components/admin/admin-users-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { listAdminUsers } from "@/lib/admin-users-api";
import type {
  AdminUserStatus,
  AdminUsersList as AdminUsersListType,
} from "@/types/admin-users";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUsersListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<AdminUserStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdminUsers({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
      });
      setData(result);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleExport() {
    setExporting(true);
    try {
      const all = await listAdminUsers({ limit: 1000 });
      const rows = all.items.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        currency: u.currency,
        totalPoints: u.totalPoints,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt ?? "",
        bannedAt: u.bannedAt ?? "",
        banReason: u.banReason ?? "",
      }));
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      link.download = `sousou-users-${ts}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} utilisateurs exportés`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Export impossible"));
    } finally {
      setExporting(false);
    }
  }

  const totalLabel = useMemo(() => {
    if (!data) return "";
    return `${data.total.toLocaleString("fr-FR")} utilisateur${data.total > 1 ? "s" : ""}`;
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-sousou-secondary">
            Utilisateurs
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            {totalLabel || "Liste de la communauté"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          className="self-start sm:self-auto"
        >
          <Download className="size-4" />
          {exporting ? "Export..." : "Exporter CSV"}
        </Button>
      </header>

      <AdminUsersFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
      />

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <AdminUsersList users={data.items} />
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
