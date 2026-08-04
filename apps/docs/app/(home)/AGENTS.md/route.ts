import {
  AGENTS_DOCUMENT,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";

export const revalidate = false;

export function GET() {
  return createDiscoveryResponse(AGENTS_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
  });
}

export function HEAD() {
  return createDiscoveryResponse(AGENTS_DOCUMENT, {
    contentType: "text/markdown; charset=utf-8",
    head: true,
  });
}
