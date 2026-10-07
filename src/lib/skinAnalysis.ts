/**
 * On-device skin analysis. Runs entirely in the browser on canvas pixel data —
 * no API key, no upload. Everything here is a heuristic estimate and is labelled
 * as such in the UI; quiz answers and product feedback refine it over time.
 */
import {
  chroma,
  depthFromLab,
  isOliveLike,
  ita,
  labToHex,
  rgbToLab,
  undertoneAxisFromLab,
  undertoneFromAxis,
} from "./color";
import type { DetectedConcern, Lab, PhotoAnalysis, SkinMetrics } from "./types";

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
/** sample point in image-relative coordinates (0–1) */
export type SamplePoint = { id: "forehead" | "left-cheek" | "right-cheek" | "jaw"; x: number; y: number };
export type FaceBox = { x: number; y: number; w: number; h: number };

export const SAMPLE_LABELS: Record<SamplePoint["id"], string> = {
  forehead: "Forehead",
  "left-cheek": "Cheek",
  "right-cheek": "Cheek",
  jaw: "Jawline",
};

/** Classic YCbCr skin classifier, widened so it works on very fair and very deep skin. */
export function isSkinRgb(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  if (y < 25 || y > 250) return false;
  return cr >= 133 && cr <= 180 && cb >= 72 && cb <= 130 && r > b && r >= g * 0.95;
}

/** Find the most likely face region: the largest skin blob near the centre of the frame. */
export function findFaceBox(px: Pixels): FaceBox {
  const { data, width, height } = px;
  const cell = Math.max(2, Math.round(Math.max(width, height) / 120));
  const gw = Math.ceil(width / cell);
  const gh = Math.ceil(height / cell);
  const grid = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let skin = 0;
      let total = 0;
      for (let y = gy * cell; y < Math.min(height, (gy + 1) * cell); y += 2) {
        for (let x = gx * cell; x < Math.min(width, (gx + 1) * cell); x += 2) {
          const i = (y * width + x) * 4;
          total++;
          if (isSkinRgb(data[i], data[i + 1], data[i + 2])) skin++;
        }
      }
      grid[gy * gw + gx] = skin / Math.max(1, total) > 0.5 ? 1 : 0;
    }
  }

  // connected components, scored by size and closeness to the centre
  const label = new Int32Array(gw * gh).fill(-1);
  let best: { id: number; score: number; minX: number; minY: number; maxX: number; maxY: number } | null = null;
  for (let start = 0; start < grid.length; start++) {
    if (!grid[start] || label[start] !== -1) continue;
    const stack = [start];
    label[start] = start;
    let count = 0;
    let sx = 0;
    let sy = 0;
    let minX = gw;
    let minY = gh;
    let maxX = 0;
    let maxY = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % gw;
      const y = (p / gw) | 0;
      count++;
      sx += x;
      sy += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const q = ny * gw + nx;
        if (grid[q] && label[q] === -1) {
          label[q] = start;
          stack.push(q);
        }
      }
    }
    const cx = sx / count / gw - 0.5;
    const cy = sy / count / gh - 0.45;
    const score = count * (1 - Math.min(0.9, Math.hypot(cx, cy) * 1.4));
    if (!best || score > best.score) best = { id: start, score, minX, minY, maxX, maxY };
  }

  if (!best || (best.maxX - best.minX + 1) * (best.maxY - best.minY + 1) < gw * gh * 0.02) {
    // no convincing skin region — assume a centred selfie
    return { x: width * 0.25, y: height * 0.15, w: width * 0.5, h: height * 0.62 };
  }
  // Necks, chests and shoulders usually join the face in one skin region, which would drag
  // the box (and every sample point) down onto the neck. Walk down row by row from the
  // hairline and stop at the chin: where the skin narrows into the neck, or once the face
  // is ~1.3× as tall as it is wide (typical facial proportions), whichever comes first.
  const rows: { min: number; max: number; n: number }[] = [];
  for (let gy = best.minY; gy <= best.maxY; gy++) {
    let min = gw;
    let max = -1;
    for (let gx = best.minX; gx <= best.maxX; gx++) {
      if (label[gy * gw + gx] !== best.id) continue;
      min = Math.min(min, gx);
      max = Math.max(max, gx);
    }
    rows.push({ min, max, n: max >= min ? max - min + 1 : 0 });
  }
  const smooth = rows.map((_, i) => {
    const win = rows.slice(Math.max(0, i - 1), i + 2);
    return win.reduce((t, r) => t + r.n, 0) / win.length;
  });
  let widest = 0;
  let bottom = rows.length - 1;
  for (let i = 0; i < rows.length; i++) {
    widest = Math.max(widest, smooth[i]);
    const narrowing = i > 3 && smooth[i] < widest * 0.7;
    const tallEnough = i > widest * 1.3;
    if (narrowing || tallEnough) {
      bottom = i;
      break;
    }
  }
  let minX = gw;
  let maxX = 0;
  for (let i = 0; i <= bottom; i++) {
    if (!rows[i].n) continue;
    minX = Math.min(minX, rows[i].min);
    maxX = Math.max(maxX, rows[i].max);
  }
  const x = minX * cell;
  const y = best.minY * cell;
  const w = Math.min(width - x, (maxX - minX + 1) * cell);
  const h = Math.min(height - y, (bottom + 1) * cell, w * 1.5);
  return { x, y, w, h };
}

