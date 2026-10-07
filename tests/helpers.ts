import { readFileSync } from "node:fs";
import { buildDb } from "@/lib/foundations";
import { emptyProfile, type Profile } from "@/lib/types";

export const db = buildDb(JSON.parse(readFileSync(new URL("../public/data/foundations.json", import.meta.url), "utf8")));

export const profileWith = (patch: Partial<Profile> = {}, quiz: Partial<Profile["quiz"]> = {}): Profile => {
  const p = emptyProfile();
  return { ...p, ...patch, quiz: { ...p.quiz, ...quiz } };
};
