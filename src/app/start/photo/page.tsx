"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGallery } from "@/components/gallery/useGallery";
import { PhotoAnalyzer, type Capture } from "@/components/PhotoAnalyzer";
import { useProfile } from "@/components/ProfileProvider";
import { Button, Chip, Eyebrow, Input, Spinner, Title } from "@/components/ui";
import { localDate } from "@/lib/exif";
import { newId } from "@/lib/productParsing";
import type { PhotoAnalysis } from "@/lib/types";

const TIPS = [
  ["Face a window", "Soft daylight, no direct sun or overhead bulbs."],
  ["Bare skin", "No foundation, tinted SPF or filters."],
  ["Hair back", "So we can see your forehead, cheeks and jawline."],
  ["Eye level", "Camera straight on, face filling most of the frame."],
];

export default function PhotoStep() {
  const router = useRouter();
  const { profile, update, ready } = useProfile();
  const gallery = useGallery();
  const [analysis, setAnalysis] = useState<PhotoAnalysis | undefined>();
  const [capture, setCapture] = useState<Capture>();
  const [date, setDate] = useState("");
  // undefined = not chosen yet; defaults to the saved preference
  const [keep, setKeep] = useState<boolean | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const keepPhoto = keep ?? gallery.enabled;

  const save = async (a: PhotoAnalysis | undefined) => {
    // first time choosing: remember it. Afterwards "no" just skips this photo — turning the
    // gallery off (which deletes photos) only happens deliberately, on the Photos page.
    if (a && capture && keep !== undefined && !gallery.decided) await gallery.setEnabled(keep);
    else if (a && capture && keep && !gallery.enabled) await gallery.setEnabled(true);
    if (a && capture && keepPhoto) {
      setSaving(true);
      await gallery.add({
        id: newId(),
        owner: gallery.ownerId,
        takenAt: date || capture.takenAt,
        addedAt: new Date().toISOString(),
        image: capture.image,
        thumb: capture.thumb,
        analysis: a,
        points: capture.points,
      });
    }
    update((p) => ({ ...p, photo: a ?? p.photo, onboarding: { ...p.onboarding, photo: !!(a ?? p.photo) } }));
    router.push("/start/quiz");
  };

  return (
    <div className="pm-fade-up space-y-8">
      <div>
        <Eyebrow>Step 1</Eyebrow>
        <Title className="mt-3">Let&apos;s see your skin in natural light.</Title>
        <p className="mt-4 max-w-lg leading-relaxed text-muted">
          Take a selfie or upload one from your phone or computer. We&apos;ll read your depth and undertone and look for
          things like redness or shine — all on your device.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TIPS.map(([t, d]) => (
          <li key={t} className="rounded-2xl border border-line bg-surface p-3.5">
            <p className="text-sm font-medium">{t}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{d}</p>
          </li>
        ))}
      </ul>

      {ready && (
        <PhotoAnalyzer
          initial={profile.photo}
          onChange={(a, c) => {
            setAnalysis(a);
            setCapture(c);
          }}
        />
      )}

      {analysis && capture && (
        <div className="space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div>
            <p className="font-medium">{gallery.enabled ? "Save this photo to your gallery?" : "Keep this photo in a private gallery?"}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Lets you track your skin over time. Photos stay on this device only — never uploaded. You can turn this off
              any time in Photos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip selected={keepPhoto} onClick={() => setKeep(true)}>
              Yes, save it
            </Chip>
            <Chip selected={!keepPhoto} onClick={() => setKeep(false)}>
              {gallery.enabled ? "Not this one" : "No, don't save photos"}
            </Chip>
          </div>
          {keepPhoto && (
            <label className="flex items-center gap-3 text-sm">
              <span className="text-muted">Date taken</span>
              <Input type="date" value={date || capture.takenAt} max={localDate()} onChange={(e) => setDate(e.target.value)} className="w-auto py-1.5" />
            </label>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => save(undefined)}>
          {profile.photo ? "Keep my previous photo" : "Skip — I'll describe my skin instead"}
        </button>
        <Button onClick={() => save(analysis)} disabled={(!analysis && !profile.photo) || saving}>
          {saving && <Spinner />} Continue to the quiz
        </Button>
      </div>
    </div>
  );
}
