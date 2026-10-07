import "server-only";

/**
 * Open Beauty Facts — free, open cosmetics database (no API key).
 * https://world.openbeautyfacts.org/data  ·  data licence: ODbL
 *
 * Their full-text search endpoint is sometimes flaky, so we fall back to a
 * brand-filtered query and rank the results ourselves.
 */
const BASE = "https://world.openbeautyfacts.org";
const FIELDS = "code,product_name,brands,ingredients_text,ingredients_text_en,image_front_small_url";
const UA = `PerfectMatch/0.1 (${process.env.OBF_CONTACT ?? "https://github.com/cyberhex1/perfectm-tch"})`;

export type ObfProduct = { code: string; name: string; brand: string; ingredients: string; image?: string };

type Raw = {
  code?: string;
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  image_front_small_url?: string;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function get(url: string): Promise<Raw[]> {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`OBF ${res.status}`);
  const json = (await res.json()) as { products?: Raw[] };
  return json.products ?? [];
}

function rank(raw: Raw[], query: string): ObfProduct[] {
  const q = norm(query).split(" ").filter((t) => t.length > 1);
  return raw
    .map((p) => ({
      code: p.code ?? "",
      name: (p.product_name ?? "").trim(),
      brand: (p.brands ?? "").split(",")[0].trim(),
      ingredients: (p.ingredients_text_en || p.ingredients_text || "").trim(),
      image: p.image_front_small_url,
    }))
    .filter((p) => p.name && p.ingredients)
    .map((p) => {
      const hay = norm(`${p.brand} ${p.name}`);
      // loose token match so "moisturizing" finds "moisturising" and "cream" finds "creme"
      const hit = (t: string) => hay.includes(t) || (t.length > 5 && hay.includes(t.slice(0, 6))) || (t === "cream" && hay.includes("creme"));
      return { p, score: q.filter(hit).length / Math.max(1, q.length) };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.p);
}

export async function searchProducts(query: string): Promise<ObfProduct[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  try {
    const raw = await get(
      `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`,
    );
    const ranked = rank(raw, q);
    if (ranked.length) return ranked;
  } catch {
    // fall through to the brand-filtered query
  }
  const words = norm(q).split(" ");
  const tries = [words.slice(0, 2).join("-"), words[0]].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const brand of tries) {
    try {
      const raw = await get(`${BASE}/api/v2/search?brands_tags=${encodeURIComponent(brand)}&page_size=100&fields=${FIELDS}`);
      const ranked = rank(raw, q);
      if (ranked.length) return ranked;
    } catch {
      // try the next variant
    }
  }
  return [];
}
