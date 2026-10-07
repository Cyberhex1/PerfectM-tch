/**
 * The "gets better over time" part. Every signal we have — the photo, quiz answers,
 * and especially products the person has actually worn — is combined into one
 * skin model. Real-world feedback outweighs the photo, so the more someone logs,
 * the less the starting estimate matters.
 */
import {
  DEPTH_REFERENCE,
  depthFromLab,
  isOliveLike,
  labToHex,
  mixLab,
  shiftLab,
  undertoneFromAxis,
} from "./color";
import { resolveShade, UNDERTONE_AXIS, type FoundationDb } from "./foundations";
import type { Depth, Lab, Profile, Reaction, Undertone } from "./types";

export type Evidence = { label: string; detail?: string; weight: number; hex?: string };

export type SkinModel = {
  target: Lab;
  hex: string;
  depth: Depth;
  undertone: Undertone;
  undertoneAxis: number;
  olive: boolean;
  /** 0–1 */
  confidence: number;
  colorEvidence: Evidence[];
  undertoneEvidence: Evidence[];
};

const SHADE_REACTIONS: Reaction[] = ["too-light", "too-dark", "too-pink", "too-yellow", "oxidized"];

/** Where the true skin colour probably is, given how a worn shade looked. */
function correctedAnchor(lab: Lab, reactions: Reaction[]): Lab {
  let out = lab;
  if (reactions.includes("too-light")) out = shiftLab(out, -6);
  if (reactions.includes("too-dark")) out = shiftLab(out, 6);
  if (reactions.includes("too-pink")) out = shiftLab(out, 0, -3, 3);
  if (reactions.includes("too-yellow")) out = shiftLab(out, 0, 2, -3);
  if (reactions.includes("oxidized")) out = shiftLab(out, 3, -1, -2);
  return out;
}

