import { BASE_URL } from "@/lib/constants";

/** The markdown install guide an agent fetches for a set of catalog items. */
export function installGuideUrl(
  slugs: readonly string[],
  { absolute = false } = {},
): string {
  const query = slugs.length > 0 ? `?items=${slugs.join(",")}` : "";
  return `${absolute ? BASE_URL : ""}/install.md${query}`;
}

export function parseItemSlugs(raw: string | null | undefined): string[] {
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
