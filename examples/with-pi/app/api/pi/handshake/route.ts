import { getHandshake } from "@/lib/pi-server";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    return Response.json(getHandshake());
  } catch (error) {
    return fail(error);
  }
}
