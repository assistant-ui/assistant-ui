import { unstable_cache } from "@farm.js/core/cache";
import {
  createDiscoveryResponse,
  sha256,
  SITE_SKILL_DOCUMENT,
} from "@/lib/agent-discovery";

const digest = sha256(SITE_SKILL_DOCUMENT);

const getDocument = unstable_cache(
  async function getDocument() {
  return SITE_SKILL_DOCUMENT;
  },
  ["app/(home)/.well-known/agent-skills/assistant-ui-docs/SKILL.md/route.ts#getDocument"],
  { revalidate: false },
);

export async function GET() {
  return createDiscoveryResponse(await getDocument(), {
    contentType: "text/markdown; charset=utf-8",
    digest,
  });
}

export async function HEAD() {
  return createDiscoveryResponse(await getDocument(), {
    contentType: "text/markdown; charset=utf-8",
    digest,
    head: true,
  });
}
