"use client";

import { useSyncExternalStore } from "react";
import data from "../data.json";

/* -------------------------------------------------------------------------- */
/* The agent being built: one at a time, kept in the page's memory            */
/* -------------------------------------------------------------------------- */

export type Agent = {
  name: string;
  description: string;
  /** The id of the model the agent runs on. */
  model: string;
  effort: "low" | "medium" | "high" | null;
  /** The agent's instructions. */
  system: string;
  /** Names of the connectors in data.json. */
  connectors: readonly string[];
  /** Names of the built-in tools that are switched on. */
  tools: readonly string[];
  skills: readonly string[];
  /** Whether the agent may start runs of other agents. */
  workflows: boolean;
  /** When the agent runs on its own. Null when it runs on request. */
  schedule: Schedule | null;
};

export type Schedule = {
  /** In plain words, such as "Weekdays at 8:00 AM". */
  label: string;
  /** Five fields: minute, hour, day of month, month, day of week. */
  cron: string;
  /** An IANA time zone name. */
  timezone: string;
};

export type AgentChange = { [Key in keyof Agent]?: Agent[Key] | undefined };

export type Template = Agent & { id: string };

export const TEMPLATES = data.templates as readonly Template[];

export const BLANK: Agent = {
  name: "",
  description: "",
  model: "claude-sonnet-5-5",
  effort: null,
  system: "",
  connectors: [],
  tools: [],
  skills: [],
  workflows: false,
  schedule: null,
};

type State = {
  agent: Agent | null;
  /** The template the agent started from, when it did. */
  template: string | null;
};

const none: State = { agent: null, template: null };

let state = none;
const listeners = new Set<() => void>();

function write(next: State) {
  state = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useAgent() {
  return useSyncExternalStore(
    subscribe,
    () => state.agent,
    () => null,
  );
}

/** The name of the template the agent started from. */
export function useTemplate() {
  return useSyncExternalStore(
    subscribe,
    () => state.template,
    () => null,
  );
}

export const getAgent = () => state.agent;

export function startFrom(template: Template) {
  write({ agent: template, template: template.name });
}

export const clearAgent = () => write(none);

/** The agent with a change laid over it. A field left out stays as it is. */
export function merge(agent: Agent, change: AgentChange): Agent {
  const next = { ...agent };
  for (const [key, value] of Object.entries(change))
    if (value !== undefined) Object.assign(next, { [key]: value });
  return next;
}

export function createAgent(change: AgentChange) {
  write({ agent: merge(BLANK, change), template: null });
}

/** Changes the open agent, and answers whether there was one to change. */
export function updateAgent(change: AgentChange) {
  if (!state.agent) return false;
  write({ ...state, agent: merge(state.agent, change) });
  return true;
}

/* -------------------------------------------------------------------------- */
/* Names for the ids                                                          */
/* -------------------------------------------------------------------------- */

export const modelName = (id: string) =>
  data.models.find((model) => model.id === id)?.name ?? id;

export const connectorTitle = (name: string) =>
  data.connectors.find((connector) => connector.name === name)?.title ?? name;

export const toolTitle = (name: string) =>
  data.tools.find((tool) => tool.name === name)?.title ?? name;

export const skillTitle = (id: string) =>
  data.skills.find((skill) => skill.id === id)?.title ?? id;

/** What sets an agent apart at a glance: what it connects to and makes. */
export function reach(agent: Agent) {
  return [
    ...agent.connectors.map(connectorTitle),
    ...(agent.tools.includes("web_search") ? ["Web search"] : []),
    ...agent.skills.map(skillTitle),
    ...(agent.workflows ? ["Workflows"] : []),
    ...(agent.schedule ? ["Scheduled"] : []),
  ];
}
