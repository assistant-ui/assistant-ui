import {
  design,
  elementsDocs,
  examples,
  source,
  getTapDocsPages,
} from "@/lib/source";
import { getLLMText } from "@/lib/get-llm-text";
import { PLAIN_TEXT_RESPONSE_HEADERS } from "@/lib/markdown-response";

export const revalidate = false;

export async function GET() {
  const scan = [
    ...source.getPages(),
    ...getTapDocsPages(),
    ...examples.getPages(),
    ...design.getPages(),
    ...elementsDocs.getPages(),
  ].map((page) => getLLMText(page));
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"), {
    headers: PLAIN_TEXT_RESPONSE_HEADERS,
  });
}
