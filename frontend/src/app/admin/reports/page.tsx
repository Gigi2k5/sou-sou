"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminReportsFilters } from "@/components/admin/admin-reports-filters";
import { AdminReportsList } from "@/components/admin/admin-reports-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { listAdminReports } from "@/lib/admin-reports-api";
import type {
  AdminReportTab,
  AdminReportsList as AdminReportsListType,
} from "@/types/admin-reports";

const PAGE_SIZE = 20;

export default function AdminReportsPage() {
  const [data, setData] = useState<AdminReportsListType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminReportTab>("pending");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAdminReports({
        page,
        limit: PAGE_SIZE,
        tab,
      });
      setData(result);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-sousou-secondary">
          Signalements
        </h1>
        <p className="text-sm text-sousou-neutral mt-1">
          {data
            ? `${data.counts.pending} à traiter sur ${data.counts.total} au total`
            : "Examen des contenus signalés par la communauté."}
        </p>
      </header>

      <AdminReportsFilters
        tab={tab}
        onTabChange={setTab}
        counts={
          data?.counts ?? {
            pending: 0,
            reviewing: 0,
            resolved: 0,
            rejected: 0,
            total: 0,
          }
        }
      />

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <AdminReportsList reports={data.items} />
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
