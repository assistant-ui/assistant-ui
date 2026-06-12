import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { badRequest, noContent, withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ threadId: string }> };

export const GET = withFail(async (_req: NextRequest, { params }: Context) => {
  const { threadId } = await params;
  return Response.json(await piClient.getThread(threadId));
});

export const PATCH = withFail(async (req: NextRequest, { params }: Context) => {
  const { threadId } = await params;
  const { title } = (await req.json()) as { title?: unknown };
  if (typeof title !== "string" || title.trim() === "") {
    return badRequest("title must be a non-empty string");
  }
  await piClient.renameThread(threadId, title);
  return noContent();
});

export const DELETE = withFail(
  async (_req: NextRequest, { params }: Context) => {
    const { threadId } = await params;
    await piClient.deleteThread(threadId);
    return noContent();
  },
);
