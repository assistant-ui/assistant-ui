"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import { AgentReceipt } from "./components/agent";
import { createAgent, getAgent, updateAgent } from "./components/store";
import data from "./data.json";

const name = z
  .string()
  .max(60)
  .describe(
    "Two to four words with a capital on the first word only, such as Sprint retro facilitator.",
  );

const description = z
  .string()
  .max(200)
  .describe("One sentence on what the agent does.");

const model = z
  .enum(data.models.map((entry) => entry.id))
  .describe("The model the agent runs on.");

const effort = z
  .enum(["low", "medium", "high"])
  .nullable()
  .describe("How hard the model thinks. Null leaves it to the model.");

const system = z
  .string()
  .max(8000)
  .describe("The agent's instructions, written to it as You.");

const connectors = z
  .array(z.enum(data.connectors.map((entry) => entry.name)))
  .describe("The services the agent can reach. The whole list.");

const tools = z
  .array(z.enum(data.tools.map((entry) => entry.name)))
  .describe("The built-in tools that are switched on. The whole list.");

const skills = z
  .array(z.enum(data.skills.map((entry) => entry.id)))
  .describe("The kinds of file the agent can write. The whole list.");

const schedule = z
  .object({
    label: z
      .string()
      .max(60)
      .describe("In plain words, such as Weekdays at 8:00 AM."),
    cron: z
      .string()
      .max(40)
      .describe("Five fields: minute, hour, day of month, month, weekday."),
    timezone: z.string().max(40).describe("An IANA time zone name."),
  })
  .nullable()
  .describe("When the agent runs on its own. Null when it runs on request.");

/* The agent lives in the browser, so both tools run there. */
export default defineToolkit({
  create_agent: {
    description:
      "Set up a new agent. Call it once the person has said what the agent is for.",
    parameters: z.object({
      name,
      description,
      model,
      effort: effort.optional(),
      system,
      connectors,
      tools,
      skills: skills.optional(),
      schedule: schedule.optional(),
    }),
    execute: async (input) => {
      "use client";
      createAgent(input);
      return { ok: true, name: input.name, changed: [] as string[] };
    },
    render: AgentReceipt,
  },
  update_agent: {
    description:
      "Change the open agent. Send only the fields that change; a list replaces the list it names.",
    parameters: z.object({
      name: name.optional(),
      description: description.optional(),
      model: model.optional(),
      effort: effort.optional(),
      system: system.optional(),
      connectors: connectors.optional(),
      tools: tools.optional(),
      skills: skills.optional(),
      schedule: schedule.optional(),
    }),
    execute: async (input) => {
      "use client";
      const ok = updateAgent(input);
      return {
        ok,
        name: getAgent()?.name ?? "",
        changed: Object.entries(input)
          .filter(([, value]) => value !== undefined)
          .map(([key]) => key),
      };
    },
    render: AgentReceipt,
  },
});
