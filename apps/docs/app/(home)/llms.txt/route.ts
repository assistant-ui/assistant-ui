import { source } from "@/lib/source";
import { BASE_URL } from "@/lib/constants";

export const revalidate = false;

export async function GET() {
  const lines: string[] = [];
  lines.push("# assistant-ui");
  lines.push("");
  lines.push("> React components for AI chat interfaces");
  lines.push("");
  lines.push("## Table of Contents");

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
    lines.push("");
    lines.push(`### ${key}`);
    lines.push("");
    lines.push(value.join("\n"));
  }

  return new Response(lines.join("\n"));
}
