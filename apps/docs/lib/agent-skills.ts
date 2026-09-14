import generated from "./agent-skills.generated.json";

export type AgentSkill = {
  name: string;
  description: string;
  content: string;
};

const { skills } = generated as { skills: AgentSkill[] };

const DESCRIPTION_LIMIT = 1024;

// The upstream skills describe themselves at length; the Agent Skills spec
// caps a description at 1024 characters, so every channel that publishes a
// skill (index, served frontmatter, WebMCP tools) carries the leading words
// that fit.
export function agentSkillDescription({
  description,
}: Pick<AgentSkill, "description">) {
  if (description.length <= DESCRIPTION_LIMIT) return description;
  const head = description.slice(0, DESCRIPTION_LIMIT);
  const cut = head.lastIndexOf(" ");
  return cut === -1 ? head.replace(/[\uD800-\uDBFF]$/, "") : head.slice(0, cut);
}

const published = <T extends Pick<AgentSkill, "description">>(skill: T): T => ({
  ...skill,
  description: agentSkillDescription(skill),
});

export function getSkills(): AgentSkill[] {
  return skills;
}

export function listSkills(): Pick<AgentSkill, "name" | "description">[] {
  return skills.map(({ name, description }) =>
    published({ name, description }),
  );
}

export function getSkill(name: string): AgentSkill | undefined {
  const skill = skills.find((candidate) => candidate.name === name);
  return skill && published(skill);
}
