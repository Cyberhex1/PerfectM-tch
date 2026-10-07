"use client";

import { useState } from "react";
import type { GalleryPhoto } from "@/lib/photoStore";
import type { SkinMetrics } from "@/lib/types";
import { concernLabel } from "../PhotoAnalyzer";

export const METRICS: (keyof SkinMetrics)[] = ["redness", "uneven-tone", "hyperpigmentation", "oiliness", "texture"];

const W = 260;
const H = 96;
const PAD = { l: 26, r: 10, t: 10, b: 20 };

const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString(undefined, opts);

/** Small multiples: one chart per skin reading, all on the same 0–100 scale. */
export function TrendCharts({ photos }: { photos: GalleryPhoto[] }) {
  const [table, setTable] = useState(false);
  const points = photos.filter((p) => p.analysis.metrics);
  if (points.length < 2)
    return <p className="text-sm text-muted">Add at least two dated photos to see how your skin readings change over time.</p>;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">On-device readings, 0–100 · lower is better</p>
        <button type="button" onClick={() => setTable(!table)} className="text-xs underline underline-offset-2">
          {table ? "Show charts" : "Show as table"}
        </button>
      </div>
      {table ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Date</th>
                {METRICS.map((m) => (
                  <th key={m} className="py-2 pr-3 font-medium">
                    {concernLabel(m)}
                  </th>
                ))}
                <th className="py-2 font-medium">Lighting</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="py-2 pr-3">{fmtDate(p.takenAt, { year: "numeric", month: "short", day: "numeric" })}</td>
                  {METRICS.map((m) => (
                    <td key={m} className="py-2 pr-3 tabular-nums">
                      {Math.round(p.analysis.metrics![m] * 100)}
                    </td>
                  ))}
                  <td className="py-2 tabular-nums">{Math.round(p.analysis.quality * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map((m) => (
            <Sparkline key={m} metric={m} photos={points} />
          ))}
        </div>
      )}
    </div>
  );
}

function Sparkline({ metric, photos }: { metric: keyof SkinMetrics; photos: GalleryPhoto[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const times = photos.map((p) => new Date(`${p.takenAt}T12:00:00`).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (t: number) => PAD.l + (t1 === t0 ? (W - PAD.l - PAD.r) / 2 : ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
  const pts = photos.map((p, i) => ({ x: x(times[i]), y: y(p.analysis.metrics![metric]), v: p.analysis.metrics![metric], p }));
  const path = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
  const first = pts[0].v;
  const last = pts[pts.length - 1].v;
  const change = Math.round((last - first) * 100);
  const h = hover !== null ? pts[hover] : null;

  return (
    <figure className="rounded-2xl border border-line bg-surface p-3.5">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{concernLabel(metric)}</span>
        <span className="text-xs text-muted tabular-nums">
          {Math.abs(change) < 8 ? "about the same" : change < 0 ? `↓ ${-change} pts` : `↑ ${change} pts`}
        </span>
      </figcaption>
      <div className="relative mt-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full"
          role="img"
          aria-label={`${concernLabel(metric)} from ${Math.round(first * 100)} to ${Math.round(last * 100)} across ${pts.length} photos`}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            let best = 0;
            pts.forEach((q, i) => {
              if (Math.abs(q.x - px) < Math.abs(pts[best].x - px)) best = i;
            });
            setHover(best);
          }}
        >
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="var(--color-faint)">
                {v * 100}
              </text>
            </g>
          ))}
          <text x={PAD.l} y={H - 4} fontSize={9} fill="var(--color-faint)">
            {fmtDate(photos[0].takenAt)}
          </text>
          <text x={W - PAD.r} y={H - 4} fontSize={9} textAnchor="end" fill="var(--color-faint)">
            {fmtDate(photos[photos.length - 1].takenAt)}
          </text>
          {h && <line x1={h.x} x2={h.x} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-faint)" strokeWidth={1} />}
          <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((q, i) => (
            <circle key={q.p.id} cx={q.x} cy={q.y} r={hover === i ? 5 : 4} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
          ))}
        </svg>
        {h && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2 py-1 text-xs shadow-sm"
            style={{ left: `${(h.x / W) * 100}%` }}
          >
            <span className="font-medium tabular-nums">{Math.round(h.v * 100)}</span>
            <span className="text-muted"> · {fmtDate(h.p.takenAt, { year: "numeric", month: "short", day: "numeric" })}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
