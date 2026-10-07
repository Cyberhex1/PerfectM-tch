"use client";

import { useEffect, useRef, useState } from "react";
import {
  analyzeSkin,
  defaultSamplePoints,
  findFaceBox,
  SAMPLE_LABELS,
  type FaceBox,
  type Pixels,
  type SamplePoint,
} from "@/lib/skinAnalysis";
import type { PhotoAnalysis } from "@/lib/types";
import { Badge, Button, Card, cx, Meter, Notice, Spinner, Swatch } from "./ui";

const CONCERN_LABEL: Record<string, string> = {
  acne: "Breakouts",
  redness: "Redness",
  hyperpigmentation: "Dark spots",
  "uneven-tone": "Uneven tone",
  dryness: "Dryness",
  oiliness: "Shine / oiliness",
  texture: "Texture / pores",
  "fine-lines": "Fine lines",
  "dark-circles": "Dark circles",
  dullness: "Dullness",
  rosacea: "Rosacea",
  eczema: "Eczema",
};
export const concernLabel = (k: string) => CONCERN_LABEL[k] ?? k;

type Loaded = { url: string; pixels: Pixels; box: FaceBox; aiImage: string };

async function decode(file: File): Promise<Loaded> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Some browsers can't decode HEIC — fall back to an <img>, which may also fail
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("unsupported"));
      img.src = URL.createObjectURL(file);
    });
  }
  const draw = (maxSide: number) => {
    const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return { canvas, ctx };
  };
  const { canvas, ctx } = draw(900);
  const pixels: Pixels = { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
  const url = canvas.toDataURL("image/jpeg", 0.9);
  const aiImage = draw(768).canvas.toDataURL("image/jpeg", 0.85);
  return { url, pixels, box: findFaceBox(pixels), aiImage };
}

