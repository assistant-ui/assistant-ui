import { cacheLife } from "next/cache";
import type { NextRequest } from "next/server";
import {
  agentSkillDocument,
  createDiscoveryResponse,
} from "@/lib/agent-discovery";
import { getSkill, listSkills } from "@/lib/agent-skills";
import { missingMarkdownResponse } from "@/lib/docs-markdown";

type Context = { params: Promise<{ skill: string }> };

const SKILLS_PATH = "/.well-known/agent-skills";

// nearestPages matches against a url's last segment, so the url ends in the
// skill name and href carries the SKILL.md link.
function skillPages() {
  return listSkills().map((skill) => ({
    url: `${SKILLS_PATH}/${skill.name}`,
    href: `${SKILLS_PATH}/${skill.name}/SKILL.md`,
    data: { title: skill.name, description: skill.description },
  }));
}

function missingSkillResponse(name: string, head: boolean) {
  const response = missingMarkdownResponse(
    `${SKILLS_PATH}/${name}`,
    skillPages(),
  );
  if (!head) return response;
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

async function getDocument(name: string) {
  "use cache";
  cacheLife("max");
  const skill = getSkill(name);
  return skill ? agentSkillDocument(skill) : null;
}

async function respond(context: Context, head: boolean) {
  const { skill: name } = await context.params;
  const document = await getDocument(name);
  if (!document) return missingSkillResponse(name, head);
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
