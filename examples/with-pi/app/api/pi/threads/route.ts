import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const params = new URL(req.url).searchParams;
    const workspacePath = params.get("workspacePath") ?? undefined;
    const includeArchived = params.get("includeArchived") === "true";
    const threads = await piClient.listThreads({
      ...(workspacePath ? { workspacePath } : {}),
      includeArchived,
    });
    return Response.json(threads);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const snapshot = await piClient.createThread(body);
    return Response.json(snapshot);
  } catch (error) {
    return fail(error);
  }
}
