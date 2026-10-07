import { cacheLife } from "next/cache";
import {
  createDiscoveryResponse,
  SITE_SKILL_DOCUMENT,
} from "@/lib/agent-discovery";

async function getDocument() {
  "use cache";
  cacheLife("max");
  return SITE_SKILL_DOCUMENT;
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
