import { BASE_URL } from "@/lib/constants";

/** Shareable cart URL that restores the cart on any device or in an agent. */
export function cartUrl(
  slugs: readonly string[],
  { markdown = false, absolute = false } = {},
): string {
  const path = `/shop/cart${markdown ? ".md" : ""}`;
  const query = slugs.length > 0 ? `?items=${slugs.join(",")}` : "";
  return `${absolute ? BASE_URL : ""}${path}${query}`;
}

export function parseCartItems(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
