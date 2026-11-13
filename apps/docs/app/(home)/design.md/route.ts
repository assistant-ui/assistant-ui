import { unstable_cache } from "@farm.js/core/cache";
import { createDiscoveryResponse } from "@/lib/agent-discovery";
import { DESIGN_DOCUMENT } from "@/lib/design-law";

const getDocument = unstable_cache(
  async function getDocument() {
  return DESIGN_DOCUMENT;
},
  ["app/(home)/design.md/route.ts#getDocument"],
  { revalidate: false },
);

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
