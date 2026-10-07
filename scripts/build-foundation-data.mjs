#!/usr/bin/env node
/**
 * Builds public/data/foundations.json from The Pudding's foundation shade dataset
 * (MIT licensed): https://github.com/the-pudding/data/tree/master/foundation-names
 *
 * Usage:
 *   node scripts/build-foundation-data.mjs            # downloads the CSV
 *   node scripts/build-foundation-data.mjs ./allShades.csv
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { BRAND_TIERS } from "./brand-tiers.mjs";

const SOURCE_URL =
  "https://raw.githubusercontent.com/the-pudding/data/master/foundation-names/allShades.csv";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const clean = (s) =>
  (s ?? "")
    .replace(/\s+selected\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
const isNA = (s) => !s || s === "NA";

/** Returns C, CN, N, WN, W, O or "" (unknown). */
function parseUndertone(description, code) {
  const d = description.toLowerCase();
  if (/\bolive\b/.test(d)) return "O";
  const cool = /\b(cool|pink|pinky|rosy|rose|red|reddish)\b/.test(d);
  const warm = /\b(warm|golden|gold|yellow|peach|peachy|orange|honey)\b/.test(d);
  const neutral = /\bneutral\b/.test(d);
  if (cool || warm || neutral) {
    if (cool && warm) return "N";
    if (neutral && warm) return "WN";
    if (neutral && cool) return "CN";
    if (warm) return "W";
    if (cool) return "C";
    return "N";
  }
  const c = code.toUpperCase();
  let m = c.match(/\b(WN|CN|WG|CF|CR|WO)\s?\d/);
  if (m) return { WN: "WN", CN: "CN", WG: "W", CF: "C", CR: "C", WO: "W" }[m[1]];
  m = c.match(/\d([CNWPGYRO])\d/); // Estée Lauder style 2W1, 1C1
  if (!m) m = c.match(/\d+(?:\.\d+)?\s?([CNWPGYRO])\b/); // 240N, 250G, 1.5W
  if (!m) m = c.match(/\b([CNWPGYRO])\s?\d/); // N10, W2
  if (m) return { C: "C", P: "C", R: "C", N: "N", W: "W", G: "W", Y: "W", O: "O" }[m[1]];
  return "";
}

function classify(productName) {
  const n = productName.toLowerCase();
  const form = /powder/.test(n)
    ? "powder"
    : /stick/.test(n)
      ? "stick"
      : /cushion/.test(n)
        ? "cushion"
        : /tinted moisturi|skin tint|\bbb\b|\bcc\b/.test(n)
          ? "tint"
          : /cream|crème|creme/.test(n)
            ? "cream"
            : "liquid";
  const finish = /matte|mattif|oil-free|powder|blur|velvet/.test(n)
    ? "matte"
    : /glow|luminous|radian|dew|illuminat|light reflecting|hydrat|silk|aqua|nude|healthy|serum/.test(n)
      ? "radiant"
      : "natural";
  const coverage = /full coverage|full-coverage|high cover|ultimate coverage|power|double wear|pro|24 ?h|longwear|long-wear|long wear|stay/.test(n)
    ? "full"
    : /tint|\bbb\b|\bcc\b|sheer|light|weightless|nude|skin foundation spf/.test(n)
      ? "light"
      : "medium";
  const spf = /spf/.test(n);
  return { form, finish, coverage, spf };
}

/** sRGB hex -> CIE L*a*b* (D65); used to drop broken swatches (grey/white placeholders). */
function hexToLab(hex) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const isPlausibleSkin = (hex) => {
  const [L, a, b] = hexToLab(hex);
  return L > 15 && L < 96 && Math.hypot(a, b) > 7 && b > 0;
};

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

async function main() {
  const arg = process.argv[2];
  const text = arg
    ? await readFile(arg, "utf8")
    : await fetch(SOURCE_URL).then((r) => {
        if (!r.ok) throw new Error(`Download failed: ${r.status}`);
        return r.text();
      });
  const rows = parseCsv(text);
  const products = new Map();
  const unknownBrands = new Set();

  for (const r of rows) {
    const hex = (r.hex || "").trim();
    if (!/^#[0-9a-f]{6}$/i.test(hex) || !isPlausibleSkin(hex)) continue;
    const brand = clean(r.brand);
    const name = clean(r.product);
    const description = clean(r.description || r.imgAlt);
    const code = isNA(r.specific) ? "" : clean(r.specific);
    const shadeName = isNA(r.name) ? "" : clean(r.name);
    let label = [code, shadeName].filter(Boolean).join(" ");
    if (!label) label = description.split("(")[0].split(" for ")[0].trim().slice(0, 40);
    if (!label) continue;

    const key = `${brand}|${name}`;
    if (!products.has(key)) {
      if (!(brand in BRAND_TIERS)) unknownBrands.add(brand);
      products.set(key, {
        id: slug(`${brand} ${name}`),
        brand,
        name,
        tier: BRAND_TIERS[brand] ?? 2,
        ...classify(name),
        shades: [],
        seen: new Set(),
      });
    }
    const p = products.get(key);
    const dedupe = `${label.toLowerCase()}|${hex.toLowerCase()}`;
    if (p.seen.has(dedupe)) continue;
    p.seen.add(dedupe);
    p.shades.push([label, hex.slice(1).toLowerCase(), parseUndertone(description, `${code} ${label}`)]);
  }

  const out = [...products.values()]
    .filter((p) => !/^mini\b/i.test(p.name) && p.shades.length >= 2)
    .map(({ seen, ...p }) => p) // eslint-disable-line no-unused-vars
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));

  // ids must be unique
  const ids = new Set();
  for (const p of out) {
    let id = p.id;
    for (let i = 2; ids.has(id); i++) id = `${p.id}-${i}`;
    p.id = id;
    ids.add(id);
  }

  const shadeCount = out.reduce((n, p) => n + p.shades.length, 0);
  const withUndertone = out.reduce((n, p) => n + p.shades.filter((s) => s[2]).length, 0);
  await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../public/data/foundations.json", import.meta.url),
    JSON.stringify({
      source: {
        name: "The Pudding — foundation-names dataset (Sephora & Ulta swatches, 2018)",
        url: "https://github.com/the-pudding/data/tree/master/foundation-names",
        license: "MIT",
      },
      products: out,
    }),
  );
  console.log(
    `Wrote ${out.length} products, ${shadeCount} shades (${withUndertone} with undertone).`,
  );
  if (unknownBrands.size) console.log("Brands without a tier (defaulted to mid):", [...unknownBrands].join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
