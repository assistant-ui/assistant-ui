import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { noContent, withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export const POST = withFail(async (req: NextRequest, { params }: Context) => {
  const { threadId } = await params;
  const input = (await req.json()) as { provider: string; modelId: string };
  await piClient.setModel(threadId, input);
  return noContent();
});
