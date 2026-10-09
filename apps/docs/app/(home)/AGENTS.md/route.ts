import { cacheLife } from "next/cache";
import {
  AGENTS_DOCUMENT,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";

async function getDocument() {
  "use cache";
  cacheLife("max");
  return AGENTS_DOCUMENT;
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
