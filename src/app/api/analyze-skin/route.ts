import { analyzeSkinWithGemini, GeminiError } from "@/lib/server/gemini";

export async function POST(request: Request) {
  let payload: { image?: unknown; mimeType?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  if (typeof payload.image !== "string" || !payload.image) {
    return Response.json({ error: "Missing image." }, { status: 400 });
  }
  try {
    const result = await analyzeSkinWithGemini(
      payload.image,
      typeof payload.mimeType === "string" ? payload.mimeType : undefined,
    );
    return Response.json(result);
  } catch (e) {
    if (e instanceof GeminiError) {
      console.warn(`[analyze-skin] ${e.status} ${e.message}`);
      return Response.json({ error: e.message, hint: e.hint }, { status: e.status });
    }
    console.error("[analyze-skin]", e);
    return Response.json({ error: "AI analysis failed." }, { status: 500 });
  }
}
