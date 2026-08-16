import {
  buildAgentSkillsIndex,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

export const revalidate = false;

export function GET() {
  return createJsonDiscoveryResponse(buildAgentSkillsIndex());
}

export function HEAD() {
  return createJsonDiscoveryResponse(buildAgentSkillsIndex(), { head: true });
}
