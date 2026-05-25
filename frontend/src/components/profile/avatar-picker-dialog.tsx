"use client";

import { Check, Lock, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AvatarConditionDialog } from "@/components/profile/avatar-condition-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { api, extractApiErrorMessage } from "@/lib/api";
import { getSelectedPresetId, readFileAsDataUrl } from "@/lib/avatar";
import { listMyAvatars } from "@/lib/avatars-api";
import type { AuthUser } from "@/lib/auth-schemas";
import { cn } from "@/lib/utils";
import type { AvatarStatus } from "@/types/avatar";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Mode = "preset" | "upload";

export function AvatarPickerDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: AuthUser;
  onSaved: (updated: AuthUser) => void;
}) {
  const [mode, setMode] = useState<Mode>(() =>
    user.avatarUrl?.startsWith("upload:") ? "upload" : "preset",
  );
  const [avatars, setAvatars] = useState<AvatarStatus[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    () => getSelectedPresetId(user.avatarUrl),
  );
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockedDetail, setLockedDetail] = useState<AvatarStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset + fetch à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setMode(user.avatarUrl?.startsWith("upload:") ? "upload" : "preset");
    setSelectedPreset(getSelectedPresetId(user.avatarUrl));
    setUploadDataUrl(null);

    setLoadingList(true);
    listMyAvatars()
      .then((list) => {
        setAvatars(list);
        // Si rien sélectionné, défaut sur le premier débloqué.
        setSelectedPreset((prev) => {
          if (prev) return prev;
          return list.find((a) => a.isUnlocked)?.key ?? null;
        });
      })
      .catch(() => toast.error("Impossible de charger tes avatars"))
      .finally(() => setLoadingList(false));
  }, [open, user.avatarUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format non supporté. Utilise JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(
        `Image trop lourde (${(file.size / 1_048_576).toFixed(1)} MB). Max 2 MB.`,
      );
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setUploadDataUrl(dataUrl);
    } catch {
      toast.error("Lecture du fichier impossible.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      let payload: { type: "preset" | "upload"; value: string };
      if (mode === "preset") {
        if (!selectedPreset) {
          toast.error("Choisis un avatar débloqué");
          return;
        }
        payload = { type: "preset", value: selectedPreset };
      } else {
        if (!uploadDataUrl) {
          toast.error("Choisis d'abord une image à uploader");
          return;
        }
        payload = { type: "upload", value: uploadDataUrl };
      }
      const { data } = await api.patch<{ user: AuthUser }>(
        "/users/me/avatar",
        payload,
      );
      toast.success("Avatar mis à jour");
      onSaved(data.user);
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Mise à jour impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    setSubmitting(true);
    try {
      const { data } = await api.patch<{ user: AuthUser }>(
        "/users/me/avatar",
        { type: "remove", value: "" },
      );
      toast.success("Avatar retiré");
      onSaved(data.user);
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Suppression impossible"));
    } finally {
      setSubmitting(false);
    }
  }

  const unlockedCount = avatars?.filter((a) => a.isUnlocked).length ?? 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisir un avatar</DialogTitle>
            <DialogDescription>
              Débloque les avatars en utilisant l&apos;app — ou uploade ta
              photo (JPG / PNG / WEBP, 2 MB max).
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="w-full">
                <TabsTab value="preset" className="flex-1">
                  Mes avatars
                  {avatars && (
                    <span className="ml-1.5 text-xs text-sousou-neutral">
                      ({unlockedCount}/{avatars.length})
                    </span>
                  )}
                </TabsTab>
                <TabsTab value="upload" className="flex-1">
                  Uploader une photo
                </TabsTab>
              </TabsList>

              <TabsPanel value="preset">
                {loadingList || !avatars ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {avatars.map((avatar) => (
                      <AvatarCell
                        key={avatar.key}
                        avatar={avatar}
                        active={
                          avatar.isUnlocked && selectedPreset === avatar.key
                        }
                        onPick={() => {
                          if (avatar.isUnlocked) setSelectedPreset(avatar.key);
                          else setLockedDetail(avatar);
                        }}
                      />
                    ))}
                  </div>
                )}
              </TabsPanel>

              <TabsPanel value="upload">
                <div className="flex flex-col items-center gap-4 py-2">
                  {uploadDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={uploadDataUrl}
                      alt="Aperçu"
                      className="size-32 rounded-full object-cover ring-4 ring-sousou-primary/20"
                    />
                  ) : (
                    <Avatar
                      avatarUrl={user.avatarUrl}
                      name={user.name}
                      size="2xl"
                    />
                  )}
                  <div className="text-center space-y-2 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-4" />
                      {uploadDataUrl ? "Changer la photo" : "Choisir un fichier"}
                    </Button>
                    <p className="text-xs text-sousou-neutral">
                      L&apos;image sera redimensionnée en 256×256 (carré centré).
                    </p>
                  </div>
                </div>
              </TabsPanel>
            </Tabs>
          </DialogBody>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={submitting || !user.avatarUrl}
              className="text-sousou-neutral hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Retirer l&apos;avatar
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  submitting ||
                  (mode === "upload" && !uploadDataUrl) ||
                  (mode === "preset" && !selectedPreset)
                }
              >
                {submitting ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AvatarConditionDialog
        open={!!lockedDetail}
        onOpenChange={(o) => !o && setLockedDetail(null)}
        avatar={lockedDetail}
      />
    </>
  );
}

function AvatarCell({
  avatar,
  active,
  onPick,
}: {
  avatar: AvatarStatus;
  active: boolean;
  onPick: () => void;
}) {
  const locked = !avatar.isUnlocked;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={
        locked
          ? `${avatar.label} verrouillé — ${avatar.description}`
          : avatar.label
      }
      className={cn(
        "group relative rounded-2xl p-3 transition-all outline-none",
        "focus-visible:ring-3 focus-visible:ring-primary/30",
        active
          ? "bg-sousou-primary-50 ring-2 ring-sousou-primary"
          : "bg-card border border-border/60 hover:border-sousou-primary/50",
        locked && "opacity-90 hover:opacity-100",
      )}
      title={locked ? avatar.description : undefined}
    >
      <div className="relative">
        <Image
          src={`/avatars/avatar-${avatar.key}.png`}
          alt=""
          width={96}
          height={96}
          className={cn(
            "w-full aspect-square rounded-full object-cover transition-all",
            locked && "grayscale brightness-90 blur-[1.5px]",
          )}
        />
        {locked && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 m-auto size-9 rounded-full",
              "bg-sousou-secondary/85 text-white flex items-center justify-center shadow-md",
            )}
          >
            <Lock className="size-4" />
          </span>
        )}
        {active && (
          <span className="absolute -top-1 -right-1 size-6 rounded-full bg-sousou-primary text-white flex items-center justify-center shadow-md">
            <Check className="size-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "text-xs font-medium mt-2 truncate",
          locked ? "text-sousou-neutral" : "text-sousou-secondary",
        )}
      >
        {avatar.label}
      </p>
    </button>
  );
}
