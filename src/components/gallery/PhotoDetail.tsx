"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { matchLabel, rankFoundations, TIER_LABEL } from "@/lib/foundations";
import type { GalleryPhoto } from "@/lib/photoStore";
import { matchInputFor } from "@/lib/recommend";
import { isOliveLike } from "@/lib/color";
import { localDate } from "@/lib/exif";
import type { PhotoAnalysis } from "@/lib/types";
import { AnalysisSummary, PhotoAnalyzer, type Capture } from "../PhotoAnalyzer";
import { useProfile } from "../ProfileProvider";
import { Button, ButtonLink, Card, Input, Notice, Swatch } from "../ui";
import { BlobImage } from "./BlobImage";

const longDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "long", day: "numeric" });

export function PhotoDetail({
  photo,
  onClose,
  onPrev,
  onNext,
  onEdit,
  onDelete,
}: {
  photo: GalleryPhoto;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onEdit: (patch: Partial<Pick<GalleryPhoto, "takenAt" | "analysis" | "points">>) => void;
  onDelete: () => void;
}) {
  const { profile, update, model, db } = useProfile();
  const [recheck, setRecheck] = useState(false);
  const [draft, setDraft] = useState<{ analysis: PhotoAnalysis; points?: Capture["points"] } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const a = photo.analysis;
  const isProfilePhoto = profile.photo?.analyzedAt === a.analyzedAt;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  // Foundation matches for this photo's colour reading on its own
  const matches = useMemo(() => {
    if (!db) return [];
    const input = { ...matchInputFor(profile, model, db), target: a.lab, undertoneAxis: a.undertoneAxis, olive: isOliveLike(a.lab) };
    return rankFoundations(db, input).slice(0, 3);
  }, [db, profile, model, a]);

  const download = () => {
    const url = URL.createObjectURL(photo.image);
    const link = document.createElement("a");
    link.href = url;
    link.download = `perfectmatch-${photo.takenAt}.jpg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Portal to <body>: animated ancestors use transforms, which would trap a fixed overlay
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Photo from ${longDate(photo.takenAt)}`}
        className="pm-fade-up max-h-[92vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-t-[var(--radius-card)] bg-canvas p-5 shadow-2xl sm:rounded-[var(--radius-card)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="px-3" onClick={onPrev} disabled={!onPrev} aria-label="Earlier photo">
              ←
            </Button>
            <Button variant="ghost" className="px-3" onClick={onNext} disabled={!onNext} aria-label="Later photo">
              →
            </Button>
          </div>
          <p className="font-display text-xl">{longDate(photo.takenAt)}</p>
          <Button ref={closeRef} variant="ghost" className="px-3" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        {recheck ? (
          <div className="space-y-4">
            <PhotoAnalyzer
              source={photo.image}
              initial={a}
              initialPoints={photo.points}
              takenAt={photo.takenAt}
              onChange={(next, cap) => next && setDraft({ analysis: next, points: cap?.points })}
            />
            <div className="flex gap-2">
              <Button
                disabled={!draft}
                onClick={() => {
                  if (!draft) return;
                  onEdit({ analysis: draft.analysis, points: draft.points });
                  if (isProfilePhoto) update((p) => ({ ...p, photo: draft.analysis }));
                  setRecheck(false);
                  setDraft(null);
                }}
              >
                Save new reading
              </Button>
              <Button variant="ghost" onClick={() => setRecheck(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="min-w-0 space-y-3">
              <BlobImage
                blob={photo.image}
                alt={`Your photo from ${longDate(photo.takenAt)}`}
                className="mx-auto block max-h-[55vh] w-auto max-w-full rounded-2xl bg-line object-contain md:max-h-none md:w-full"
              />
              <label className="flex items-center gap-3 text-sm">
                <span className="text-muted">Date taken</span>
                <Input
                  type="date"
                  value={photo.takenAt}
                  max={localDate()}
                  onChange={(e) => e.target.value && onEdit({ takenAt: e.target.value })}
                  className="w-auto py-1.5"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setRecheck(true)}>
                  Re-check sample points
                </Button>
                <Button variant="secondary" onClick={download}>
                  Download
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm("Delete this photo from your gallery? This can't be undone.")) onDelete();
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <AnalysisSummary analysis={a} />

              <Card className="p-4 sm:p-5">
                <p className="font-medium">Foundation matches for this photo</p>
                <p className="mt-1 text-xs text-muted">Based on this photo&apos;s colour reading alone.</p>
                <ul className="mt-4 space-y-3">
                  {matches.map((m) => (
                    <li key={m.product.id} className="flex items-center gap-3">
                      <span className="flex -space-x-2">
                        <Swatch hex={a.hex} size={30} title="This photo" />
                        <Swatch hex={m.shade.hex} size={30} title={m.shade.label} className="ring-2 ring-surface" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block truncate font-medium">
                          {m.product.brand} · {m.shade.label}
                        </span>
                        <span className="block truncate text-muted">
                          {m.product.name} · {TIER_LABEL[m.product.tier]}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-good">{matchLabel(m.deltaE)}</span>
                    </li>
                  ))}
                  {!db && <li className="text-sm text-muted">Loading shade library…</li>}
                </ul>
                <p className="mt-4 text-xs leading-relaxed text-muted">
                  Your main recommendations combine every photo, your quiz and the shades you&apos;ve worn — they&apos;re
                  more reliable than any single photo.
                </p>
              </Card>

              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/profile/foundation">All foundation matches →</ButtonLink>
                <ButtonLink href="/profile/skincare" variant="secondary">
                  Skincare for my concerns →
                </ButtonLink>
                <ButtonLink href="/profile/makeup" variant="secondary">
                  Makeup colours →
                </ButtonLink>
              </div>

              {isProfilePhoto ? (
                <p className="text-sm text-good">✓ This is the photo your profile uses.</p>
              ) : (
                <Notice>
                  <span>Want your profile to use this photo&apos;s reading? </span>
                  <button
                    type="button"
                    className="font-medium underline underline-offset-4"
                    onClick={() => update((p) => ({ ...p, photo: a, onboarding: { ...p.onboarding, photo: true } }))}
                  >
                    Use this photo for my profile
                  </button>
                </Notice>
              )}
              <p className="text-xs text-faint">
                How reliable is this? <Link href="/science" className="underline">What a photo can and can&apos;t tell you</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
