"use client";

import { useProfile } from "./ProfileProvider";
import { ButtonLink, Eyebrow } from "./ui";

const SKIN = ["#f6dcc8", "#eec4a5", "#dca988", "#c88f6b", "#a8704d", "#87553a", "#5e3a28", "#3f2619"];

const STEPS = [
  { n: "01", title: "A photo in daylight", body: "We read your skin's depth and undertone right in your browser — your photo never leaves your device." },
  { n: "02", title: "A two-minute quiz", body: "Skin type, sensitivities, what you've loved and what you'd never buy again." },
  { n: "03", title: "Your budget, your call", body: "Slide between price and performance. We'll balance the picks for you." },
  { n: "04", title: "A profile that learns", body: "Log products as you go. Shade matches tighten and irritant patterns surface over time." },
];

export function HomeHero() {
  const { ready, profile } = useProfile();
  const started = ready && (profile.onboarding.quiz || !!profile.photo || profile.products.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-5">
      <section className="pm-fade-up py-16 sm:py-24">
        <div className="mb-8 flex -space-x-2">
          {SKIN.map((c) => (
            <span key={c} className="h-9 w-9 rounded-full ring-2 ring-canvas sm:h-11 sm:w-11" style={{ background: c }} />
          ))}
        </div>
        <Eyebrow>Foundation · makeup · skincare</Eyebrow>
        <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
          The face profile that <em className="text-accent">learns</em> what works for you.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Find your foundation shade across 300+ formulas, get makeup and skincare picks for your skin and budget, and
          keep a running list of ingredients that don&apos;t agree with you.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          {started ? (
            <>
              <ButtonLink href="/profile" className="px-7 py-3 text-base">
                Open my profile
              </ButtonLink>
              <ButtonLink href="/start/photo" variant="secondary" className="px-6 py-3 text-base">
                Retake the setup
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/start/photo" className="px-7 py-3 text-base">
              Find my match
            </ButtonLink>
          )}
          <span className="text-sm text-faint">Free · about 3 minutes</span>
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2">
        {STEPS.map((s) => (
          <div key={s.n} className="bg-surface p-6 sm:p-8">
            <p className="font-display text-xl text-accent">{s.n}</p>
            <h2 className="mt-3 text-lg font-medium">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
