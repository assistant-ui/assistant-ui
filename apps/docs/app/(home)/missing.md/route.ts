import { missingMarkdownResponse } from "@/lib/docs-markdown";

export function GET(request: Request) {
  return missingMarkdownResponse(new URL(request.url).pathname, []);
}
