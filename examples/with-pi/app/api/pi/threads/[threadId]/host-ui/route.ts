import type { NextRequest } from "next/server";
import type { PiHostUiResponse } from "@assistant-ui/react-pi";
import { piClient } from "@/lib/pi-server";
import { noContent, withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export const POST = withFail(async (req: NextRequest, { params }: Context) => {
  const { threadId } = await params;
  const { response } = (await req.json()) as { response: PiHostUiResponse };
  await piClient.respondToHostUiRequest(threadId, response);
  return noContent();
});
