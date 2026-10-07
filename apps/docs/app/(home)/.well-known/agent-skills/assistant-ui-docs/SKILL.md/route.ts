import { cacheLife } from "next/cache";
import {
  createDiscoveryResponse,
  sha256,
  SITE_SKILL_DOCUMENT,
} from "@/lib/agent-discovery";

const digest = sha256(SITE_SKILL_DOCUMENT);

async function getDocument() {
  "use cache";
  cacheLife("max");
  return SITE_SKILL_DOCUMENT;
}

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
