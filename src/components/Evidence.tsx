"use client";

import Link from "next/link";
import { useState } from "react";
import { LEVEL_DEFINITION, LEVEL_LABEL, sourcesFor, type EvidenceLevel, type Source } from "@/lib/evidence";
import { cx } from "./ui";

const TONE: Record<EvidenceLevel, string> = {
  strong: "bg-good-soft text-good",
  moderate: "bg-[#eaf0f6] text-[#3f5f7f]",
  limited: "bg-warn-soft text-warn",
  expert: "bg-ink/5 text-muted",
};

const DOTS: Record<EvidenceLevel, number> = { strong: 3, moderate: 2, limited: 1, expert: 0 };

export function EvidenceBadge({ level, className }: { level: EvidenceLevel; className?: string }) {
  return (
    <span
      title={LEVEL_DEFINITION[level]}
      className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TONE[level], className)}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx("h-1.5 w-1.5 rounded-full", i < DOTS[level] ? "bg-current" : "bg-current opacity-25")} />
        ))}
      </span>
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function Citation({ source }: { source: Source }) {
  return (
    <li className="text-xs leading-relaxed text-muted">
      {source.authors} <span className="text-ink">{source.title}.</span> <em>{source.journal}</em>, {source.year}.{" "}
      <a href={source.url} target="_blank" rel="noreferrer" className="whitespace-nowrap text-accent underline underline-offset-2">
        PubMed {source.pmid}
      </a>
    </li>
  );
}

/** "Sources (2)" toggle that reveals linked citations. */
export function Sources({ ids, className }: { ids: string[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const sources = sourcesFor(ids);
  if (!sources.length) return <span className={cx("text-xs text-faint", className)}>Based on standard dermatology practice</span>;
  return (
    <div className={className}>
      <button type="button" onClick={() => setOpen(!open)} className="text-xs text-muted underline underline-offset-2 hover:text-ink" aria-expanded={open}>
        {open ? "Hide sources" : `Sources (${sources.length})`}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {sources.map((s) => (
            <Citation key={s.id} source={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A grade, a one-paragraph explanation and its sources. */
export function EvidenceNote({ level, text, sources, className }: { level: EvidenceLevel; text: string; sources: string[]; className?: string }) {
  return (
    <div className={cx("rounded-xl bg-canvas px-3.5 py-3", className)}>
      <EvidenceBadge level={level} />
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{text}</p>
      <Sources ids={sources} className="mt-1.5" />
    </div>
  );
}

export function ScienceLink({ className }: { className?: string }) {
  return (
    <Link href="/science" className={cx("text-sm underline underline-offset-4", className)}>
      How we grade the evidence
    </Link>
  );
}
