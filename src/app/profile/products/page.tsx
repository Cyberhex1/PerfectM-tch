"use client";

import { useMemo, useState } from "react";
import { IngredientWarnings } from "@/components/IngredientWarnings";
import { ProductForm } from "@/components/ProductForm";
import { useProfile } from "@/components/ProfileProvider";
import { REACTION_LABEL } from "@/components/ReactionPicker";
import { Badge, Button, Card, Chip, Eyebrow, H2, Swatch } from "@/components/ui";
import { resolveShade } from "@/lib/foundations";
import { checkIngredients, personalSignals } from "@/lib/ingredients";
import { CATEGORY_LABEL } from "@/lib/productParsing";
import type { ProductEntry, Verdict } from "@/lib/types";

const VERDICT = {
  liked: { label: "Worked", tone: "good" },
  neutral: { label: "Okay", tone: "neutral" },
  disliked: { label: "Didn't work", tone: "bad" },
} as const;

export default function ProductsPage() {
  const { profile, update } = useProfile();
  const [adding, setAdding] = useState(profile.products.length === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<Verdict | "all">("all");
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const list = [...profile.products]
    .filter((p) => filter === "all" || p.verdict === filter)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const missingIngredients = profile.products.filter((p) => !p.ingredients && p.category !== "foundation").length;

  const upsert = (e: ProductEntry) => {
    update((p) => ({
      ...p,
      products: p.products.some((x) => x.id === e.id) ? p.products.map((x) => (x.id === e.id ? e : x)) : [...p.products, e],
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>My products</Eyebrow>
          <H2 as="h1" className="mt-2">Everything you&apos;ve tried.</H2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Each product you log tunes your shade match and teaches us which ingredients your skin doesn&apos;t like.
            Products with ingredient lists teach us the most.
          </p>
        </div>
        {!adding && <Button onClick={() => setAdding(true)}>Log a product</Button>}
      </div>

      {adding && (
        <Card>
          <p className="mb-5 font-display text-2xl">Log a product</p>
          <ProductForm
            onDone={(e) => {
              upsert(e);
              setAdding(false);
              setJustAdded(e.id);
            }}
            onCancel={profile.products.length ? () => setAdding(false) : undefined}
          />
        </Card>
      )}

      {missingIngredients > 0 && !adding && (
        <p className="text-sm text-muted">
          {missingIngredients} logged product{missingIngredients > 1 ? "s are" : " is"} missing an ingredient list. Add
          them with <span className="font-medium text-ink">Edit → Find ingredients automatically</span>.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "liked", "neutral", "disliked"] as const).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? `All (${profile.products.length})` : `${VERDICT[f].label} (${profile.products.filter((p) => p.verdict === f).length})`}
          </Chip>
        ))}
      </div>

      <ul className="space-y-3">
        {list.map((p) =>
          editing === p.id ? (
            <li key={p.id}>
              <Card>
                <ProductForm
                  initial={p}
                  onDone={(e) => {
                    upsert(e);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              </Card>
            </li>
          ) : (
            <ProductRow
              key={p.id}
              entry={p}
              highlight={p.id === justAdded}
              onEdit={() => setEditing(p.id)}
              onDelete={() => {
                if (confirm(`Remove ${p.name} from your profile?`)) update((x) => ({ ...x, products: x.products.filter((y) => y.id !== p.id) }));
              }}
            />
          ),
        )}
        {!list.length && !adding && <p className="py-10 text-center text-sm text-muted">Nothing here yet.</p>}
      </ul>
    </div>
  );
}

function ProductRow({ entry, onEdit, onDelete, highlight }: { entry: ProductEntry; onEdit: () => void; onDelete: () => void; highlight: boolean }) {
  const { profile, db } = useProfile();
  const [open, setOpen] = useState(false);
  const shade = db ? resolveShade(db, entry.shadeRef) : null;
  const warnings = useMemo(() => {
    if (!entry.ingredients) return [];
    const others = { ...profile, products: profile.products.filter((p) => p.id !== entry.id) };
    return checkIngredients(entry.ingredients, others, personalSignals(others));
  }, [entry, profile]);

  return (
    <li>
      <Card className={highlight ? "border-ink/40 p-4 sm:p-5" : "p-4 sm:p-5"}>
        <div className="flex items-start gap-4">
          {shade && <Swatch hex={shade.shade.hex} size={36} />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={VERDICT[entry.verdict].tone}>{VERDICT[entry.verdict].label}</Badge>
              <Badge>{CATEGORY_LABEL[entry.category]}</Badge>
              {entry.ingredients && <Badge tone="accent">ingredients ✓</Badge>}
            </div>
            <p className="mt-2 font-medium">
              {entry.brand && <span className="text-muted">{entry.brand} </span>}
              {entry.name}
            </p>
            {entry.shade && <p className="text-sm text-muted">Shade {entry.shade}</p>}
            {entry.reactions.length > 0 && <p className="mt-1 text-sm text-bad">{entry.reactions.map((r) => REACTION_LABEL[r]).join(" · ")}</p>}
            {entry.notes && <p className="mt-1 text-sm text-muted">{entry.notes}</p>}
            {warnings.length > 0 && (
              <button type="button" onClick={() => setOpen(!open)} className="mt-2 text-sm text-warn underline underline-offset-4">
                {warnings.length} ingredient flag{warnings.length > 1 ? "s" : ""}
              </button>
            )}
            {open && (
              <div className="mt-3">
                <IngredientWarnings warnings={warnings} />
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
            <button type="button" onClick={onEdit} className="text-ink underline underline-offset-4">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="text-muted hover:text-bad">
              Remove
            </button>
          </div>
        </div>
      </Card>
    </li>
  );
}
