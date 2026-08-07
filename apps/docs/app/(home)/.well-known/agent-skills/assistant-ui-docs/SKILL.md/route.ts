import {
  createDiscoveryResponse,
  sha256,
  SITE_SKILL_DOCUMENT,
} from "@/lib/agent-discovery";

export const revalidate = false;

const digest = sha256(SITE_SKILL_DOCUMENT);

export function GET() {
  return createDiscoveryResponse(SITE_SKILL_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
    digest,
  });
}

export function HEAD() {
  return createDiscoveryResponse(SITE_SKILL_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
    digest,
    head: true,
  });
}
