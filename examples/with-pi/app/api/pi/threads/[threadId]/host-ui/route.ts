import type { NextRequest } from "next/server";
import type { PiHostUiResponse } from "@assistant-ui/react-pi";
import { piClient } from "@/lib/pi-server";
import { fail, noContent } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { threadId } = await params;
    const { response } = (await req.json()) as { response: PiHostUiResponse };
    await piClient.respondToHostUiRequest(threadId, response);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
