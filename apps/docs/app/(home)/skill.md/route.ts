import { unstable_cache } from "@farm.js/core/cache";
import {
  createDiscoveryResponse,
  SITE_SKILL_DOCUMENT,
} from "@/lib/agent-discovery";

const getDocument = unstable_cache(
  async function getDocument() {
  return SITE_SKILL_DOCUMENT;
},
  ["app/(home)/skill.md/route.ts#getDocument"],
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
