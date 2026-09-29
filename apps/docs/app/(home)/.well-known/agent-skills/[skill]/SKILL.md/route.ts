import type { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import {
  agentSkillDocument,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";
import { getSkill, listSkills } from "@/lib/agent-skills";

export const revalidate = false;

type Context = { params: Promise<{ skill: string }> };

async function respond(context: Context, head: boolean) {
  const { skill: name } = await context.params;
  const skill = getSkill(name);
  if (!skill) notFound();
  return createDiscoveryResponse(agentSkillDocument(skill), {
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
