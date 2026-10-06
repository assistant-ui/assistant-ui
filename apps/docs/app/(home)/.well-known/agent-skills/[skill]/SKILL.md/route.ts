import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import {
  agentSkillDocument,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";
import { getSkill, listSkills } from "@/lib/agent-skills";

type Context = { params: Promise<{ skill: string }> };

async function getDocument(name: string) {
  "use cache";
  cacheLife("max");
  const skill = getSkill(name);
  return skill ? agentSkillDocument(skill) : null;
}

async function respond(context: Context, head: boolean) {
  const { skill: name } = await context.params;
  const document = await getDocument(name);
  if (!document) notFound();
  return createDiscoveryResponse(document, {
    contentType: "text/markdown; charset=utf-8",
    head,
  });
}

export function GET(_req: NextRequest, context: Context) {
  return respond(context, false);
}

export function HEAD(_req: NextRequest, context: Context) {
  return respond(context, true);
}

export function generateStaticParams() {
  return listSkills().map((skill) => ({ skill: skill.name }));
}
