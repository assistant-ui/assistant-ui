import { unstable_cache } from "@farm.js/core/cache";
import {
  buildAgentSkillsIndex,
  createJsonDiscoveryResponse,
} from "@/lib/agent-discovery";

const getIndex = unstable_cache(
  async function getIndex() {
    return buildAgentSkillsIndex();
  },
  ["app/(home)/.well-known/agent-skills/index.json/route.ts#getIndex"],
  { revalidate: false },
);

export async function GET() {
  return createJsonDiscoveryResponse(await getIndex());
}

export async function HEAD() {
  return createJsonDiscoveryResponse(await getIndex(), { head: true });
}
