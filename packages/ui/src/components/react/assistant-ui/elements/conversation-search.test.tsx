import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConversationSearch, type SearchHit } from "./conversation-search";

afterEach(cleanup);

const HITS: readonly SearchHit[] = [10, 50, 90].map((position) => ({
  id: `hit-${position}`,
  before: "the ",
  match: "rail",
  after: " ticks",
  position,
}));

describe("ConversationSearch", () => {
  it("draws the hit ticks in system colors under forced colors", () => {
    const { container } = render(
      <ConversationSearch query="rail" hits={HITS} activeIndex={1} />,
    );

    const ticks = Array.from(
      container.querySelectorAll<HTMLElement>('span[style*="top"]'),
      (tick) => tick.className.split(/\s+/),
    );
    expect(ticks).toHaveLength(3);
    expect(ticks[1]).toContain("forced-colors:bg-[Highlight]");
    for (const tick of [ticks[0], ticks[2]]) {
      expect(tick).toContain("forced-colors:bg-[CanvasText]");
      expect(tick).not.toContain("forced-colors:bg-[Highlight]");
    }
  });
});
