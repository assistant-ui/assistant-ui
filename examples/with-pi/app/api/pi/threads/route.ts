import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withFail(async (req: NextRequest) => {
  const params = new URL(req.url).searchParams;
  const workspacePath = params.get("workspacePath") ?? undefined;
  const includeArchived = params.get("includeArchived") === "true";
  const threads = await piClient.listThreads({
    ...(workspacePath ? { workspacePath } : {}),
    includeArchived,
  });
  return Response.json(threads);
});

export const POST = withFail(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  return Response.json(await piClient.createThread(body));
});
