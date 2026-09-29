// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TimelineEntry } from "./timeline";

afterEach(cleanup);

describe("TimelineEntry", () => {
  it("shows a long detail truncated in the middle, clamped to two lines, with the full text as its title", () => {
    const detail = `${"The route file at app/api/chat/route.ts streams model output through the AI SDK, ".repeat(3)}and returns a data stream response the Thread component consumes.`;
    render(
      <ol>
        <TimelineEntry status="pending" title="Add the route" detail={detail} />
      </ol>,
    );
    const paragraph = screen.getByTitle(detail);
    expect(paragraph.textContent).toContain("…");
    expect(paragraph.textContent!.length).toBeLessThanOrEqual(140);
    expect(paragraph.textContent!.startsWith("The route file at")).toBe(true);
    expect(paragraph.textContent!.endsWith("component consumes.")).toBe(true);
    expect(paragraph.className).toContain("line-clamp-2");
  });

  it("leaves a short detail untouched", () => {
    render(
      <ol>
        <TimelineEntry status="done" title="Install" detail="pnpm add ai" />
      </ol>,
    );
    expect(screen.getByTitle("pnpm add ai").textContent).toBe("pnpm add ai");
  });
});
