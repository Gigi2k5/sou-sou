"use client";

import { Bell, BellRing, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { NotificationItem } from "@/components/notifications/notification-item";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications-api";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell({
  className,
  variant = "ghost",
}: {
  className?: string;
  /** "ghost" pour le header (icône seule), "sidebar" pour intégration sidebar desktop. */
  variant?: "ghost" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Polling discret du compteur de non-lues quand l'onglet est visible.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnread(count);
    } catch {
      /* silencieux : on n'agit pas si offline / déconnecté */
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    function tick() {
      if (document.visibilityState === "visible") void refreshUnread();
    }
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshUnread]);

  // Ref pour ignorer les fetchs concurrents (ouvrir/fermer rapidement la modale
  // peut lancer 2 fetchs — on garde que le plus récent).
  const loadTokenRef = useRef(0);

  const loadList = useCallback(async () => {
    const myToken = ++loadTokenRef.current;
    setLoading(true);
    try {
      const page = await listNotifications({ page: 1, limit: 30 });
      // Un fetch plus récent a été lancé entre-temps : on abandonne ce résultat.
      if (myToken !== loadTokenRef.current) return;
      setItems(page.items);
      setUnread(page.unreadCount);
    } catch {
      if (myToken === loadTokenRef.current) {
        toast.error("Notifications indisponibles");
      }
    } finally {
      if (myToken === loadTokenRef.current) setLoading(false);
    }
  }, []);

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) void loadList();
  }

  async function handleActivate(notif: AppNotification) {
    setOpen(false);
    if (!notif.isRead) {
      // Optimiste
      setItems((prev) =>
        prev?.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)) ??
        null,
      );
      setUnread((c) => Math.max(0, c - 1));
      try {
        await markNotificationAsRead(notif.id);
      } catch {
        void refreshUnread();
      }
    }
  }

  async function handleDelete(id: string) {
    const removed = items?.find((n) => n.id === id);
    setItems((prev) => prev?.filter((n) => n.id !== id) ?? null);
    if (removed && !removed.isRead) setUnread((c) => Math.max(0, c - 1));
    try {
      await deleteNotification(id);
    } catch {
      toast.error("Suppression impossible");
      void loadList();
    }
  }

  async function handleMarkAllRead() {
    if (unread === 0) return;
    setItems((prev) =>
      prev?.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })) ??
      null,
    );
    setUnread(0);
    try {
      await markAllNotificationsAsRead();
    } catch {
      toast.error("Action impossible");
      void loadList();
    }
  }

  const hasUnread = unread > 0;
  const Icon = hasUnread ? BellRing : Bell;
  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label={
          hasUnread
            ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}`
            : "Notifications"
        }
        className={cn(
          "relative inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/30",
          variant === "ghost"
            ? "size-10 rounded-full text-sousou-neutral hover:bg-muted hover:text-sousou-secondary"
            : "w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sousou-neutral hover:bg-muted hover:text-sousou-secondary",
          className,
        )}
      >
        <Icon className={cn(variant === "sidebar" ? "size-5" : "size-5")} />
        {variant === "sidebar" && (
          <span className="flex-1 text-left">Notifications</span>
        )}
        {hasUnread && (
          <span
            className={cn(
              "absolute inline-flex items-center justify-center text-[10px] font-bold leading-none text-primary-foreground bg-sousou-primary rounded-full",
              variant === "ghost"
                ? "top-1 right-1 size-4 min-w-4 px-1"
                : "right-3 top-1/2 -translate-y-1/2 size-5 min-w-5 px-1",
            )}
          >
            {badge}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md p-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between gap-2 pr-12">
            <DialogTitle>Notifications</DialogTitle>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs h-8"
              >
                <CheckCheck className="size-4" />
                Tout lire
              </Button>
            )}
          </DialogHeader>
          <DialogBody className="flex-1 overflow-y-auto p-0">
            {loading && !items ? (
              <div className="px-4 py-3 space-y-3">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
            ) : items && items.length > 0 ? (
              <ul className="divide-y divide-border/60">
                {items.map((n, i) => (
                  <NotificationItem
                    key={n.id}
                    notif={n}
                    index={i}
                    onActivate={handleActivate}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="size-14 rounded-full bg-muted inline-flex items-center justify-center mb-3">
                  <Bell className="size-6 text-sousou-neutral" />
                </div>
                <p className="text-sm text-sousou-neutral max-w-xs mx-auto">
                  Tu seras notifié·e ici de tes badges et de tes objectifs
                  atteints.
                </p>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
