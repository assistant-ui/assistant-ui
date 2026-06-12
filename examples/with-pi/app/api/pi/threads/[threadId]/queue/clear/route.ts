import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export async function POST(_req: NextRequest, { params }: Context) {
  try {
    const { threadId } = await params;
    const cleared = await piClient.clearQueue(threadId);
    return Response.json(cleared);
  } catch (error) {
    return fail(error);
  }
}
