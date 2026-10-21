import { cacheLife } from "next/cache";
import {
  buildAgentSkillsIndex,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

async function getIndex() {
  "use cache";
  cacheLife("max");
  return buildAgentSkillsIndex();
}

export async function GET() {
  return createJsonDiscoveryResponse(await getIndex());
}

export async function HEAD() {
  return createJsonDiscoveryResponse(await getIndex(), { head: true });
}
