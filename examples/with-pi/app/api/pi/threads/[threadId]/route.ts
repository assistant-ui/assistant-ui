import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { fail, noContent } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export async function GET(_req: NextRequest, { params }: Context) {
  try {
    const { threadId } = await params;
    return Response.json(await piClient.getThread(threadId));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const { threadId } = await params;
    const { title } = (await req.json()) as { title: string };
    await piClient.renameThread(threadId, title);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  try {
    const { threadId } = await params;
    await piClient.deleteThread(threadId);
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
