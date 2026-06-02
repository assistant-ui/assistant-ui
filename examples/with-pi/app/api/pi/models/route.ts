import type { NextRequest } from "next/server";
import { piClient } from "@/lib/pi-server";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    return Response.json(await piClient.getAvailableModels());
  } catch (error) {
    return fail(error);
  }
}
