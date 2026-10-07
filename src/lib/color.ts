import type { Depth, Lab, Undertone } from "./types";

const srgbToLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

const XN = 0.95047;
const ZN = 1.08883;
const EPS = 216 / 24389;
const KAPPA = 24389 / 27;

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r / 255);
  const G = srgbToLinear(g / 255);
  const B = srgbToLinear(b / 255);
  const f = (t: number) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
  const fx = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / XN);
  const fy = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const fz = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / ZN);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToRgb({ L, a, b }: Lab): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number) => (t ** 3 > EPS ? t ** 3 : (116 * t - 16) / KAPPA);
  const X = inv(fx) * XN;
  const Y = L > KAPPA * EPS ? fy ** 3 : L / KAPPA;
  const Z = inv(fz) * ZN;
  const R = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  const G = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  const B = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  return [R, G, B].map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255)) as [
    number,
    number,
    number,
  ];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export const hexToLab = (hex: string) => rgbToLab(...hexToRgb(hex));
export const labToHex = (lab: Lab) => rgbToHex(...labToRgb(lab));

const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

export const chroma = (lab: Lab) => Math.hypot(lab.a, lab.b);
/** hue angle in degrees, 0 = red, 90 = yellow */
export const hueAngle = (lab: Lab) => {
  const h = deg(Math.atan2(lab.b, lab.a));
  return h < 0 ? h + 360 : h;
};

/** CIEDE2000 colour difference. ~1 is barely perceptible, >5 clearly different. */
export function deltaE2000(x: Lab, y: Lab): number {
  const C1 = Math.hypot(x.a, x.b);
  const C2 = Math.hypot(y.a, y.b);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = (1 + G) * x.a;
  const a2 = (1 + G) * y.a;
  const C1p = Math.hypot(a1, x.b);
  const C2p = Math.hypot(a2, y.b);
  const h = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const v = deg(Math.atan2(b, a));
    return v < 0 ? v + 360 : v;
  };
  const h1 = h(x.b, a1);
  const h2 = h(y.b, a2);
  const dL = y.L - x.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2));
  const Lm = (x.L + y.L) / 2;
  const Cmp = (C1p + C2p) / 2;
  let hm = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) <= 180) hm = (h1 + h2) / 2;
    else hm = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos(rad(hm - 30)) +
    0.24 * Math.cos(rad(2 * hm)) +
    0.32 * Math.cos(rad(3 * hm + 6)) -
    0.2 * Math.cos(rad(4 * hm - 63));
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * Cmp;
  const Sh = 1 + 0.015 * Cmp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt(
    (dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh),
  );
}

/** Individual Typology Angle (Chardon et al.) */
export const ita = (lab: Lab) => deg(Math.atan2(lab.L - 50, lab.b));

export function depthFromLab(lab: Lab): Depth {
  // Bands tuned to foundation shade ranges rather than the clinical ITA classes,
  // which lump most medium-to-deep skin together.
  const L = lab.L;
  if (L >= 80) return "fair";
  if (L >= 73) return "light";
  if (L >= 66) return "light-medium";
  if (L >= 58) return "medium";
  if (L >= 49) return "tan";
  if (L >= 38) return "deep";
  return "rich";
}

export const DEPTH_ORDER: Depth[] = ["fair", "light", "light-medium", "medium", "tan", "deep", "rich"];

/** Typical skin colours for each depth — used when there's no photo yet. */
export const DEPTH_REFERENCE: Record<Depth, Lab> = {
  fair: { L: 83, a: 9, b: 15 },
  light: { L: 76, a: 11, b: 18 },
  "light-medium": { L: 69, a: 12, b: 21 },
  medium: { L: 62, a: 13, b: 23 },
  tan: { L: 53, a: 14, b: 24 },
  deep: { L: 43, a: 13, b: 21 },
  rich: { L: 33, a: 11, b: 16 },
};

/**
 * Undertone axis from a skin colour: -1 = cool (pink/red), +1 = warm (yellow/golden).
 * Skin hue angles mostly sit between ~40° (rosy) and ~70° (golden).
 */
export function undertoneAxisFromLab(lab: Lab, hueOffset = 0): number {
  // Calibrated on ~5,700 foundation swatches labelled cool/neutral/warm: the neutral
  // hue angle drops from ~66° on light skin to ~51° on deep skin, and cool/warm sit
  // roughly ±4° either side of it.
  // hueOffset lets callers correct for live skin, which reads a few degrees redder
  // than foundation swatches do.
  const neutralHue = 51 + 0.33 * (lab.L - 38) - hueOffset;
  return Math.max(-1, Math.min(1, (hueAngle(lab) - neutralHue) / 4.5));
}

export function isOliveLike(lab: Lab): boolean {
  // olive skin photographs as yellow-dominant but muted, with little redness relative
  // to yellow. This is a weak signal — the quiz answer counts for more.
  return lab.b > 0 && lab.a / lab.b < 0.42 && chroma(lab) < 22 && lab.L < 75;
}

export function undertoneFromAxis(axis: number, olive = false): Undertone {
  if (olive) return "olive";
  if (axis <= -0.3) return "cool";
  if (axis >= 0.3) return "warm";
  return "neutral";
}

export function mixLab(items: { lab: Lab; w: number }[]): Lab {
  const total = items.reduce((s, i) => s + i.w, 0) || 1;
  return {
    L: items.reduce((s, i) => s + i.lab.L * i.w, 0) / total,
    a: items.reduce((s, i) => s + i.lab.a * i.w, 0) / total,
    b: items.reduce((s, i) => s + i.lab.b * i.w, 0) / total,
  };
}

/** Lighten/darken + warm/cool a colour in Lab space (for derived makeup swatches). */
export function shiftLab(lab: Lab, dL: number, da = 0, db = 0): Lab {
  return { L: Math.max(0, Math.min(100, lab.L + dL)), a: lab.a + da, b: lab.b + db };
}
