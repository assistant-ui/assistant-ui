export type AgentToolCartEntry = {
  id: string;
  slug: "agent-tools";
  name: string;
  purpose: string;
};

export type CartEntry = string | AgentToolCartEntry;

export const isAgentToolCartEntry = (
  value: unknown,
): value is AgentToolCartEntry => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    entry.slug === "agent-tools" &&
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.name === "string" &&
    entry.name.trim().length > 0 &&
    typeof entry.purpose === "string" &&
    entry.purpose.trim().length > 0
  );
};
