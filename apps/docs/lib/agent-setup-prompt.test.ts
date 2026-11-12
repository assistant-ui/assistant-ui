import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_SETUP_COMMAND,
  AGENT_SETUP_FALLBACK,
  AGENT_SETUP_HINT,
  AGENT_SETUP_PROMPT,
  LEGACY_AGENT_SETUP_PROMPTS,
  agentSetupPrompt,
} from "./agent-setup-prompt";

describe("agent setup prompt", () => {
  it("is the bare prompt for the default setup", () => {
    expect(AGENT_SETUP_PROMPT).toBe("install and set up assistant-ui");
    expect(agentSetupPrompt()).toBe(AGENT_SETUP_PROMPT);
    expect(agentSetupPrompt(["assistant-ui"])).toBe(AGENT_SETUP_PROMPT);
  });

  it("names the products of a product setup", () => {
    expect(agentSetupPrompt(["cloud"])).toBe(
      "install and set up assistant-ui with `npx assistant-ui@latest setup --products cloud`",
    );
  });

  it("adds notes after the prompt", () => {
    expect(agentSetupPrompt(["assistant-ui"], " Use spec mode. ")).toBe(
      "install and set up assistant-ui. Use spec mode.",
    );
  });

  it("points agents at the command the CLI recommends", () => {
    const cli = readFileSync(
      path.resolve(
        __dirname,
        "../../../packages/cli/src/lib/agent-setup-hint.ts",
      ),
      "utf8",
    );
    expect(cli).toContain(AGENT_SETUP_COMMAND);
    expect(AGENT_SETUP_HINT).toContain(AGENT_SETUP_PROMPT);
    expect(AGENT_SETUP_HINT).toContain(AGENT_SETUP_COMMAND);
  });

  it("tells agents to force the latest CLI when setup is unknown", () => {
    expect(AGENT_SETUP_FALLBACK).toBe(
      "If `setup` isn't a known command (an older cached or release-age-gated version), run `npx -y assistant-ui@latest setup` instead.",
    );
    expect(AGENT_SETUP_HINT.endsWith(AGENT_SETUP_FALLBACK)).toBe(true);
  });

  it("tells agents the older prompt starts the same setup", () => {
    expect(LEGACY_AGENT_SETUP_PROMPTS).toContain("set up assistant-ui");
    for (const legacy of LEGACY_AGENT_SETUP_PROMPTS)
      expect(AGENT_SETUP_HINT).toContain(`"${legacy}"`);
  });

  it("matches the prompt the setup app and the CLI show", () => {
    const read = (file: string) =>
      readFileSync(path.resolve(__dirname, "../../..", file), "utf8");
    expect(read("apps/setup/lib/config.ts")).toContain(
      `"${AGENT_SETUP_PROMPT}"`,
    );
    expect(read("packages/cli/src/lib/setup-session.ts")).toContain(
      `"${AGENT_SETUP_PROMPT}"`,
    );
  });
});