export function PhotoAnalyzer({
  initial,
  onChange,
}: {
  initial?: PhotoAnalysis;
  onChange: (a: PhotoAnalysis | undefined) => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [points, setPoints] = useState<SamplePoint[]>([]);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | undefined>(initial);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<{ available: boolean; model?: string } | null>(null);
  const [aiState, setAiState] = useState<{ busy?: boolean; error?: string; hint?: string }>({});
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef<SamplePoint["id"] | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setAi({ available: !!s.ai, model: s.model ?? undefined }))
      .catch(() => setAi({ available: false }));
  }, []);

  const run = (l: Loaded, pts: SamplePoint[], keepAi?: PhotoAnalysis["ai"]) => {
    const a = analyzeSkin(l.pixels, pts, l.box);
    if (keepAi) a.ai = keepAi;
    setAnalysis(a);
    onChangeRef.current(a);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    setAiState({});
    try {
      const l = await decode(file);
      const pts = defaultSamplePoints(l.box, l.pixels);
      setLoaded(l);
      setPoints(pts);
      run(l, pts);
    } catch {
      setError("We couldn't open that image. Try a JPG or PNG (iPhone: Settings → Camera → Formats → Most Compatible).");
    } finally {
      setBusy(false);
    }
  };

  const moveTo = (e: React.PointerEvent) => {
    if (!dragging.current || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width));
    const y = Math.max(0.02, Math.min(0.98, (e.clientY - r.top) / r.height));
    setPoints((pts) => pts.map((p) => (p.id === dragging.current ? { ...p, x, y } : p)));
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = null;
    if (loaded) run(loaded, points, analysis?.ai);
  };

  const askAi = async () => {
    if (!loaded || !analysis) return;
    setAiState({ busy: true });
    try {
      const res = await fetch("/api/analyze-skin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: loaded.aiImage }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiState({ error: json.error ?? "AI analysis failed.", hint: json.hint });
        return;
      }
      const next = { ...analysis, ai: { model: json.model, summary: json.summary, concerns: json.concerns } };
      setAnalysis(next);
      onChangeRef.current(next);
      setAiState({});
    } catch {
      setAiState({ error: "Couldn't reach the server." });
    }
  };

  const clear = () => {
    setLoaded(null);
    setPoints([]);
    setAnalysis(undefined);
    onChangeRef.current(undefined);
  };

  return (
    <div className="space-y-5">
      {!loaded && (
        <label
          className={cx(
            "flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-ink/25 bg-surface px-6 py-14 text-center transition hover:border-ink/60",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
            {busy ? <Spinner /> : <CameraIcon />}
          </span>
          <span className="mt-4 font-medium">{initial ? "Take a new photo" : "Take or upload a selfie"}</span>
          <span className="mt-1 text-sm text-muted">Analyzed on your device — never uploaded or stored.</span>
        </label>
      )}

      {error && <Notice tone="bad">{error}</Notice>}

      {loaded && (
        <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <div
              ref={frame}
              className="relative touch-none select-none overflow-hidden rounded-[var(--radius-card)] bg-line"
              onPointerMove={moveTo}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img src={loaded.url} alt="Your photo" className="block w-full" draggable={false} />
              {points.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Move ${SAMPLE_LABELS[p.id]} sample point`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    dragging.current = p.id;
                  }}
                  className="absolute -ml-4 -mt-4 grid h-8 w-8 cursor-grab place-items-center rounded-full border-2 border-white bg-black/20 shadow-lg active:cursor-grabbing"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Drag the dots onto bare skin — cheeks, forehead and jawline — away from hair, brows, shadows and shine.
            </p>
            <button type="button" onClick={clear} className="mt-1 text-xs font-medium text-ink underline underline-offset-4">
              Use a different photo
            </button>
          </div>

          {analysis && <AnalysisSummary analysis={analysis} />}
        </div>
      )}

      {!loaded && initial && <AnalysisSummary analysis={initial} />}

      {loaded && analysis && ai?.available && (
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">Want a second opinion from AI?</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Google Gemini can describe what it sees (breakouts, dryness, fine lines…) more richly than on-device
                analysis. This sends a small copy of your photo to Google for this one request. On Gemini&apos;s free
                tier, Google may use submitted content to improve its services. We don&apos;t store your photo.
              </p>
            </div>
          </div>
          {analysis.ai ? (
            <div className="rounded-xl bg-canvas p-4 text-sm">
              <p className="leading-relaxed">{analysis.ai.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {analysis.ai.concerns.map((c) => (
                  <Badge key={c.key} tone="accent">
                    {concernLabel(c.key)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={askAi} disabled={aiState.busy}>
              {aiState.busy && <Spinner />} Analyze with AI
            </Button>
          )}
          {aiState.error && (
            <Notice tone="warn">
              {aiState.error} {aiState.hint && <span className="block text-xs text-muted">{aiState.hint}</span>}
              <span className="block text-xs text-muted">Your on-device results are still saved.</span>
            </Notice>
          )}
        </Card>
      )}
    </div>
  );
}

export function AnalysisSummary({ analysis }: { analysis: PhotoAnalysis }) {
  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-4">
        <Swatch hex={analysis.hex} size={64} />
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Your skin reads as</p>
          <p className="mt-1 font-display text-2xl capitalize">
            {analysis.depth.replace("-", " ")}, {analysis.undertone}
          </p>
        </div>
      </Card>
      <div>
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Lighting quality</span>
          <span>{Math.round(analysis.quality * 100)}%</span>
        </div>
        <Meter value={analysis.quality * 100} />
      </div>
      {analysis.warnings.length > 0 && (
        <Notice tone="warn">
          <ul className="space-y-1">
            {analysis.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      )}
      <div>
        <p className="mb-2 text-sm font-medium">What we noticed</p>
        {analysis.concerns.length ? (
          <ul className="space-y-2">
            {analysis.concerns.map((c) => (
              <li key={c.key} className="text-sm">
                <span className="font-medium">{concernLabel(c.key)}</span>{" "}
                <Badge tone={c.confidence === "low" ? "neutral" : "accent"}>{c.confidence} confidence</Badge>
                <p className="mt-0.5 text-muted">{c.note}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing stood out from the photo. The quiz will fill in the rest.</p>
        )}
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}
