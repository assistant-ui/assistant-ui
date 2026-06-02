import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { fail, noContent } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { threadId } = await params;
    const input = (await req.json()) as { provider: string; modelId: string };
    await piClient.setModel(threadId, input);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
