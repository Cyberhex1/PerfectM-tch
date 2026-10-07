"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ReactionPicker } from "@/components/ReactionPicker";
import { Badge, Button, Card, Chip, cx, Eyebrow, H2, Notice, Spinner, Swatch } from "@/components/ui";
import { matchLabel, TIER_LABEL, UNDERTONE_LABEL, type FoundationMatch } from "@/lib/foundations";
import { newId } from "@/lib/productParsing";
import { foundationIdFor, topFoundations } from "@/lib/recommend";
import type { Finish, Reaction, Verdict } from "@/lib/types";

type Filters = { finish?: Finish; maxTier: 1 | 2 | 3 | 4; spf?: boolean };

export default function FoundationPage() {
  const { profile, model, db, dbError } = useProfile();
  const [filters, setFilters] = useState<Filters>({ maxTier: 4 });
  const [limit, setLimit] = useState(12);
  const ranked = useMemo(() => (db ? topFoundations(profile, model, db) : []), [profile, model, db]);
  const shown = ranked.filter(
    (m) => (!filters.finish || m.product.finish === filters.finish) && m.product.tier <= filters.maxTier && (!filters.spf || m.product.spf),
  );

  if (dbError) return <Notice tone="bad">{dbError}</Notice>;
  if (!db)
    return (
      <div className="grid min-h-[30vh] place-items-center text-muted">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Foundation</Eyebrow>
          <H2 className="mt-2">Your closest shades, across {db.products.length} formulas.</H2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Ranked by colour match first, then your finish, coverage, skin type and budget. Tried one? Tell us how it
            went — it&apos;s the fastest way to a perfect match.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <Swatch hex={model.hex} size={40} />
          <div className="text-sm">
            <p className="font-medium">Your target</p>
            <p className="text-muted">{Math.round(model.confidence * 100)}% confidence</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["matte", "natural", "radiant"] as Finish[]).map((f) => (
          <Chip key={f} selected={filters.finish === f} onClick={() => setFilters({ ...filters, finish: filters.finish === f ? undefined : f })}>
            {f}
          </Chip>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" />
        {([1, 2, 3, 4] as const).map((t) => (
          <Chip key={t} selected={filters.maxTier === t} onClick={() => setFilters({ ...filters, maxTier: t })}>
            up to {TIER_LABEL[t]}
          </Chip>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" />
        <Chip selected={!!filters.spf} onClick={() => setFilters({ ...filters, spf: !filters.spf })}>
          with SPF
        </Chip>
      </div>

      <ol className="space-y-3">
        {shown.slice(0, limit).map((m, i) => (
          <MatchCard key={m.product.id} rank={i + 1} match={m} />
        ))}
      </ol>
      {shown.length > limit && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => setLimit(limit + 12)}>
            Show more
          </Button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-faint">
        Shade colours come from retailer swatch images collected by{" "}
        <a className="underline" href={db.source.url} target="_blank" rel="noreferrer">
          The Pudding
        </a>{" "}
        ({db.source.license}). Swatches are approximations and some ranges have changed since — always check a shade in
        daylight on your jawline before you buy. Prices are rough tiers: $ under $20 · $$ $20–40 · $$$ $40–60 · $$$$ $60+.
      </p>
    </div>
  );
}

function MatchCard({ match, rank }: { match: FoundationMatch; rank: number }) {
  const { profile, update, model, db } = useProfile();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const { product, shade } = match;
  const logged = db ? profile.products.find((p) => p.category === "foundation" && foundationIdFor(p, db) === product.id) : undefined;

  return (
    <li>
      <Card className="p-4 sm:p-5">
        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
            <div className="flex -space-x-2">
              <Swatch hex={model.hex} size={36} title="You" />
              <Swatch hex={shade.hex} size={36} title={shade.label} className="ring-2 ring-surface" />
            </div>
            <span className="text-[10px] uppercase tracking-wider text-faint">#{rank}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium">{product.brand}</p>
              <span className={cx("text-sm", match.deltaE < 5.5 ? "text-good" : "text-muted")}>{matchLabel(match.deltaE)}</span>
            </div>
            <p className="text-sm text-muted">{product.name}</p>
            <p className="mt-2 text-sm">
              Shade <span className="font-medium">{shade.label}</span>
              {shade.undertone && <span className="text-muted"> · {UNDERTONE_LABEL[shade.undertone]}</span>}
              <span className="text-faint"> · ΔE {match.deltaE.toFixed(1)}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge>{TIER_LABEL[product.tier]}</Badge>
              <Badge>{product.finish}</Badge>
              <Badge>{product.coverage} coverage</Badge>
              {product.form !== "liquid" && <Badge>{product.form}</Badge>}
              {product.spf && <Badge>SPF</Badge>}
              {logged && <Badge tone={logged.verdict === "liked" ? "good" : logged.verdict === "disliked" ? "bad" : "neutral"}>in your log</Badge>}
            </div>
            {(match.reasons.length > 0 || match.cautions.length > 0) && (
              <ul className="mt-3 space-y-1 text-sm">
                {match.reasons.slice(0, 2).map((r) => (
                  <li key={r} className="text-muted">
                    ✓ {r}
                  </li>
                ))}
                {match.cautions.map((c) => (
                  <li key={c} className="text-warn">
                    ! {c}
                  </li>
                ))}
              </ul>
            )}
            {match.alternatives.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                Between shades? Also try
                {match.alternatives.map((a) => (
                  <span key={a.ref} className="inline-flex items-center gap-1.5 text-ink">
                    <Swatch hex={a.hex} size={16} /> {a.label}
                  </span>
                ))}
              </p>
            )}
            <div className="mt-4">
              {saved ? (
                <p className="text-sm text-good">Thanks — your profile just got a little smarter.</p>
              ) : open ? (
                <TryForm
                  onCancel={() => setOpen(false)}
                  shades={[shade, ...match.alternatives]}
                  onSave={(verdict, reactions, ref) => {
                    const s = [shade, ...match.alternatives].find((x) => x.ref === ref) ?? shade;
                    update((p) => ({
                      ...p,
                      products: [
                        ...p.products,
                        {
                          id: newId(),
                          brand: product.brand,
                          name: product.name,
                          category: "foundation",
                          shade: s.label,
                          shadeRef: s.ref,
                          verdict,
                          reactions,
                          source: "manual",
                          addedAt: new Date().toISOString(),
                        },
                      ],
                    }));
                    setSaved(true);
                    setOpen(false);
                  }}
                />
              ) : (
                <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium underline underline-offset-4">
                  I&apos;ve tried this
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </li>
  );
}

function TryForm({
  shades,
  onSave,
  onCancel,
}: {
  shades: { ref: string; label: string; hex: string }[];
  onSave: (v: Verdict, r: Reaction[], shadeRef: string) => void;
  onCancel: () => void;
}) {
  const [verdict, setVerdict] = useState<Verdict>();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [ref, setRef] = useState(shades[0].ref);
  return (
    <div className="space-y-4 rounded-2xl bg-canvas p-4">
      {shades.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-medium">Which shade did you wear?</p>
          <div className="flex flex-wrap gap-2">
            {shades.map((s) => (
              <Chip key={s.ref} selected={ref === s.ref} onClick={() => setRef(s.ref)} className="inline-flex items-center gap-1.5">
                <Swatch hex={s.hex} size={14} /> {s.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-sm font-medium">How was it?</p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={verdict === "liked"} onClick={() => setVerdict("liked")}>
            Loved it
          </Chip>
          <Chip selected={verdict === "neutral"} onClick={() => setVerdict("neutral")}>
            It was okay
          </Chip>
          <Chip selected={verdict === "disliked"} onClick={() => setVerdict("disliked")}>
            Didn&apos;t work
          </Chip>
        </div>
      </div>
      {verdict && verdict !== "liked" && (
        <div>
          <p className="mb-2 text-sm font-medium">What was off?</p>
          <ReactionPicker category="foundation" value={reactions} onChange={setReactions} />
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={() => verdict && onSave(verdict, verdict === "liked" ? [] : reactions, ref)} disabled={!verdict}>
          Save
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
