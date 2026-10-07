"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoAnalyzer } from "@/components/PhotoAnalyzer";
import { useProfile } from "@/components/ProfileProvider";
import { Button, Eyebrow, Title } from "@/components/ui";
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
  const [analysis, setAnalysis] = useState<PhotoAnalysis | undefined>();

  const save = (a: PhotoAnalysis | undefined) => {
    update((p) => ({ ...p, photo: a ?? p.photo, onboarding: { ...p.onboarding, photo: !!(a ?? p.photo) } }));
    router.push("/start/quiz");
  };

  return (
    <div className="pm-fade-up space-y-8">
      <div>
        <Eyebrow>Step 1</Eyebrow>
        <Title className="mt-3">Let&apos;s see your skin in natural light.</Title>
        <p className="mt-4 max-w-lg leading-relaxed text-muted">
          We&apos;ll read your depth and undertone and look for things like redness or shine. Everything happens in
          your browser.
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

      {ready && <PhotoAnalyzer initial={profile.photo} onChange={setAnalysis} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => save(undefined)}>
          {profile.photo ? "Keep my previous photo" : "Skip — I'll describe my skin instead"}
        </button>
        <Button onClick={() => save(analysis)} disabled={!analysis && !profile.photo}>
          Continue to the quiz
        </Button>
      </div>
    </div>
  );
}
