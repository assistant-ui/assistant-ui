import generated from "./agent-skills.generated.json";

export type AgentSkill = {
  name: string;
  description: string;
  content: string;
};

const { skills } = generated as { skills: AgentSkill[] };

export function getSkills(): AgentSkill[] {
  return skills;
}

export function listSkills(): Pick<AgentSkill, "name" | "description">[] {
  return skills.map(({ name, description }) => ({ name, description }));
}

export function getSkill(name: string): AgentSkill | undefined {
  return skills.find((skill) => skill.name === name);
}
