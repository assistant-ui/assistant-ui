import { createDiscoveryResponse } from "@/lib/agent-discovery";
import { DESIGN_DOCUMENT } from "@/lib/design-law";

export const dynamic = "force-static";

export function GET() {
  return createDiscoveryResponse(DESIGN_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
  });
}

export function HEAD() {
  return createDiscoveryResponse(DESIGN_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
    head: true,
  });
}
