import { design, elementsDocs, examples, source } from "@/lib/source";
import { getLLMText } from "@/lib/get-llm-text";
import { createMarkdownResponse } from "@/lib/markdown-response";

export const revalidate = false;

export async function GET() {
  const scan = [
    ...source.getPages(),
    ...examples.getPages(),
    ...design.getPages(),
    ...elementsDocs.getPages(),
  ].map((page) => getLLMText(page));
  const scanned = await Promise.all(scan);

  return createMarkdownResponse(
    scanned.join("\n\n"),
    "text/plain; charset=utf-8",
  );
}
