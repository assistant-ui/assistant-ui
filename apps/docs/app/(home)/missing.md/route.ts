import { missingMarkdownResponse } from "@/lib/docs-markdown";

export function GET(request: Request) {
  const { pathname, searchParams } = new URL(request.url);
  return missingMarkdownResponse(searchParams.get("path") ?? pathname, []);
}
