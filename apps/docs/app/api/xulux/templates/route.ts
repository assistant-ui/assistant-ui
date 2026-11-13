import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";

export function GET() {
  if (!isAiPlaygroundEnabled) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json(getXuluxHostedTemplatesCatalog());
}
