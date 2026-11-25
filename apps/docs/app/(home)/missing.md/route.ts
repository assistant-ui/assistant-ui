import { createMarkdownResponse } from "@/lib/markdown-response";

export function GET() {
  return createMarkdownResponse(null);
}
