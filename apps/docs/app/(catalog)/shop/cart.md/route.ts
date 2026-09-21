import type { NextRequest } from "next/server";
import { resolveProducts } from "@/lib/catalog";
import { buildInstallPrompt } from "@/lib/catalog/build-install-prompt";
import { parseCartItems } from "@/lib/catalog/install-prompt";
import { checkoutEnabled } from "@/lib/checkout/config";
import { BASE_URL } from "@/lib/constants";
import { createMarkdownResponse } from "@/lib/markdown-response";

export function GET(request: NextRequest) {
  if (!checkoutEnabled) return new Response("Not found", { status: 404 });
  const products = resolveProducts(
    parseCartItems(request.nextUrl.searchParams.get("items")),
  );
  if (products.length === 0) {
    return createMarkdownResponse(
      `No products selected. Pass ?items=<slug>,<slug> using slugs from ${BASE_URL}/shop.md\n`,
    );
  }
  return createMarkdownResponse(buildInstallPrompt(products));
}
