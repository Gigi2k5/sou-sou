"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AddResourceDialog } from "@/components/admin/add-resource-dialog";
import { SortableResourceRow } from "@/components/admin/sortable-resource-row";
import { DeleteConfirmDialog } from "@/components/tracker/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import {
  deleteAdminResource,
  listAdminResources,
  reorderAdminResources,
  updateAdminResource,
} from "@/lib/admin-resources-api";
import type { AdminResource } from "@/types/admin-resources";

export default function AdminResourcesPage() {
  const [items, setItems] = useState<AdminResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminResources();
      setItems(data.items);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setBusy = (id: string, value: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((r) => r.id === active.id);
    const newIndex = items.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    const previous = items;
    setItems(reordered); // optimistic

    try {
      const data = await reorderAdminResources(reordered.map((r) => r.id));
      setItems(data.items);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Réorganisation impossible"));
      setItems(previous);
    }
  }

  async function handleToggleFeatured(r: AdminResource) {
    setBusy(r.id, true);
    try {
      const updated = await updateAdminResource(r.id, {
        isFeatured: !r.isFeatured,
      });
      // L'ordre (featured DESC, position ASC) peut changer côté serveur,
      // mais pour l'expérience admin on refresh la liste pour rester aligné.
      await refresh();
      toast.success(
        updated.isFeatured ? "Mis en avant" : "Retiré de la une",
      );
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Mise à jour impossible"));
    } finally {
      setBusy(r.id, false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminResource(deleteTarget.id);
      toast.success("Ressource supprimée");
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-sousou-secondary">
            Ressources YouTube
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            {loading
              ? "Chargement..."
              : `${items.length} vidéo${items.length > 1 ? "s" : ""} — glisse pour réordonner.`}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setAddOpen(true)}
          className="self-start sm:self-auto"
        >
          <Plus className="size-4" />
          Ajouter une vidéo
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-sousou-neutral mb-4">
            Aucune ressource pour l&apos;instant.
          </p>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Ajouter la première vidéo
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {items.map((r) => (
                <SortableResourceRow
                  key={r.id}
                  resource={r}
                  onToggleFeatured={handleToggleFeatured}
                  onDelete={setDeleteTarget}
                  busy={busyIds.has(r.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <AddResourceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={refresh}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Supprimer « ${deleteTarget?.title ?? ""} » ?`}
        description="Elle sera retirée du catalogue. La vidéo reste évidemment disponible sur YouTube."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