export function buildSkinModel(profile: Profile, db?: FoundationDb | null): SkinModel {
  const colorAnchors: { lab: Lab; w: number }[] = [];
  const colorEvidence: Evidence[] = [];
  const axisVotes: { v: number; w: number }[] = [];
  const undertoneEvidence: Evidence[] = [];
  let oliveVotes = 0;
  let oliveWeight = 0;
  const q = profile.quiz;

  if (profile.photo) {
    const w = profile.photo.quality;
    colorAnchors.push({ lab: profile.photo.lab, w });
    colorEvidence.push({ label: "Your photo", detail: `${Math.round(w * 100)}% lighting quality`, weight: w, hex: profile.photo.hex });
    axisVotes.push({ v: profile.photo.undertoneAxis, w: 0.8 * w });
    undertoneEvidence.push({ label: "Photo colour analysis", detail: profile.photo.undertone, weight: 0.8 * w });
    oliveWeight += 0.6 * w;
    if (isOliveLike(profile.photo.lab)) oliveVotes += 0.6 * w;
  }

  if (q.depthSelf) {
    const w = colorAnchors.length ? 0.3 : 0.6;
    colorAnchors.push({ lab: DEPTH_REFERENCE[q.depthSelf], w });
    colorEvidence.push({ label: "Your depth answer", detail: q.depthSelf, weight: w, hex: labToHex(DEPTH_REFERENCE[q.depthSelf]) });
  }

  if (q.undertoneSelf && q.undertoneSelf !== "unsure") {
    const v = { cool: -1, neutral: 0, warm: 1, olive: 0.35 }[q.undertoneSelf];
    axisVotes.push({ v, w: 1.5 });
    undertoneEvidence.push({ label: "You said", detail: q.undertoneSelf, weight: 1.5 });
    oliveWeight += 1.5;
    if (q.undertoneSelf === "olive") oliveVotes += 1.5;
  }
  if (q.veins && q.veins !== "unsure") {
    const v = { "blue-purple": -0.8, green: 0.8, mix: 0 }[q.veins];
    axisVotes.push({ v, w: 0.6 });
    undertoneEvidence.push({ label: "Vein colour", detail: q.veins.replace("-", "/"), weight: 0.6 });
  }
  if (q.jewelry && q.jewelry !== "unsure") {
    const v = { silver: -0.6, gold: 0.6, both: 0 }[q.jewelry];
    axisVotes.push({ v, w: 0.4 });
    undertoneEvidence.push({ label: "Jewellery that flatters you", detail: q.jewelry, weight: 0.4 });
  }

  if (db) {
    for (const p of profile.products) {
      if (p.category !== "foundation" && p.category !== "concealer") continue;
      const hit = resolveShade(db, p.shadeRef);
      if (!hit) continue;
      const shadeIssues = p.reactions.filter((r) => SHADE_REACTIONS.includes(r));
      const name = `${hit.product.brand} ${hit.product.name} · ${hit.shade.label}`;
      // concealers are often chosen lighter on purpose — trust them less for colour
      const k = p.category === "concealer" ? 0.4 : 1;
      if (p.verdict === "liked" && !shadeIssues.length) {
        colorAnchors.push({ lab: hit.shade.lab, w: 3 * k });
        colorEvidence.push({ label: "Shade you love", detail: name, weight: 3 * k, hex: hit.shade.hex });
      } else if (shadeIssues.length) {
        const lab = correctedAnchor(hit.shade.lab, shadeIssues);
        colorAnchors.push({ lab, w: 1.4 * k });
        colorEvidence.push({ label: `Shade was ${shadeIssues.map((r) => r.replace("-", " ")).join(", ")}`, detail: name, weight: 1.4 * k, hex: labToHex(lab) });
      } else if (p.verdict === "neutral") {
        colorAnchors.push({ lab: hit.shade.lab, w: 1.2 * k });
        colorEvidence.push({ label: "Shade that was okay", detail: name, weight: 1.2 * k, hex: hit.shade.hex });
      }

      if (hit.shade.undertone && p.verdict === "liked" && !shadeIssues.length) {
        axisVotes.push({ v: UNDERTONE_AXIS[hit.shade.undertone], w: 2 });
        undertoneEvidence.push({ label: "Undertone of a shade you love", detail: name, weight: 2 });
        oliveWeight += 2;
        if (hit.shade.undertone === "O") oliveVotes += 2;
      }
      if (shadeIssues.includes("too-pink")) {
        axisVotes.push({ v: 1, w: 1 });
        undertoneEvidence.push({ label: "A shade looked too pink", detail: "you're likely warmer", weight: 1 });
      }
      if (shadeIssues.includes("too-yellow")) {
        axisVotes.push({ v: -1, w: 1 });
        undertoneEvidence.push({ label: "A shade looked too yellow", detail: "you're likely cooler", weight: 1 });
      }
    }
  }

  const target = colorAnchors.length ? mixLab(colorAnchors) : DEPTH_REFERENCE.medium;
  const axisW = axisVotes.reduce((s, v) => s + v.w, 0);
  const undertoneAxis = axisW ? axisVotes.reduce((s, v) => s + v.v * v.w, 0) / axisW : 0;
  const olive = oliveWeight > 0 && oliveVotes / oliveWeight >= 0.45;
  const colorW = colorAnchors.reduce((s, a) => s + a.w, 0);

  return {
    target,
    hex: labToHex(target),
    depth: depthFromLab(target),
    undertone: undertoneFromAxis(undertoneAxis, olive),
    undertoneAxis,
    olive,
    confidence: Math.min(1, colorW / 5) * 0.7 + Math.min(1, axisW / 4) * 0.3,
    colorEvidence: colorEvidence.sort((a, b) => b.weight - a.weight),
    undertoneEvidence: undertoneEvidence.sort((a, b) => b.weight - a.weight),
  };
}

export type Strength = { score: number; label: string; tips: string[] };

/** How well we know this person — drives the "perfect matches come with time" messaging. */
export function profileStrength(profile: Profile): Strength {
  const tips: string[] = [];
  let score = 0;
  if (profile.photo) score += 20 * profile.photo.quality;
  else tips.push("Add a photo in natural light for a colour reading.");
  if (profile.photo && profile.photo.quality < 0.7) tips.push("Retake your photo facing a window — the lighting was tricky.");

  if (profile.onboarding.quiz) score += 20;
  else tips.push("Finish the skin quiz.");

  const foundations = profile.products.filter((p) => p.category === "foundation" && p.shadeRef);
  score += Math.min(30, foundations.length * 15);
  if (foundations.length < 2)
    tips.push(
      foundations.length
        ? "Log one more foundation shade you've worn — each one sharpens your match."
        : "Log a foundation you've worn (and its shade). This is the single best way to improve your match.",
    );

  const logged = profile.products.length;
  score += Math.min(15, logged * 2.5);
  if (logged < 6) tips.push("Keep logging products that worked or didn't — skincare included.");

  const withIngredients = profile.products.filter((p) => p.ingredients).length;
  score += Math.min(15, withIngredients * 3);
  if (withIngredients < 4) tips.push("Add ingredient lists to your logged products so we can spot irritant patterns.");

  score = Math.round(Math.min(100, score));
  const label = score >= 85 ? "Dialled in" : score >= 60 ? "Getting close" : score >= 35 ? "Learning you" : "Just starting";
  return { score, label, tips: tips.slice(0, 3) };
}
