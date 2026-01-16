import { source } from "@/lib/source";
import { BASE_URL } from "@/lib/constants";

export const revalidate = false;

export async function GET() {
  const scanned: string[] = [];
  scanned.push("# Docs");
  const map = new Map<string, string[]>();

  for (const page of source.getPages()) {
    const dir = page.slugs[0] || "root";
    const list = map.get(dir) ?? [];
    list.push(
      `- [${page.data.title}](${BASE_URL}${page.url}): ${page.data.description || ""}`,
    );
    map.set(dir, list);
  }

  for (const [key, value] of map) {
    scanned.push(`## ${key}`);
    scanned.push(value.join("\n"));
  }

  return new Response(scanned.join("\n\n"));
}
