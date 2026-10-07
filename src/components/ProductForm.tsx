"use client";

import { useMemo, useState } from "react";
import { guessFoundation } from "@/lib/foundations";
import { checkIngredients } from "@/lib/ingredients";
import { CATEGORY_LABEL, guessCategory, newId } from "@/lib/productParsing";
import type { ProductCategory, ProductEntry, Reaction, Verdict } from "@/lib/types";
import { IngredientLookup } from "./IngredientLookup";
import { IngredientWarnings } from "./IngredientWarnings";
import { useProfile } from "./ProfileProvider";
import { ReactionPicker } from "./ReactionPicker";
import { Button, Chip, Field, Input, Select, Swatch, Textarea } from "./ui";

export function ProductForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: ProductEntry;
  onDone: (e: ProductEntry) => void;
  onCancel?: () => void;
}) {
  const { profile, db } = useProfile();
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [category, setCategory] = useState<ProductCategory | "">(initial?.category ?? "");
  const [verdict, setVerdict] = useState<Verdict | undefined>(initial?.verdict);
  const [reactions, setReactions] = useState<Reaction[]>(initial?.reactions ?? []);
  const [shadeText, setShadeText] = useState(initial?.shade ?? "");
  const [chosenShade, setChosenShade] = useState<string | undefined>(initial?.shadeRef);
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? "");
  const [ingredientsSource, setIngredientsSource] = useState(initial?.ingredientsSource);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lookup, setLookup] = useState(false);

  const effectiveCategory: ProductCategory = category || guessCategory(`${brand} ${name}`) || "other";
  const complexion = effectiveCategory === "foundation" || effectiveCategory === "concealer";
  const guess = useMemo(
    () => (db && complexion && name.trim().length > 2 ? guessFoundation(db, `${brand} ${name}`, shadeText || undefined) : null),
    [db, complexion, brand, name, shadeText],
  );
  const shadeOptions = guess && db ? db.shades.get(guess.product.id) ?? [] : [];
  const shadeRef = chosenShade && shadeOptions.some((s) => s.ref === chosenShade) ? chosenShade : guess?.shade?.ref;

  const others = useMemo(() => ({ ...profile, products: profile.products.filter((p) => p.id !== initial?.id) }), [profile, initial?.id]);
  const warnings = useMemo(() => (ingredients.trim() ? checkIngredients(ingredients, others) : []), [ingredients, others]);

  const save = () => {
    if (!name.trim() || !verdict) return;
    const shade = shadeOptions.find((s) => s.ref === shadeRef);
    onDone({
      id: initial?.id ?? newId(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: effectiveCategory,
      verdict,
      reactions: verdict === "liked" ? [] : reactions,
      shade: complexion ? shade?.label ?? (shadeText.trim() || undefined) : undefined,
      shadeRef: complexion ? shade?.ref : undefined,
      ingredients: ingredients.trim() || undefined,
      ingredientsSource: ingredients.trim() ? ingredientsSource ?? "user" : undefined,
      notes: notes.trim() || undefined,
      source: initial?.source ?? "manual",
      raw: initial?.raw,
      addedAt: initial?.addedAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Double Wear Foundation" autoFocus={!initial} />
        </Field>
        <Field label="Brand">
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Estée Lauder" />
        </Field>
      </div>

      <Field label="Category">
        <Select value={category || effectiveCategory} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      </Field>

      {complexion && (
        <div className="space-y-3 rounded-2xl bg-canvas p-4">
          {guess ? (
            <>
              <p className="text-sm">
                Recognised as <span className="font-medium">{guess.product.brand} {guess.product.name}</span>
              </p>
              <Field label="Shade">
                <Select value={shadeRef ?? ""} onChange={(e) => setChosenShade(e.target.value || undefined)}>
                  <option value="">Choose your shade…</option>
                  {shadeOptions.map((s) => (
                    <option key={s.ref} value={s.ref}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {shadeRef && (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Swatch hex={shadeOptions.find((s) => s.ref === shadeRef)!.hex} size={20} />
                  This shade will {verdict === "liked" ? "anchor" : "help calibrate"} your colour match.
                </p>
              )}
            </>
          ) : (
            <Field label="Shade" hint="We'll try to recognise the product from its name and brand so the shade can calibrate your match.">
              <Input value={shadeText} onChange={(e) => setShadeText(e.target.value)} placeholder="e.g. 2N1 Desert" />
            </Field>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">How did it work for you?</p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={verdict === "liked"} onClick={() => setVerdict("liked")}>
            Worked for me
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
          <p className="mb-2 text-sm font-medium">What happened?</p>
          <ReactionPicker category={effectiveCategory} value={reactions} onChange={setReactions} />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <span className="text-sm font-medium">Ingredients</span>
          <button type="button" className="text-sm underline underline-offset-4" onClick={() => setLookup(!lookup)}>
            {lookup ? "Close search" : "Find ingredients automatically"}
          </button>
        </div>
        {lookup && (
          <IngredientLookup
            initialQuery={`${brand} ${name}`.trim()}
            onPick={(r) => {
              setIngredients(r.ingredients);
              setIngredientsSource("open-beauty-facts");
              if (!brand) setBrand(r.brand);
              setLookup(false);
            }}
          />
        )}
        <Textarea
          value={ingredients}
          onChange={(e) => {
            setIngredients(e.target.value);
            setIngredientsSource("user");
          }}
          placeholder="Paste the full ingredient list (INCI) — this is how we find irritant patterns."
          rows={4}
        />
        {ingredients.trim() && <IngredientWarnings warnings={warnings} empty="Nothing in here that we'd flag for you." />}
      </div>

      <Field label="Notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
      </Field>

      <div className="flex gap-2">
        <Button onClick={save} disabled={!name.trim() || !verdict}>
          {initial ? "Save changes" : "Add to my profile"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
