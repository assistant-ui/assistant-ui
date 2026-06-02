import { NextResponse } from "next/server";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { getXuluxExamplesCatalog } from "@/lib/xulux/examples-catalog";

export function GET() {
  if (!isAiPlaygroundEnabled) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(getXuluxExamplesCatalog());
}
