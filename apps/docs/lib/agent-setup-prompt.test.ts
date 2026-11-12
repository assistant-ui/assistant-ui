import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_SETUP_COMMAND,
  AGENT_SETUP_HINT,
  AGENT_SETUP_PROMPT,
  agentSetupPrompt,
} from "./agent-setup-prompt";

describe("agent setup prompt", () => {
  it("is the bare prompt for the default setup", () => {
    expect(AGENT_SETUP_PROMPT).toBe("set up assistant-ui");
    expect(agentSetupPrompt()).toBe(AGENT_SETUP_PROMPT);
    expect(agentSetupPrompt(["assistant-ui"])).toBe(AGENT_SETUP_PROMPT);
  });

  it("names the products of a product setup", () => {
    expect(agentSetupPrompt(["cloud"])).toBe(
      "set up assistant-ui with `npx assistant-ui@latest setup --products cloud`",
    );
  });

  it("adds notes after the prompt", () => {
    expect(agentSetupPrompt(["assistant-ui"], " Use spec mode. ")).toBe(
      "set up assistant-ui. Use spec mode.",
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
});