export function defaultSamplePoints(box: FaceBox, px: Pixels): SamplePoint[] {
  const rel = (fx: number, fy: number) => ({
    x: (box.x + box.w * fx) / px.width,
    y: (box.y + box.h * fy) / px.height,
  });
  return [
    { id: "forehead", ...rel(0.5, 0.2) },
    { id: "left-cheek", ...rel(0.3, 0.58) },
    { id: "right-cheek", ...rel(0.7, 0.58) },
    { id: "jaw", ...rel(0.36, 0.8) },
  ];
}

const median = (v: number[]) => {
  if (!v.length) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const std = (v: number[]) => {
  if (v.length < 2) return 0;
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length);
};

/** Robust colour of a circular patch: drops highlights and shadows, then takes the median. */
export function samplePatch(px: Pixels, point: { x: number; y: number }, radius: number) {
  const cx = point.x * px.width;
  const cy = point.y * px.height;
  const labs: Lab[] = [];
  let skinCount = 0;
  let total = 0;
  for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(px.height, cy + radius); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(px.width, cx + radius); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue;
      const i = (y * px.width + x) * 4;
      const r = px.data[i];
      const g = px.data[i + 1];
      const b = px.data[i + 2];
      total++;
      if (!isSkinRgb(r, g, b)) continue;
      skinCount++;
      labs.push(rgbToLab(r, g, b));
    }
  }
  if (labs.length < 5) return null;
  labs.sort((p, q) => p.L - q.L);
  const kept = labs.slice(Math.floor(labs.length * 0.15), Math.ceil(labs.length * 0.9));
  return {
    lab: { L: median(kept.map((l) => l.L)), a: median(kept.map((l) => l.a)), b: median(kept.map((l) => l.b)) },
    skinShare: skinCount / Math.max(1, total),
    spread: std(kept.map((l) => l.L)),
  };
}

const SKIN_HUE_OFFSET = 3.5;

const WEIGHTS: Record<SamplePoint["id"], number> = {
  forehead: 0.8,
  "left-cheek": 1,
  "right-cheek": 1,
  jaw: 1.2,
};

