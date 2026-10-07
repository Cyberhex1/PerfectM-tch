import { searchProducts } from "@/lib/server/openBeautyFacts";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const products = await searchProducts(q);
    return Response.json({ products }, { headers: { "cache-control": "public, max-age=3600" } });
  } catch (e) {
    console.warn("[products/search]", e);
    return Response.json({ products: [], error: "Open Beauty Facts is unavailable right now." }, { status: 502 });
  }
}
