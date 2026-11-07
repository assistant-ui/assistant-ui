"use client";

import {
  AgentCard,
  type AgentSkill,
} from "@/components/assistant-ui/elements/agent-card";
import { defineStates } from "./types";

const noop = () => {};

const SKILLS: readonly AgentSkill[] = [
  { name: "triage", description: "Read an issue and label it" },
  { name: "repro", description: "Build a minimal reproduction" },
  { name: "patch", description: "Open a PR with the fix" },
];

const base = {
  name: "Maintainer",
  description:
    "Works through the issue queue: reproduces the report, writes the fix, and opens the PR.",
  provider: "assistant-ui",
  version: "1.4.0",
  model: "opus",
  endpoint: "https://agents.example.com/a2a",
  skills: SKILLS,
  onConnect: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "success",
    label: "Connected",
    note: "The agent is already connected, so the button is inactive.",
    Component: () => <AgentCard {...base} connected />,
  },
  {
    key: "empty",
    label: "No skills",
    note: "An agent card that lists no skills.",
    Component: () => (
      <AgentCard
        {...base}
        name="Notes"
        description="Answers questions about your meeting notes."
        version="0.1.0"
        model="haiku"
        endpoint="https://notes.example.com/a2a"
        skills={[]}
        connected={false}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long details",
    note: "Long names, skills, and endpoints truncate inside the card.",
    Component: () => (
      <AgentCard
        {...base}
        name="Customer support escalation and refund handler"
        provider="Northwind Commerce Platform Engineering"
        version="12.0.0-beta.3"
        model="sonnet"
        endpoint="https://agents.northwind-commerce.example.com/v2/a2a/support-escalation"
        description="Takes over tickets the first-line agent could not resolve. It reads the full order history, checks refund eligibility against the current policy, and drafts a reply for a human to approve before anything is sent."
        skills={[
          {
            name: "refund-eligibility",
            description:
              "Check an order against the refund policy and explain the outcome",
          },
          {
            name: "order-history",
            description:
              "Summarize every order, return, and support ticket for a customer",
          },
          {
            name: "draft-reply",
            description: "Write a reply for a human to approve",
          },
          {
            name: "escalate",
            description: "Hand the ticket to the on-call support lead",
          },
        ]}
        connected={false}
      />
    ),
  },
]);
