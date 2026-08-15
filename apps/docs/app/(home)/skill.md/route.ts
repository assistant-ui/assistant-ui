import {
  createDiscoveryResponse,
  SITE_SKILL_DOCUMENT,
} from "@/lib/agent-discovery";

export const revalidate = false;

export function GET() {
  return createDiscoveryResponse(SITE_SKILL_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
  });
}

export function HEAD() {
  return createDiscoveryResponse(SITE_SKILL_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
    head: true,
  });
}
