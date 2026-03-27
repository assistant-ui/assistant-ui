import { NextResponse } from "next/server";
import { saveThread } from "./store";

export async function POST(request: Request) {
  const body = await request.json();
  const messages = body?.messages;
  if (!Array.isArray(messages)) {
    return NextResponse.json(
      { error: "messages array required" },
      { status: 400 },
    );
  }
  const thread = saveThread(messages);
  return NextResponse.json({ id: thread.id });
}
