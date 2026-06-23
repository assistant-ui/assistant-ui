import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { getXuluxHostedTemplatesCatalog } from "@/lib/xulux/templates-catalog";

export function GET() {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(getXuluxHostedTemplatesCatalog());
}
