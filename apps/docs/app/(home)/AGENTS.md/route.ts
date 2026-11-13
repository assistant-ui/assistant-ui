import { unstable_cache } from "@farm.js/core/cache";
import {
  AGENTS_DOCUMENT,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";

const getDocument = unstable_cache(
  async function getDocument() {
  return AGENTS_DOCUMENT;
  },
  ["app/(home)/AGENTS.md/route.ts#getDocument"],
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
