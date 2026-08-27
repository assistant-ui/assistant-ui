import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DESIGN_SECTIONS } from "@/components/pages/design/registry-meta";
import { AGENT_DISCOVERY_ROUTES } from "./agent-discovery-routes";
import { BASE_URL } from "./constants";

const LAW = readFileSync(join(process.cwd(), "content", "design.md"), "utf8");

const roster = () => {
  const lines = ["## The kit roster", ""];

  for (const section of DESIGN_SECTIONS) {
    lines.push(`### ${section.label}`, "");
    for (const component of section.components) {
      const url = `${BASE_URL}/design/components/${component.slug}`;
      lines.push(`- [${component.name}](${url}): ${component.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
};

const discovery = () =>
  [
    "## Discovery",
    "",
    `- Design law: ${BASE_URL}${AGENT_DISCOVERY_ROUTES.design}`,
    `- Component gallery: ${BASE_URL}/design/components`,
    `- Documentation skill: ${BASE_URL}${AGENT_DISCOVERY_ROUTES.skill}`,
    `- Agent instructions: ${BASE_URL}${AGENT_DISCOVERY_ROUTES.agents}`,
    "",
  ].join("\n");

export const DESIGN_DOCUMENT = `${LAW.trimEnd()}\n\n${roster()}\n${discovery()}`;

export const DESIGN_SKILL_NAME = "assistant-ui-design";

export const DESIGN_SKILL_DESCRIPTION =
  "Draw, review, or extend an assistant-ui surface in the house design language: the print register, the sand palette, type roles, the line budget, motion, and the closed token and component API.";
