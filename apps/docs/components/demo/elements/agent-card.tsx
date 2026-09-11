"use client";

import { useState } from "react";
import {
  AgentCard,
  type AgentSkill,
} from "@/components/assistant-ui/elements/agent-card";

const SKILLS: readonly AgentSkill[] = [
  { name: "triage", description: "Read an issue and label it" },
  { name: "repro", description: "Build a minimal reproduction" },
  { name: "patch", description: "Open a PR with the fix" },
];

export function AgentCardDemo() {
  const [connected, setConnected] = useState(false);

  return (
    <AgentCard
      name="Maintainer"
      description="Works through the issue queue: reproduces the report, writes the fix, and opens the PR."
      provider="assistant-ui"
      version="1.4.0"
      model="opus"
      endpoint="https://agents.example.com/a2a"
      skills={SKILLS}
      connected={connected}
      onConnect={() => setConnected(true)}
    />
  );
}