export function analyzeSkin(px: Pixels, points: SamplePoint[], box: FaceBox): PhotoAnalysis {
  const radius = Math.max(4, box.w * 0.055);
  const warnings: string[] = [];
  const patches = points
    .map((p) => ({ p, s: samplePatch(px, p, radius) }))
    .filter((x): x is { p: SamplePoint; s: NonNullable<ReturnType<typeof samplePatch>> } => !!x.s);

  let lab: Lab;
  if (patches.length) {
    const tw = patches.reduce((s, x) => s + WEIGHTS[x.p.id] * x.s.skinShare, 0) || 1;
    lab = {
      L: patches.reduce((s, x) => s + x.s.lab.L * WEIGHTS[x.p.id] * x.s.skinShare, 0) / tw,
      a: patches.reduce((s, x) => s + x.s.lab.a * WEIGHTS[x.p.id] * x.s.skinShare, 0) / tw,
      b: patches.reduce((s, x) => s + x.s.lab.b * WEIGHTS[x.p.id] * x.s.skinShare, 0) / tw,
    };
  } else {
    warnings.push("We couldn't find bare skin under the sample dots — try moving them onto your cheeks.");
    lab = { L: 62, a: 13, b: 22 };
  }

  // ---- lighting / photo quality ----
  let quality = patches.length >= 3 ? 1 : patches.length ? 0.6 : 0.2;
  const faceStats = collectFaceStats(px, box);
  if (faceStats.clipped > 0.06) {
    quality *= 0.7;
    warnings.push("Parts of your face are overexposed (blown-out highlights). Softer, indirect daylight helps.");
  }
  if (faceStats.meanLuma < 60) {
    quality *= 0.7;
    warnings.push("The photo is quite dark — face a window for brighter, even light.");
  }
  const left = patches.find((x) => x.p.id === "left-cheek")?.s.lab.L;
  const right = patches.find((x) => x.p.id === "right-cheek")?.s.lab.L;
  if (left !== undefined && right !== undefined && Math.abs(left - right) > 8) {
    quality *= 0.75;
    warnings.push("One side of your face is noticeably brighter. Face the light source straight on.");
  }
  if (faceStats.cast > 0.35) {
    quality *= 0.8;
    warnings.push("The lighting has a strong colour cast (warm bulbs or screens). Natural daylight is most accurate.");
  }
  // Sample spots far apart in lightness mean shine on some and shadow on others. The
  // average is then a guess, so say so and trust the photo less (deeper skin shows
  // shine and shadow especially strongly in uneven light).
  const patchLs = patches.map((x) => x.s.lab.L);
  const lightSpread = patchLs.length > 1 ? Math.max(...patchLs) - Math.min(...patchLs) : 0;
  if (lightSpread > 18) {
    quality *= lightSpread > 30 ? 0.55 : 0.75;
    warnings.push(
      "The light on your face is very uneven — some spots are in shine, others in shadow — so this colour reading is a rough guess. Pick your shade from the scale below, or retake facing a window.",
    );
  }
  const lowSkin = patches.filter((x) => x.s.skinShare < 0.5).length;
  if (lowSkin) {
    quality *= 0.85;
    warnings.push("Some sample dots are partly on hair, brows or background — drag them onto bare skin.");
  }
  quality = Math.max(0.2, Math.min(1, quality));

  // Live skin photographs redder than foundation swatches, which is what the axis
  // was calibrated on — shift the neutral point down a few degrees.
  const axis = undertoneAxisFromLab(lab, SKIN_HUE_OFFSET);
  const olive = isOliveLike(lab);

  return {
    analyzedAt: new Date().toISOString(),
    hex: labToHex(lab),
    lab,
    ita: ita(lab),
    depth: depthFromLab(lab),
    undertone: undertoneFromAxis(axis, olive),
    undertoneAxis: axis,
    quality,
    warnings,
    ...detectConcerns(px, box, lab, points, radius),
  };
}

function collectFaceStats(px: Pixels, box: FaceBox) {
  let clipped = 0;
  let n = 0;
  let luma = 0;
  let rs = 0;
  let bs = 0;
  for (let y = Math.floor(box.y); y < box.y + box.h; y += 3) {
    for (let x = Math.floor(box.x); x < box.x + box.w; x += 3) {
      const i = (y * px.width + x) * 4;
      const r = px.data[i];
      const g = px.data[i + 1];
      const b = px.data[i + 2];
      n++;
      luma += 0.299 * r + 0.587 * g + 0.114 * b;
      if (r > 250 && g > 250) clipped++;
    }
  }
  // colour cast from the whole frame (grey-world estimate)
  let m = 0;
  for (let i = 0; i < px.data.length; i += 4 * 7) {
    rs += px.data[i];
    bs += px.data[i + 2];
    m++;
  }
  const rMean = rs / Math.max(1, m);
  const bMean = bs / Math.max(1, m);
  return {
    clipped: clipped / Math.max(1, n),
    meanLuma: luma / Math.max(1, n),
    cast: Math.abs(rMean - bMean) / Math.max(1, (rMean + bMean) / 2),
  };
}

