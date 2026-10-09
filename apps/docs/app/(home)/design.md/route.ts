import { cacheLife } from "next/cache";
import { createDiscoveryResponse } from "@/lib/agent-discovery";
import { DESIGN_DOCUMENT } from "@/lib/design-law";

async function getDocument() {
  "use cache";
  cacheLife("max");
  return DESIGN_DOCUMENT;
}

export async function GET() {
  return createDiscoveryResponse(await getDocument(), {
    contentType: "text/markdown; charset=utf-8",
  });
}

export async function HEAD() {
  return createDiscoveryResponse(await getDocument(), {
    contentType: "text/markdown; charset=utf-8",
    head: true,
  });
}
