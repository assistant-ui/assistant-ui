import { piClient } from "@/lib/pi-server";
import { withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withFail(async (request: Request) => {
  const threadId = new URL(request.url).searchParams.get("threadId");
  return Response.json(
    await piClient.getAvailableModels(threadId ? { threadId } : undefined),
  );
});
