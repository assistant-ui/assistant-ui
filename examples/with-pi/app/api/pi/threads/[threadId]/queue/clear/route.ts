import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export const POST = withFail(async (_req: NextRequest, { params }: Context) => {
  const { threadId } = await params;
  return Response.json(await piClient.clearQueue(threadId));
});
