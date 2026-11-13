import { unstable_cache } from "@farm.js/core/cache";
import {
  agentSkillDocument,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";
import { getSkill, listSkills } from "@/lib/agent-skills";

type Context = { params: Promise<{ skill: string }> };

const getDocument = unstable_cache(
  async function getDocument(name: string) {
  const skill = getSkill(name);
  return skill ? agentSkillDocument(skill) : null;
  },
  ["app/(home)/.well-known/agent-skills/[skill]/SKILL.md/route.ts#getDocument"],
  { revalidate: false },
);

async function respond(context: Context, head: boolean) {
  const { skill: name } = await context.params;
  const document = await getDocument(name);
  if (!document) return new Response("Not found", { status: 404 });
  return createDiscoveryResponse(document, {
    contentType: "text/markdown; charset=utf-8",
    head,
  });
}

export function GET(_req: Request, context: Context) {
  return respond(context, false);
}

export function HEAD(_req: Request, context: Context) {
  return respond(context, true);
}

export function generateStaticParams() {
  return listSkills().map((skill) => ({ skill: skill.name }));
}
