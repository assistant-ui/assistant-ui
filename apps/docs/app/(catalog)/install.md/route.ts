import type { NextRequest } from "next/server";
import { resolveProducts } from "@/lib/catalog";
import { buildInstallPrompt } from "@/lib/catalog/build-install-prompt";
import { parseItemSlugs } from "@/lib/catalog/install-guide";
import { checkoutEnabled } from "@/lib/checkout/config";
import { BASE_URL } from "@/lib/constants";
import { createMarkdownResponse } from "@/lib/markdown-response";

export function GET(request: NextRequest) {
  if (!checkoutEnabled) return new Response("Not found", { status: 404 });
  const products = resolveProducts(
    parseItemSlugs(request.nextUrl.searchParams.get("items")),
  );
  if (products.length === 0) {
    const response = createMarkdownResponse(
      `No products selected. Pass ?items=<slug>,<slug> using slugs from ${BASE_URL}/catalog.md\n`,
    );
    return new Response(response.body, {
      status: 400,
      headers: response.headers,
    });
  }
  return createMarkdownResponse(buildInstallPrompt(products));
}
