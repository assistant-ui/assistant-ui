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

// The known skills as markdown pages. missingMarkdownResponse links each as
// `${url}.md`, so the url stops before `.md` and the link lands on SKILL.md.
function skillPages() {
  return listSkills().map((skill) => ({
    url: `${SKILLS_PATH}/${skill.name}/SKILL`,
    data: { title: skill.name, description: skill.description },
  }));
}

// An agent asking for a skill that doesn't exist gets a markdown 404 that
// suggests the nearest real skills, like the other markdown routes, instead
// of the HTML not-found page.
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
