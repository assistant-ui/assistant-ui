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
        (warning) =>
          warning.code === "advisory" && warning.component === "Root",
      ),
    ).toBe(false);
    expect(warnings).toContainEqual(
      expect.objectContaining({
        code: "advisory",
        component: "Carousel",
        detail: expect.stringContaining(
          `over the ${PAYLOAD_SOFT_CAP}-byte soft budget`,
        ),
      }),
    );
  });
});

describe("toTeamsAttachments root carousel children", () => {
  it("reports a renderable non-card child instead of dropping it silently", () => {
    const { attachments, warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: [
        { $type: "Text", value: "lost" },
        { $type: "Card", title: "kept" },
      ],
    });
    expect(attachments).toHaveLength(1);
    expect(warnings).toContainEqual({
      code: "dropped",
      component: "Carousel",
      detail: "1 non-card child was dropped.",
    });
  });

  it("forwards a discarded child's own dropped warning", () => {
    const { warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: [{ $type: "Mystery" }, { $type: "Card", title: "kept" }],
    });
    expect(warnings).toContainEqual({
      code: "dropped",
      component: "Mystery",
      detail: "Unknown component type was dropped.",
    });
  });

  it("stays silent for a child that renders nothing anyway", () => {
    const { warnings } = toTeamsAttachments({
      $type: "Carousel",
      children: [{ $type: "Spacer" }, { $type: "Card", title: "kept" }],
    });
    expect(warnings).toEqual([]);
  });
});
