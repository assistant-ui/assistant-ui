import data from "../data.json";
import type { Agent } from "./store";

/* -------------------------------------------------------------------------- */
/* The agent as the API takes it, written four ways                           */
/* -------------------------------------------------------------------------- */

type Json = string | number | boolean | Json[] | { [key: string]: Json };

const auto = { permission_policy: { type: "auto" } };

/** The body of a Claude Managed Agents create call. */
export function toConfig(agent: Agent): { [key: string]: Json } {
  const off = data.tools
    .map((tool) => tool.name)
    .filter((name) => !agent.tools.includes(name));
  const servers = data.connectors.filter((connector) =>
    agent.connectors.includes(connector.name),
  );

  return {
    name: agent.name,
    description: agent.description,
    model: agent.effort
      ? { id: agent.model, effort: agent.effort }
      : agent.model,
    ...(agent.workflows && {
      multiagent: {
        type: "multiagent_20261001",
        workflows: { type: "enabled" },
        subagents: { type: "disabled" },
      },
    }),
    system: agent.system,
    ...(servers.length > 0 && {
      mcp_servers: servers.map(({ name, url }) => ({ name, type: "url", url })),
    }),
    tools: [
      {
        type: "agent_toolset_20260401",
        ...(off.length > 0 && {
          configs: off.map((name) => ({ name, enabled: false })),
        }),
        default_config: auto,
      },
      ...servers.map(({ name }) => ({
        type: "mcp_toolset",
        mcp_server_name: name,
        default_config: auto,
      })),
    ],
    ...(agent.skills.length > 0 && {
      skills: agent.skills.map((id) => ({ type: "anthropic", skill_id: id })),
    }),
  };
}

/* A string YAML reads back as the same string without quotes. */
const plain = (text: string) =>
  /^[A-Za-z][^\n]*[^\s:]$/.test(text) &&
  !text.includes(": ") &&
  !text.includes(" #") &&
  !/^(true|false|null|yes|no|on|off)$/i.test(text);

function yamlLines(value: Json[] | { [key: string]: Json }, indent: string) {
  if (Array.isArray(value))
    return value.flatMap((item): string[] => {
      const [first = "", ...rest] = yamlLines(
        item as { [key: string]: Json },
        `${indent}  `,
      );
      return [`${indent}- ${first.trimStart()}`, ...rest];
    });

  return Object.entries(value).flatMap(([key, entry]): string[] => {
    if (typeof entry === "object")
      return [`${indent}${key}:`, ...yamlLines(entry, `${indent}  `)];
    if (typeof entry !== "string") return [`${indent}${key}: ${entry}`];
    // Text of several lines is a block that keeps its line breaks.
    if (entry.includes("\n"))
      return [
        `${indent}${key}: |-`,
        ...entry.split("\n").map((line) => (line ? `${indent}  ${line}` : "")),
      ];
    return [`${indent}${key}: ${plain(entry) ? entry : JSON.stringify(entry)}`];
  });
}

function python(value: Json, indent: string): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value !== "object") return JSON.stringify(value);
  const inner = `${indent}    `;
  if (Array.isArray(value))
    return `[\n${value.map((item) => `${inner}${python(item, inner)},\n`).join("")}${indent}]`;
  return `{\n${Object.entries(value)
    .map(
      ([key, entry]) =>
        `${inner}${JSON.stringify(key)}: ${python(entry, inner)},\n`,
    )
    .join("")}${indent}}`;
}

export const FORMATS = [
  {
    id: "yaml",
    label: "YAML",
    write: (agent: Agent) => yamlLines(toConfig(agent), "").join("\n"),
  },
  {
    id: "typescript",
    label: "TypeScript",
    write: (agent: Agent) =>
      `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const agent = await client.beta.agents.create(${JSON.stringify(toConfig(agent), null, 2)});`,
  },
  {
    id: "python",
    label: "Python",
    write: (agent: Agent) =>
      `import anthropic

client = anthropic.Anthropic()

agent = client.beta.agents.create(
${Object.entries(toConfig(agent))
  .map(([key, entry]) => `    ${key}=${python(entry, "    ")},\n`)
  .join("")})`,
  },
  {
    id: "curl",
    label: "curl",
    // The body goes in a quoted heredoc, so an apostrophe or a dollar sign in the instructions is sent as written.
    write: (agent: Agent) =>
      `curl https://api.anthropic.com/v1/agents \\
  -H "x-api-key: $ANTHROPIC_API_KEY" \\
  -H "anthropic-version: 2026-10-21" \\
  -H "anthropic-beta: managed-agents-2026-04-01" \\
  -H "content-type: application/json" \\
  -d @- <<'EOF'
${JSON.stringify(toConfig(agent), null, 2)}
EOF`,
  },
] as const;

export type Format = (typeof FORMATS)[number]["id"];
