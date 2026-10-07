"use client";

import { useMemo, useState } from "react";
import { IngredientLookup } from "@/components/IngredientLookup";
import { IngredientWarnings } from "@/components/IngredientWarnings";
import { useProfile } from "@/components/ProfileProvider";
import { REACTION_LABEL } from "@/components/ReactionPicker";
import { Badge, Button, Card, Chip, Eyebrow, H2, Input, Meter, Textarea } from "@/components/ui";
import { checkIngredients, normalizeIngredient, personalSignals } from "@/lib/ingredients";

export default function IngredientsPage() {
  const { profile, update } = useProfile();
  const signals = useMemo(() => personalSignals(profile), [profile]);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<string | null>(null);
  const [lookup, setLookup] = useState(false);
  const [newAvoid, setNewAvoid] = useState("");
  const warnings = useMemo(() => (text.trim() ? checkIngredients(text, profile, signals) : []), [text, profile, signals]);
  const withIngredients = profile.products.filter((p) => p.ingredients).length;

  const clear = (key: string) => update((p) => ({ ...p, cleared: [...new Set([...p.cleared, key])] }));
  const avoidList = [...profile.quiz.allergies.map((a) => ({ name: a, from: "quiz" as const })), ...profile.watchlist.map((a) => ({ name: a, from: "list" as const }))];

  return (
    <div className="space-y-10">
      <div>
        <Eyebrow>Ingredients</Eyebrow>
        <H2 as="h1" className="mt-2">Your personal irritant radar.</H2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          We compare the ingredient lists of products that worked for you against the ones that didn&apos;t. Ingredients
          that keep showing up in the misses get flagged — so you can spot them before you buy.
        </p>
      </div>

      <Card className="space-y-4">
        <p className="font-display text-2xl">Check a product</p>
        <p className="text-sm text-muted">Paste an ingredient list from a product page or box, or search for it.</p>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setChecked(null);
          }}
          placeholder="Water, Glycerin, Niacinamide, …"
          rows={4}
        />
        <button type="button" className="text-sm underline underline-offset-4" onClick={() => setLookup(!lookup)}>
          {lookup ? "Close search" : "Search for a product instead"}
        </button>
        {lookup && (
          <IngredientLookup
            initialQuery=""
            onPick={(r) => {
              setText(r.ingredients);
              setChecked(`${r.brand} ${r.name}`);
              setLookup(false);
            }}
          />
        )}
        {text.trim() && (
          <div className="border-t border-line pt-4">
            {checked && <p className="mb-3 text-sm text-muted">Results for {checked}</p>}
            <IngredientWarnings warnings={warnings} onClear={clear} empty="Looks good — nothing here we'd flag for you." />
          </div>
        )}
      </Card>

      <section>
        <h2 className="font-display text-2xl">What we&apos;ve learned</h2>
        {signals.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {signals.map((s) => (
              <li key={s.key}>
                <Card className="h-full p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium capitalize">{s.label}</p>
                    <Badge tone={s.suspicion > 0.7 ? "bad" : "warn"}>{s.kind === "family" ? "pattern" : "ingredient"}</Badge>
                  </div>
                  <Meter value={s.suspicion * 100} className="mt-3" />
                  <p className="mt-3 text-sm text-muted">
                    In {s.dislikedProducts.length} product{s.dislikedProducts.length > 1 ? "s" : ""} that didn&apos;t work
                    {s.likedProducts.length ? ` and ${s.likedProducts.length} that did` : ", none that did"}.
                  </p>
                  <p className="mt-1 text-xs text-faint">{s.dislikedProducts.slice(0, 3).join(" · ")}</p>
                  {s.reactions.length > 0 && <p className="mt-1 text-xs text-bad">{s.reactions.map((r) => REACTION_LABEL[r]).join(" · ")}</p>}
                  <button
                    type="button"
                    onClick={() => clear(s.kind === "family" ? `family:${s.key.slice(2)}` : s.label)}
                    className="mt-3 text-xs underline underline-offset-4"
                  >
                    Not a problem for me
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No patterns yet. {withIngredients < 3 ? `Log a few products with ingredient lists (you have ${withIngredients}) — especially ones that caused trouble.` : "So far nothing stands out — good news."}
          </p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="font-medium">Always avoid</p>
          <p className="mt-1 text-sm text-muted">Anything here is flagged in every product check.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = newAvoid.trim();
              if (v) update((p) => ({ ...p, watchlist: [...new Set([...p.watchlist, v])] }));
              setNewAvoid("");
            }}
          >
            <Input value={newAvoid} onChange={(e) => setNewAvoid(e.target.value)} placeholder="e.g. coconut oil" />
            <Button type="submit" variant="secondary" disabled={!newAvoid.trim()}>
              Add
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {avoidList.map((a) => (
              <Chip
                key={`${a.from}-${a.name}`}
                selected
                onClick={() =>
                  update((p) =>
                    a.from === "quiz"
                      ? { ...p, quiz: { ...p.quiz, allergies: p.quiz.allergies.filter((x) => x !== a.name) } }
                      : { ...p, watchlist: p.watchlist.filter((x) => x !== a.name) },
                  )
                }
              >
                {a.name} ✕
              </Chip>
            ))}
          </div>
        </Card>
        <Card>
          <p className="font-medium">Fine for me</p>
          <p className="mt-1 text-sm text-muted">Ingredients you&apos;ve told us not to worry about.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.cleared.length ? (
              profile.cleared.map((c) => (
                <Chip key={c} onClick={() => update((p) => ({ ...p, cleared: p.cleared.filter((x) => x !== c) }))}>
                  {c.startsWith("family:") ? `${c.slice(7).replace("-", " ")} (all)` : normalizeIngredient(c)} ✕
                </Chip>
              ))
            ) : (
              <span className="text-sm text-faint">None yet.</span>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
