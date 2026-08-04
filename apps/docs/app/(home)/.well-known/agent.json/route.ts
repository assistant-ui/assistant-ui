import {
  buildAgentManifest,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

export const revalidate = false;

export function GET() {
  return createJsonDiscoveryResponse(buildAgentManifest());
}

export function HEAD() {
  return createJsonDiscoveryResponse(buildAgentManifest(), { head: true });
}
