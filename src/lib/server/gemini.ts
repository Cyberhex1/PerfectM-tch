import "server-only";

/**
 * Google Gemini (free tier) — optional AI skin read.
 *
 * This wrapper exists because of the usual ways Google AI integrations break:
 *  1. Calling the API from the browser → the key leaks and requests hit CORS. We only
 *     call it from the server (Route Handler), so the key never reaches the client.
 *  2. Sending a data URL ("data:image/jpeg;base64,...") as inline data → 400 error.
 *     We strip the prefix.
 *  3. Hard-coding a model name that later gets retired → 404. We try the configured
 *     model first and fall back through a list.
 *  4. Free-tier rate limits (429) and region restrictions → we return a clear error
 *     and the app quietly falls back to on-device analysis.
 *  5. Model replies wrapped in ```json fences → we ask for JSON mode *and* strip fences.
 */
import type { ConcernKey, DetectedConcern } from "../types";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.0-flash"];
const CONCERNS: ConcernKey[] = [
  "acne",
  "redness",
  "hyperpigmentation",
  "uneven-tone",
  "dryness",
  "oiliness",
  "texture",
  "fine-lines",
  "dark-circles",
  "dullness",
];

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    public hint?: string,
  ) {
    super(message);
  }
}

export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();

export function geminiModels() {
  const preferred = process.env.GEMINI_MODEL?.trim();
  return [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean) as string[])];
}

const PROMPT = `You are assisting a cosmetics-matching app (not a medical service).
Look at this face photo and describe only what is visible on the skin.
Return JSON with:
- "summary": one or two friendly sentences about the skin's visible characteristics.
- "concerns": array of up to 6 items, each { "key": one of ${CONCERNS.join(", ")}, "score": 0-1 how pronounced, "note": short plain-language observation }.
- "lighting": "good" | "fair" | "poor" for how suitable the lighting is for judging skin colour.
Do not diagnose medical conditions, guess age, ethnicity or identity, or comment on attractiveness.
If no face is visible, return an empty concerns array and say so in summary.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    lighting: { type: "STRING", enum: ["good", "fair", "poor"] },
    concerns: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING", enum: CONCERNS },
          score: { type: "NUMBER" },
          note: { type: "STRING" },
        },
        required: ["key", "score", "note"],
      },
    },
  },
  required: ["summary", "concerns"],
};

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string; status: string };
};

function explain(status: number, body: GeminiResponse): GeminiError {
  const msg = body.error?.message ?? `Gemini request failed (${status})`;
  if (status === 400 && /api key not valid|API_KEY_INVALID/i.test(msg))
    return new GeminiError("The Gemini API key is invalid.", 401, "Create a new key at https://aistudio.google.com/apikey and set GEMINI_API_KEY.");
  if (status === 400 && /location is not supported|FAILED_PRECONDITION/i.test(msg))
    return new GeminiError("Gemini's free tier isn't available in this server's region.", 503, "Deploy to a supported region or enable billing on the Google Cloud project.");
  if (status === 403)
    return new GeminiError("This key isn't allowed to call the Gemini API.", 403, "Make sure the key was made in Google AI Studio (or the Generative Language API is enabled for its project) and has no HTTP-referrer restriction — server calls send no referrer.");
  if (status === 429)
    return new GeminiError("The free Gemini quota is used up for now.", 429, "Free-tier limits reset every minute/day. On-device analysis still works.");
  return new GeminiError(msg, status >= 500 ? 502 : status);
}

const stripFences = (t: string) => t.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

export async function analyzeSkinWithGemini(image: string, mimeType = "image/jpeg") {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new GeminiError("AI analysis isn't set up on this server.", 501, "Add GEMINI_API_KEY to your environment.");

  // the #1 cause of "invalid argument" errors: sending the data URL prefix
  const match = image.match(/^data:([^;]+);base64,([\s\S]*)$/);
  const data = (match ? match[2] : image).replace(/\s/g, "");
  const mime = match ? match[1] : mimeType;
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mime)) throw new GeminiError("Unsupported image type.", 400);
  if (data.length > 6_000_000) throw new GeminiError("Image too large — please use a smaller photo.", 413);

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data } }, { text: PROMPT }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: SCHEMA },
  });

  let lastError: GeminiError | null = null;
  for (const model of geminiModels()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body,
          signal: AbortSignal.timeout(30_000),
        });
      } catch {
        lastError = new GeminiError("Couldn't reach Gemini (network timeout).", 504);
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as GeminiResponse;
      if (res.status === 404) {
        lastError = new GeminiError(`Model "${model}" isn't available.`, 502, "Set GEMINI_MODEL to a current model id.");
        break; // try the next model
      }
      if (res.status >= 500 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      if (!res.ok) throw explain(res.status, json);

      if (json.promptFeedback?.blockReason)
        throw new GeminiError("Gemini declined to analyze this photo.", 422, "Try a different photo of just your face.");
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      let parsed: { summary?: string; lighting?: string; concerns?: { key: string; score: number; note: string }[] };
      try {
        parsed = JSON.parse(stripFences(text));
      } catch {
        throw new GeminiError("Gemini returned an unreadable answer.", 502);
      }
      const concerns: DetectedConcern[] = (parsed.concerns ?? [])
        .filter((c) => CONCERNS.includes(c.key as ConcernKey))
        .map((c) => ({
          key: c.key as ConcernKey,
          score: Math.max(0, Math.min(1, Number(c.score) || 0)),
          confidence: "medium" as const,
          note: String(c.note ?? "").slice(0, 240),
        }))
        .slice(0, 6);
      return { model, summary: String(parsed.summary ?? "").slice(0, 500), lighting: parsed.lighting, concerns };
    }
  }
  throw lastError ?? new GeminiError("Gemini is unavailable.", 502);
}
