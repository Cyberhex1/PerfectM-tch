import { connection } from "next/server";
import { geminiConfigured, geminiModels } from "@/lib/server/gemini";

/** Tells the client which optional integrations this deployment has switched on. */
export async function GET() {
  await connection(); // read env at request time, not build time
  return Response.json({
    ai: geminiConfigured(),
    model: geminiConfigured() ? geminiModels()[0] : null,
  });
}
