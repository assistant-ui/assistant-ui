import { useState } from "react";
import {
  AgentCard,
  type AgentSkill,
} from "@assistant-ui/ui/components/assistant-ui/elements/agent-card.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const SKILLS: readonly AgentSkill[] = [
  { name: "triage", description: "Read an issue and label it" },
  { name: "repro", description: "Build a minimal reproduction" },
  { name: "patch", description: "Open a PR with the fix" },
];

const AGENT = {
  name: "Maintainer",
  description:
    "Works through the issue queue: reproduces the report, writes the fix, and opens the PR.",
  provider: "assistant-ui",
  version: "1.4.0",
  model: "opus",
  endpoint: "https://agents.example.com/a2a",
  skills: SKILLS,
};

function InteractiveAgentCard() {
  const [connected, setConnected] = useState(false);
  return (
    <AgentCard
      {...AGENT}
      connected={connected}
      onConnect={() => setConnected(true)}
    />
  );
}

export default defineSections([
  {
    id: "agent-card",
    title: "Agent card",
    category: "agents",
    notes: "An A2A agent's card; Connect flips it to connected.",
    render: () => <InteractiveAgentCard />,
  },
  {
    id: "agent-card-states",
    title: "Agent card states",
    category: "agents",
    notes: "Connected, and a card with long names and no skills.",
    render: () => (
      <States>
        <State label="connected">
          <AgentCard {...AGENT} connected />
        </State>
        <State label="long names, no skills">
          <AgentCard
            name="Release coordinator for the extension marketplace"
            description="Collects the changesets, drafts the notes and publishes the VSIX once every check is green."
            provider="assistant-ui-internal-tooling"
            version="12.0.0-canary.20260930"
            model="sonnet"
            endpoint="https://agents.internal.example.com/a2a/release-coordinator/v2"
            skills={[]}
            connected={false}
            onConnect={() => {}}
          />
        </State>
      </States>
    ),
  },
]);