function detectConcerns(
  px: Pixels,
  box: FaceBox,
  skin: Lab,
  points: SamplePoint[],
  radius: number,
): { concerns: DetectedConcern[]; metrics?: SkinMetrics } {
  // gather skin pixels inside the central face area (skip the hairline and chin edges)
  const x0 = Math.floor(box.x + box.w * 0.12);
  const x1 = Math.floor(box.x + box.w * 0.88);
  const y0 = Math.floor(box.y + box.h * 0.1);
  const y1 = Math.floor(box.y + box.h * 0.92);
  const step = Math.max(1, Math.round(box.w / 220));
  const as: number[] = [];
  const Ls: number[] = [];
  let specular = 0;
  let considered = 0;
  const blocks = new Map<number, { sum: number; n: number }>();
  const bsize = Math.max(4, Math.round(box.w / 10));

  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const i = (y * px.width + x) * 4;
      const r = px.data[i];
      const g = px.data[i + 1];
      const b = px.data[i + 2];
      const lab = rgbToLab(r, g, b);
      const skinLike = isSkinRgb(r, g, b);
      // shiny highlights are bright and desaturated, so they often fail the skin test
      const highlight = lab.L > skin.L + 16 && chroma(lab) < chroma(skin) * 0.7 && lab.L > 70;
      if (!skinLike && !highlight) continue;
      considered++;
      if (highlight) {
        specular++;
        continue;
      }
      as.push(lab.a);
      Ls.push(lab.L);
      const key = Math.floor((y - y0) / bsize) * 1000 + Math.floor((x - x0) / bsize);
      const blk = blocks.get(key) ?? { sum: 0, n: 0 };
      blk.sum += lab.L;
      blk.n++;
      blocks.set(key, blk);
    }
  }
  if (as.length < 200) return { concerns: [] };

  const out: DetectedConcern[] = [];
  const medA = median(as);

  // Redness: share of noticeably redder-than-baseline pixels, plus overall redness
  const red = as.filter((a) => a > medA + 7).length / as.length;
  const redScore = clamp01(red * 3.5 + Math.max(0, skin.a - 16) / 10);
  if (redScore >= 0.3)
    out.push({
      key: "redness",
      score: redScore,
      confidence: "medium",
      note: "Some areas read redder than your baseline skin tone (can be flushing, irritation or active breakouts).",
    });

  // Shine: specular highlights within the face
  const shine = specular / Math.max(1, considered);
  const shineScore = clamp01((shine - 0.015) * 14);
  if (shineScore >= 0.3)
    out.push({
      key: "oiliness",
      score: shineScore,
      confidence: "low",
      note: "We see shiny highlights on the skin. That can mean oiliness — or just a bright light source.",
    });

  // Uneven tone: variation between neighbourhood averages (lighting adds some of this)
  const blockMeans = [...blocks.values()].filter((b) => b.n > 6).map((b) => b.sum / b.n);
  const uneven = std(blockMeans);
  const unevenScore = clamp01((uneven - 5) / 7);
  if (unevenScore >= 0.3)
    out.push({
      key: "uneven-tone",
      score: unevenScore,
      confidence: "low",
      note: "Tone varies across your face. Shadows play a part, so treat this as a hint.",
    });

  // Texture: fine-scale contrast within the cheek patches
  const k = Math.max(1, Math.round(box.w / 300));
  let lap = 0;
  let ln = 0;
  for (const p of points.filter((p) => p.id.includes("cheek"))) {
    const cx = Math.round(p.x * px.width);
    const cy = Math.round(p.y * px.height);
    const r = Math.round(radius);
    for (let y = cy - r + k; y < cy + r - k; y += k) {
      for (let x = cx - r + k; x < cx + r - k; x += k) {
        if (x - k < 0 || y - k < 0 || x + k >= px.width || y + k >= px.height) continue;
        const L = (xx: number, yy: number) => {
          const i = (yy * px.width + xx) * 4;
          return 0.299 * px.data[i] + 0.587 * px.data[i + 1] + 0.114 * px.data[i + 2];
        };
        lap += Math.abs(4 * L(x, y) - L(x - k, y) - L(x + k, y) - L(x, y - k) - L(x, y + k));
        ln++;
      }
    }
  }
  const texture = ln ? lap / ln : 0;
  const textureScore = clamp01((texture - 6) / 10);
  if (textureScore >= 0.35)
    out.push({
      key: "texture",
      score: textureScore,
      confidence: "low",
      note: "Fine detail on the cheeks suggests visible pores or texture. Photo sharpness affects this a lot.",
    });

  // Dark spots: small pockets noticeably darker than their surroundings
  // (the overall median stands in for a local mean; requiring skin-like redness filters
  // out most large shadows)
  const medL = median(Ls);
  let spots = 0;
  for (let i = 0; i < Ls.length; i++) {
    if (Ls[i] < medL - 12 && as[i] > medA - 2) spots++;
  }
  const spotScore = clamp01((spots / Ls.length - 0.04) * 6);
  if (spotScore >= 0.3)
    out.push({
      key: "hyperpigmentation",
      score: spotScore,
      confidence: "low",
      note: "There are some darker patches. These could be hyperpigmentation or simply shadows.",
    });

  return {
    concerns: out.sort((a, b) => b.score - a.score),
    metrics: {
      redness: redScore,
      oiliness: shineScore,
      "uneven-tone": unevenScore,
      texture: textureScore,
      hyperpigmentation: spotScore,
    },
  };
}

/** Downscale an image element into pixel data the analyser can use. */
export function imageToPixels(img: HTMLImageElement | ImageBitmap, maxSide = 900): Pixels {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return { data, width: w, height: h };
}
