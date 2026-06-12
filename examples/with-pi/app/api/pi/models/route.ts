import { piClient } from "@/lib/pi-server";
import { withFail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withFail(async () =>
  Response.json(await piClient.getAvailableModels()),
);
