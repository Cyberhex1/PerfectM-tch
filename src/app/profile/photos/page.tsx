"use client";

import { useMemo, useState } from "react";
import { BlobImage } from "@/components/gallery/BlobImage";
import { ComparePanel } from "@/components/gallery/ComparePanel";
import { PhotoDetail } from "@/components/gallery/PhotoDetail";
import { TrendCharts } from "@/components/gallery/TrendCharts";
import { useGallery } from "@/components/gallery/useGallery";
import { PhotoAnalyzer, type Capture } from "@/components/PhotoAnalyzer";
import { useProfile } from "@/components/ProfileProvider";
import { Button, Card, Chip, cx, Eyebrow, H2, Input, Notice, Spinner } from "@/components/ui";
import { localDate } from "@/lib/exif";
import { newId } from "@/lib/productParsing";
import type { GalleryPhoto } from "@/lib/photoStore";
import type { PhotoAnalysis } from "@/lib/types";

const monthLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function PhotosPage() {
  const g = useGallery();
  const [openId, setOpenId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [newestFirst, setNewestFirst] = useState(false);

  const photos = useMemo(() => g.photos ?? [], [g.photos]);
  const groups = useMemo(() => {
    const ordered = newestFirst ? [...photos].reverse() : photos;
    const map = new Map<string, GalleryPhoto[]>();
    for (const p of ordered) {
      const key = p.takenAt.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()];
  }, [photos, newestFirst]);

  const openIndex = photos.findIndex((p) => p.id === openId);
  const open = openIndex >= 0 ? photos[openIndex] : null;
  const pair = picked.length === 2 ? (picked.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as GalleryPhoto[]) : [];

  if (g.photos === null)
    return (
      <div className="grid min-h-[30vh] place-items-center text-muted">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-10">
      <div>
        <Eyebrow>Photos</Eyebrow>
        <H2 className="mt-2">Your skin, over time.</H2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Take or upload a photo whenever you like and date it. Tap any photo for its skin and foundation reading, or
          compare two to see what&apos;s changed.
        </p>
      </div>

      {g.error && <Notice tone="bad">{g.error}</Notice>}

      {!g.enabled ? (
        <>
          <GalleryChoice decided={g.decided} count={photos.length} onChoose={g.setEnabled} />
          <Card>
            <p className="font-display text-2xl">Analyze a photo without saving it</p>
            <p className="mt-1 text-sm text-muted">With the gallery off, photos are analyzed and then discarded — nothing is stored.</p>
            <div className="mt-5">
              <OneOffAnalysis />
            </div>
          </Card>
        </>
      ) : (
        <>
          <AddPhoto latest={photos.at(-1)?.takenAt} onSave={g.add} ownerId={g.ownerId} />

          {photos.length >= 2 && (
            <section>
              <h3 className="mb-4 font-display text-2xl">Your progress</h3>
              <TrendCharts photos={photos} />
            </section>
          )}

          {pair.length === 2 && <ComparePanel pair={pair as [GalleryPhoto, GalleryPhoto]} onClose={() => (setComparing(false), setPicked([]))} />}

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-2xl">
                Timeline <span className="font-sans text-sm text-muted">· {photos.length} photo{photos.length === 1 ? "" : "s"}</span>
              </h3>
              {photos.length > 0 && (
                <div className="flex gap-2">
                  <Chip selected={!newestFirst} onClick={() => setNewestFirst(false)}>
                    Oldest first
                  </Chip>
                  <Chip selected={newestFirst} onClick={() => setNewestFirst(true)}>
                    Newest first
                  </Chip>
                  {photos.length >= 2 && (
                    <Chip
                      selected={comparing}
                      onClick={() => {
                        setComparing(!comparing);
                        setPicked([]);
                      }}
                    >
                      {comparing ? "Cancel compare" : "Compare two"}
                    </Chip>
                  )}
                </div>
              )}
            </div>
            {comparing && picked.length < 2 && (
              <p className="mb-4 text-sm text-accent">Tap two photos to compare ({picked.length}/2 selected).</p>
            )}
            {groups.length ? (
              <div className="flex flex-wrap gap-x-6 gap-y-7">
                {groups.map(([month, list]) => (
                  <div key={month} className="min-w-0 max-w-full">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted">{monthLabel(`${month}-15`)}</p>
                    <ul className="flex flex-wrap gap-2.5">
                      {list.map((p) => {
                        const sel = picked.includes(p.id);
                        return (
                          <li key={p.id} className="w-[calc((100vw-2.5rem-1.25rem)/3)] max-w-36 sm:w-36">
                            <button
                              type="button"
                              aria-pressed={comparing ? sel : undefined}
                              aria-label={`${comparing ? "Select" : "Open"} photo from ${dayLabel(p.takenAt)}`}
                              onClick={() => {
                                if (!comparing) return setOpenId(p.id);
                                setPicked((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id].slice(-2)));
                              }}
                              className={cx(
                                "group relative block w-full overflow-hidden rounded-2xl bg-line focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft",
                                sel && "ring-2 ring-ink ring-offset-2 ring-offset-canvas",
                              )}
                            >
                              <BlobImage blob={p.thumb} alt="" className="block aspect-[3/4] w-full object-cover transition group-hover:scale-[1.03]" />
                              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-xs text-white">
                                {dayLabel(p.takenAt)}
                                <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white/80" style={{ background: p.analysis.hex }} />
                              </span>
                              {sel && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-xs text-white">✓</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-muted">
                No photos yet. Add your first one above — then come back every few weeks in the same light.
              </p>
            )}
          </section>

          <GallerySettings count={photos.length} onTurnOff={() => g.setEnabled(false)} />
        </>
      )}

      {open && (
        <PhotoDetail
          key={open.id}
          photo={open}
          onClose={() => setOpenId(null)}
          onPrev={openIndex > 0 ? () => setOpenId(photos[openIndex - 1].id) : undefined}
          onNext={openIndex < photos.length - 1 ? () => setOpenId(photos[openIndex + 1].id) : undefined}
          onEdit={(patch) => g.edit(open.id, patch)}
          onDelete={() => {
            g.remove(open.id);
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

const PRIVACY = [
  "Photos are stored only on this device, inside your browser. They're never uploaded to our servers or synced to your account.",
  "Only the readings (skin tone, redness and so on) are used for your profile.",
  "Clearing your browser's site data, or long inactivity in Safari, can remove them. Download any you want to keep.",
];

function GalleryChoice({ decided, count, onChoose }: { decided: boolean; count: number; onChoose: (on: boolean) => void }) {
  return (
    <Card className="space-y-4">
      <p className="font-display text-2xl">{decided ? "Your photo gallery is off" : "Keep a private photo gallery?"}</p>
      <p className="text-sm leading-relaxed text-muted">
        Save dated photos of your skin so you can see improvement — or regression — side by side, with a reading for
        each one. It&apos;s entirely optional.
      </p>
      <ul className="space-y-1.5 text-sm">
        {PRIVACY.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-accent">·</span>
            {p}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button onClick={() => onChoose(true)}>Turn on my gallery</Button>
        {!decided && (
          <Button variant="secondary" onClick={() => onChoose(false)}>
            No thanks — don&apos;t save my photos
          </Button>
        )}
      </div>
      {decided && count === 0 && <p className="text-xs text-faint">No photos are saved.</p>}
    </Card>
  );
}

function GallerySettings({ count, onTurnOff }: { count: number; onTurnOff: () => void }) {
  return (
    <Card className="space-y-3">
      <p className="font-medium">Privacy</p>
      <ul className="space-y-1.5 text-sm text-muted">
        {PRIVACY.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <Button
        variant="danger"
        onClick={() => {
          if (
            confirm(
              count
                ? `Turn off your gallery and permanently delete ${count} photo${count === 1 ? "" : "s"} from this device?`
                : "Turn off your gallery? New photos won't be saved.",
            )
          )
            onTurnOff();
        }}
      >
        Turn off gallery{count ? " & delete photos" : ""}
      </Button>
    </Card>
  );
}

function AddPhoto({ latest, onSave, ownerId }: { latest?: string; onSave: (p: GalleryPhoto) => Promise<void>; ownerId: string }) {
  const { update } = useProfile();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ analysis: PhotoAnalysis; capture: Capture } | null>(null);
  const [date, setDate] = useState<string>("");
  const [useForProfile, setUseForProfile] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const takenAt = date || result?.capture.takenAt || localDate();
  const isNewest = !latest || takenAt >= latest;
  const profileToo = useForProfile ?? isNewest;

  const save = async () => {
    if (!result) return;
    setSaving(true);
    await onSave({
      id: newId(),
      owner: ownerId,
      takenAt,
      addedAt: new Date().toISOString(),
      image: result.capture.image,
      thumb: result.capture.thumb,
      analysis: result.analysis,
      points: result.capture.points,
    });
    if (profileToo) update((p) => ({ ...p, photo: result.analysis, onboarding: { ...p.onboarding, photo: true } }));
    setSaving(false);
    setSaved(true);
    setResult(null);
    setDate("");
    setUseForProfile(null);
    setRound(round + 1);
  };

  return (
    <Card>
      <p className="font-display text-2xl">Add a photo</p>
      <p className="mt-1 text-sm text-muted">For comparisons you can trust, use the same window light each time and keep your face bare.</p>
      {saved && !result && <p className="mt-3 text-sm text-good">Saved to your gallery.</p>}
      <div className="mt-5">
        <PhotoAnalyzer
          key={round}
          onChange={(analysis, capture) => {
            setSaved(false);
            setResult(analysis && capture ? { analysis, capture } : null);
          }}
        />
      </div>
      {result && (
        <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <span className="font-medium">Date taken</span>
              <Input type="date" value={takenAt} max={localDate()} onChange={(e) => setDate(e.target.value)} className="w-auto py-1.5" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={profileToo} onChange={(e) => setUseForProfile(e.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
              Use this photo&apos;s reading for my profile
            </label>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner />} Save to gallery
          </Button>
        </div>
      )}
    </Card>
  );
}

function OneOffAnalysis() {
  const { update } = useProfile();
  const [analysis, setAnalysis] = useState<PhotoAnalysis>();
  const [used, setUsed] = useState(false);
  return (
    <div className="space-y-4">
      <PhotoAnalyzer
        onChange={(a) => {
          setAnalysis(a);
          setUsed(false);
        }}
      />
      {analysis &&
        (used ? (
          <p className="text-sm text-good">Your profile now uses this reading. The photo itself wasn&apos;t saved.</p>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              update((p) => ({ ...p, photo: analysis, onboarding: { ...p.onboarding, photo: true } }));
              setUsed(true);
            }}
          >
            Use this reading for my profile
          </Button>
        ))}
    </div>
  );
}
