/**
 * Private on-device photo gallery, stored in the browser's IndexedDB.
 *
 * Face photos are sensitive, so they never leave the device: they aren't uploaded to
 * any server or synced to the account. Only the person's gallery on/off choice is
 * saved to their profile. Records are scoped to an owner ("guest" or a user id) so
 * people sharing a device don't see each other's photos.
 */
import type { PhotoAnalysis } from "./types";
import type { SamplePoint } from "./skinAnalysis";

export type GalleryPhoto = {
  id: string;
  owner: string;
  /** the day the photo was taken, YYYY-MM-DD (editable) */
  takenAt: string;
  addedAt: string;
  image: Blob;
  thumb: Blob;
  analysis: PhotoAnalysis;
  points?: SamplePoint[];
};

const DB = "perfectmatch-photos";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("This browser can't store photos."));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("owner", "owner");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Couldn't open photo storage."));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    let result: T | undefined;
    if (req) req.onsuccess = () => (result = req.result);
    t.oncomplete = () => {
      db.close();
      resolve(result as T);
    };
    t.onerror = t.onabort = () => {
      db.close();
      reject(t.error ?? new Error("Photo storage failed."));
    };
  });
}

const byDate = (a: GalleryPhoto, b: GalleryPhoto) => a.takenAt.localeCompare(b.takenAt) || a.addedAt.localeCompare(b.addedAt);

export async function listPhotos(owner: string): Promise<GalleryPhoto[]> {
  const all = await tx<GalleryPhoto[]>("readonly", (s) => s.index("owner").getAll(owner));
  return (all ?? []).sort(byDate);
}

export const savePhoto = (photo: GalleryPhoto) => tx("readwrite", (s) => s.put(photo));

export async function updatePhoto(id: string, patch: Partial<Omit<GalleryPhoto, "id" | "owner">>) {
  const existing = await tx<GalleryPhoto | undefined>("readonly", (s) => s.get(id));
  if (!existing) return;
  await savePhoto({ ...existing, ...patch });
}

export const deletePhoto = (id: string) => tx("readwrite", (s) => s.delete(id));

export async function deleteAllPhotos(owner: string) {
  const all = await listPhotos(owner);
  await tx("readwrite", (s) => {
    for (const p of all) s.delete(p.id);
  });
}

/** When a guest creates an account, their photos come with them. */
export async function reassignPhotos(from: string, to: string) {
  const all = await listPhotos(from);
  if (!all.length) return;
  await tx("readwrite", (s) => {
    for (const p of all) s.put({ ...p, owner: to });
  });
}

/** Ask the browser not to clear our storage under pressure (best effort). */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Downscale an image into a JPEG blob for storage. */
export async function toJpeg(source: CanvasImageSource & { width: number; height: number }, maxSide: number, quality = 0.85): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality));
}
