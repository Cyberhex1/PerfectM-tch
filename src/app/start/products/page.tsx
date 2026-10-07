"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ReactionPicker } from "@/components/ReactionPicker";
import { Badge, Button, Eyebrow, Field, Select, Textarea } from "@/components/ui";
import { CATEGORY_LABEL, parseProductList } from "@/lib/productParsing";
import type { ProductCategory, ProductEntry } from "@/lib/types";

export default function ProductsStep() {
  const router = useRouter();
  const { profile, update, db, ready } = useProfile();
  const fromQuiz = profile.products.filter((p) => p.source === "quiz");
  const [liked, setLiked] = useState(() => fromQuiz.filter((p) => p.verdict === "liked").map((p) => p.raw ?? p.name).join("\n"));
  const [disliked, setDisliked] = useState(() => fromQuiz.filter((p) => p.verdict === "disliked").map((p) => p.raw ?? p.name).join("\n"));
  const [review, setReview] = useState<ProductEntry[] | null>(null);

  const parsed = useMemo(
    () => ({
      liked: parseProductList(liked, "liked", db),
      disliked: parseProductList(disliked, "disliked", db),
    }),
    [liked, disliked, db],
  );

  const startReview = () => {
    const previous = new Map(fromQuiz.map((p) => [`${p.verdict}|${p.raw}`, p]));
    // keep details (reactions, ingredients) the person already added for the same line
    const entries = [...parsed.liked, ...parsed.disliked].map(({ entry }) => {
      const prev = previous.get(`${entry.verdict}|${entry.raw}`);
      return prev ? { ...entry, ...prev, id: prev.id } : entry;
    });
    if (!entries.length) return finish([]);
    setReview(entries);
  };

  const finish = (entries: ProductEntry[]) => {
    update((p) => ({
      ...p,
      products: [...p.products.filter((x) => x.source !== "quiz"), ...entries],
      onboarding: { ...p.onboarding, quiz: true, products: true },
    }));
    router.push("/start/budget");
  };

  const patch = (id: string, change: Partial<ProductEntry>) => setReview((r) => r!.map((e) => (e.id === id ? { ...e, ...change } : e)));

  if (!ready) return null;

  if (review) {
    const dislikedEntries = review.filter((e) => e.verdict === "disliked");
    return (
      <div className="pm-fade-up space-y-8">
        <div>
          <Eyebrow>Step 2 · Almost done</Eyebrow>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">Quick check</h1>
          <p className="mt-2 text-muted">
            Fix anything we sorted wrong{dislikedEntries.length ? ", and tell us what went wrong with the ones you didn't like" : ""}. This is
            what teaches your profile.
          </p>
        </div>
        <ul className="space-y-3">
          {review.map((e) => (
            <li key={e.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={e.verdict === "liked" ? "good" : "bad"}>{e.verdict === "liked" ? "Liked" : "Didn't work"}</Badge>
                    {e.shadeRef && <Badge tone="accent">Shade recognised</Badge>}
                  </div>
                  <p className="mt-2 font-medium">{e.brand ? `${e.brand} ${e.name}` : e.name}</p>
                  {e.shade && <p className="text-sm text-muted">Shade {e.shade}</p>}
                  {e.brand && e.raw && <p className="text-xs text-faint">You wrote “{e.raw}”</p>}
                </div>
                <Select
                  aria-label="Category"
                  className="w-auto py-1.5 text-sm"
                  value={e.category}
                  onChange={(ev) => patch(e.id, { category: ev.target.value as ProductCategory })}
                >
                  {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              {e.verdict === "disliked" && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">What went wrong?</p>
                  <ReactionPicker category={e.category} value={e.reactions} onChange={(reactions) => patch(e.id, { reactions })} />
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line pt-6">
          <Button variant="ghost" onClick={() => setReview(null)}>
            Back
          </Button>
          <Button onClick={() => finish(review)}>Save and continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-fade-up space-y-8">
      <div>
        <Eyebrow>Step 2 · Last question</Eyebrow>
        <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">What have you already tried?</h1>
        <p className="mt-2 text-muted">
          Any category — foundation, skincare, sunscreen. Include shades for foundations if you remember them (e.g.
          “Fenty Pro Filt&apos;r 240”). One per line.
        </p>
      </div>
      <Field label="Products I've tried and liked">
        <Textarea
          value={liked}
          onChange={(e) => setLiked(e.target.value)}
          placeholder={"Estée Lauder Double Wear 2N1 Desert\nCeraVe Moisturizing Cream\nSupergoop Unseen Sunscreen"}
          rows={5}
        />
      </Field>
      <Recognized lines={parsed.liked} />
      <Field label="Products I've tried and disliked">
        <Textarea
          value={disliked}
          onChange={(e) => setDisliked(e.target.value)}
          placeholder={"Maybelline Fit Me 220 — too pink\nA rose-scented toner that made me red"}
          rows={5}
        />
      </Field>
      <Recognized lines={parsed.disliked} />
      <div className="flex items-center justify-between border-t border-line pt-6">
        <Button variant="ghost" onClick={() => router.push("/start/quiz")}>
          Back
        </Button>
        <Button onClick={startReview}>{liked.trim() || disliked.trim() ? "Next" : "Skip for now"}</Button>
      </div>
    </div>
  );
}

function Recognized({ lines }: { lines: ReturnType<typeof parseProductList> }) {
  const hits = lines.filter((l) => l.recognized);
  if (!hits.length) return null;
  return (
    <div className="-mt-5 flex flex-wrap gap-1.5">
      {hits.map((l) => (
        <Badge key={l.entry.id} tone="accent">
          ✓ {l.recognized}
        </Badge>
      ))}
    </div>
  );
}
