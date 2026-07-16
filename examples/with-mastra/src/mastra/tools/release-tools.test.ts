import { describe, expect, it } from "vitest";
import { assessRolloutRisk, draftReleaseBrief } from "./release-tools";

describe("release tools", () => {
  it("builds a release brief from validated tool input", async () => {
    const result = await draftReleaseBrief.execute!(
      {
        change: "Persist Mastra threads.",
        audience: "developers",
      },
      undefined as never,
    );

    expect(result).toEqual({
      headline: "Persist Mastra threads",
      audience: "developers",
      sections: ["What changed", "Why it matters", "Upgrade notes"],
    });
  });

  it("uses persistence and rollback inputs to classify risk", async () => {
    await expect(
      assessRolloutRisk.execute!(
        {
          change: "Migrate stored messages",
          touchesPersistence: true,
          hasRollback: false,
        },
        undefined as never,
      ),
    ).resolves.toEqual({
      level: "high",
      checks: [
        "canary deployment",
        "error-rate alert",
        "owner sign-off",
        "backup and restore verification",
        "forward-fix runbook",
      ],
    });
  });
});
