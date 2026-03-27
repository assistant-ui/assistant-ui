import { NextResponse } from "next/server";
import { getThread } from "../store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const thread = getThread(id);
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(thread);
}
