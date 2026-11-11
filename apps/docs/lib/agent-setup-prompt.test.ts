import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_SETUP_HINT } from "./agent-setup-prompt";

describe("agent setup hint", () => {
  it("matches the line the CLI prints for agents", () => {
    const cli = readFileSync(
      path.resolve(
        __dirname,
        "../../../packages/cli/src/lib/agent-setup-hint.ts",
      ),
      "utf8",
    );
    expect(cli).toContain(JSON.stringify(AGENT_SETUP_HINT));
  });
});
