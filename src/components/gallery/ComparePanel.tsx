"use client";

import { deltaE2000 } from "@/lib/color";
import type { GalleryPhoto } from "@/lib/photoStore";
import { concernLabel } from "../PhotoAnalyzer";
import { Badge, Card, Notice, Swatch } from "../ui";
import { BlobImage } from "./BlobImage";
import { METRICS } from "./TrendCharts";

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** Before/after view of two photos with the change in each reading. */
export function ComparePanel({ pair, onClose }: { pair: [GalleryPhoto, GalleryPhoto]; onClose: () => void }) {
  const [before, after] = [...pair].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const days = Math.round((Date.parse(after.takenAt) - Date.parse(before.takenAt)) / 86_400_000);
  const toneShift = deltaE2000(before.analysis.lab, after.analysis.lab);
  const lightingGap = Math.abs(before.analysis.quality - after.analysis.quality) > 0.25 || Math.min(before.analysis.quality, after.analysis.quality) < 0.6;

  return (
    <Card className="space-y-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-2xl">Before &amp; after</p>
        <button type="button" onClick={onClose} className="text-sm underline underline-offset-4">
          Done comparing
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[before, after].map((p, i) => (
          <figure key={p.id}>
            <BlobImage blob={p.image} alt={`${i ? "After" : "Before"} photo, ${fmt(p.takenAt)}`} className="block aspect-[3/4] w-full rounded-2xl bg-line object-cover" />
            <figcaption className="mt-2 flex items-center justify-between text-sm">
              <span>
                <span className="text-muted">{i ? "After" : "Before"} · </span>
                {fmt(p.takenAt)}
              </span>
              <Swatch hex={p.analysis.hex} size={20} title="Skin tone reading" />
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="text-sm text-muted">{days === 0 ? "Same day" : `${days} day${days === 1 ? "" : "s"} apart`}</p>

      {before.analysis.metrics && after.analysis.metrics ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {METRICS.map((m) => {
            const a = before.analysis.metrics![m];
            const b = after.analysis.metrics![m];
            const d = Math.round((b - a) * 100);
            return (
              <li key={m} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>{concernLabel(m)}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="text-muted">
                    {Math.round(a * 100)} → {Math.round(b * 100)}
                  </span>
                  {Math.abs(d) < 8 ? (
                    <Badge>about the same</Badge>
                  ) : d < 0 ? (
                    <Badge tone="good">↓ better</Badge>
                  ) : (
                    <Badge tone="warn">↑ more visible</Badge>
                  )}
                </span>
              </li>
            );
          })}
          <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span>Skin tone</span>
            <span className="text-muted">
              {toneShift < 3 ? "no visible change" : toneShift < 6 ? "slightly different" : "noticeably different (tan, lighting or season)"}
            </span>
          </li>
        </ul>
      ) : (
        <p className="text-sm text-muted">One of these photos was saved before readings were tracked — re-check its sample points to compare.</p>
      )}

      {lightingGap ? (
        <Notice tone="warn">
          The lighting in these photos differs ({Math.round(before.analysis.quality * 100)}% vs {Math.round(after.analysis.quality * 100)}%),
          which changes the readings as much as your skin does. For a fair comparison, take photos in the same spot, at the
          same time of day, facing the same window.
        </Notice>
      ) : (
        <p className="text-xs leading-relaxed text-muted">
          Small changes (under ~8 points) are within normal photo-to-photo variation. Trust trends across several photos
          more than any single pair.
        </p>
      )}
    </Card>
  );
}
