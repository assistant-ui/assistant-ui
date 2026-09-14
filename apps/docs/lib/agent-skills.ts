import generated from "./agent-skills.generated.json";

export type AgentSkill = {
  name: string;
  description: string;
  content: string;
};

export type AgentSkillSummary = Pick<AgentSkill, "name" | "description">;

const { source, skills } = generated as {
  source: string;
  skills: AgentSkill[];
};

export const AGENT_SKILLS_SOURCE = source;

export function getSkills(): AgentSkill[] {
  return skills;
}

export function listSkills(): AgentSkillSummary[] {
  return skills.map(({ name, description }) => ({ name, description }));
}

export function getSkill(name: string): AgentSkill | undefined {
  return skills.find((skill) => skill.name === name);
}
