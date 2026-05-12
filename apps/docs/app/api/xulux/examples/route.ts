import { NextResponse } from "next/server";
import { getXuluxExamplesCatalog } from "@/lib/xulux/examples-catalog";

export function GET() {
  return NextResponse.json(getXuluxExamplesCatalog());
}
