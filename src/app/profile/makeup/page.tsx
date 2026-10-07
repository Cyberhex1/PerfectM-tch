"use client";

import { useMemo } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { Card, Eyebrow, H2, Swatch } from "@/components/ui";
import { makeupSuggestions } from "@/lib/makeup";

export default function MakeupPage() {
  const { profile, model } = useProfile();
  const sections = useMemo(() => makeupSuggestions(model, profile), [model, profile]);

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Makeup</Eyebrow>
        <H2 className="mt-2">Colours and textures for {model.undertone} undertones.</H2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Swatches are a starting point — use them to narrow down shades in store. They update as your profile learns
          your exact depth and undertone.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title}>
            <p className="font-display text-2xl">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.summary}</p>
            {s.swatches && (
              <ul className="mt-5 flex flex-wrap gap-4">
                {s.swatches.map((sw) => (
                  <li key={sw.name} className="flex w-20 flex-col items-center gap-2 text-center text-xs leading-tight">
                    <Swatch hex={sw.hex} size={48} />
                    {sw.name}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
              {s.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-accent">·</span>
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
