"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteAllPhotos, deletePhoto, listPhotos, requestPersistence, savePhoto, updatePhoto, type GalleryPhoto } from "@/lib/photoStore";
import { useProfile } from "../ProfileProvider";

/** The current person's on-device photos, oldest first, plus the gallery on/off switch. */
export function useGallery() {
  const { ownerId, profile, update } = useProfile();
  const enabled = !!profile.gallery?.enabled;
  const decided = !!profile.gallery;
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setPhotos(await listPhotos(ownerId));
    } catch (e) {
      setError((e as Error).message);
      setPhotos([]);
    }
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;
    listPhotos(ownerId)
      .then((list) => !cancelled && setPhotos(list))
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        setError(undefined);
      } catch (e) {
        setError(
          (e as Error).name === "QuotaExceededError"
            ? "Your device is out of space for photos. Delete a few older ones and try again."
            : (e as Error).message,
        );
      }
      await refresh();
    },
    [refresh],
  );

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (on) requestPersistence();
      else await run(() => deleteAllPhotos(ownerId)); // opting out means nothing stays saved
      update((p) => ({ ...p, gallery: { enabled: on, decidedAt: new Date().toISOString() } }));
    },
    [ownerId, run, update],
  );

  return {
    enabled,
    decided,
    photos,
    error,
    ownerId,
    setEnabled,
    add: (p: GalleryPhoto) => run(() => savePhoto(p)),
    edit: (id: string, patch: Parameters<typeof updatePhoto>[1]) => run(() => updatePhoto(id, patch)),
    remove: (id: string) => run(() => deletePhoto(id)),
  };
}
