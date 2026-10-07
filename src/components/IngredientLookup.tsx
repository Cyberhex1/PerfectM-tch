"use client";

import { useState } from "react";
import { Button, Input, Notice, Spinner } from "./ui";

export type LookupResult = { code: string; name: string; brand: string; ingredients: string; image?: string };

/** Search Open Beauty Facts (free, no key) for a product's ingredient list. */
export function IngredientLookup({ initialQuery, onPick }: { initialQuery: string; onPick: (r: LookupResult) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<{ busy?: boolean; results?: LookupResult[]; error?: string }>({});

  const search = async () => {
    if (query.trim().length < 2) return;
    setState({ busy: true });
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      setState({ results: json.products ?? [], error: json.error });
    } catch {
      setState({ error: "Search is unavailable right now." });
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-canvas p-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Brand and product name" />
        <Button type="submit" variant="secondary" disabled={state.busy}>
          {state.busy ? <Spinner /> : "Search"}
        </Button>
      </form>
      {state.error && <Notice tone="warn">{state.error}</Notice>}
      {state.results && !state.results.length && !state.error && (
        <p className="text-sm text-muted">
          No match in Open Beauty Facts. You can paste the ingredient list from the brand&apos;s site or the box instead.
        </p>
      )}
      {state.results && state.results.length > 0 && (
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {state.results.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:border-ink/40"
              >
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote thumbnails from Open Beauty Facts
                  <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" />
                ) : (
                  <span className="h-10 w-10 shrink-0 rounded-lg bg-line" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted">{r.brand}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-faint">Ingredient data from Open Beauty Facts, a free community database — double-check against the packaging.</p>
    </div>
  );
}
