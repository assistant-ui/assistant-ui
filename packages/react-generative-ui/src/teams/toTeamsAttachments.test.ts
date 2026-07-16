import { describe, expect, it } from "vitest";
import { toTeamsAttachments } from "./toTeamsAttachments";
import { PAYLOAD_SOFT_CAP } from "./constants";

describe("toTeamsAttachments payload budget", () => {
  it("warns on the aggregate carousel size even when no single card exceeds the soft cap", () => {
    const value = "x".repeat(45000);
    const { attachments, warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: [
        { $type: "Card", title: "A", children: { $type: "Markdown", value } },
        { $type: "Card", title: "B", children: { $type: "Markdown", value } },
      ],
    });
    for (const attachment of attachments) {
      expect(JSON.stringify(attachment.content).length).toBeLessThanOrEqual(
        PAYLOAD_SOFT_CAP,
      );
    }
    expect(
      warnings.some(
        (warning) => warning.code === "clamped" && warning.component === "Root",
      ),
    ).toBe(false);
    expect(warnings).toContainEqual(
      expect.objectContaining({ code: "clamped", component: "Carousel" }),
    );
  });
});
