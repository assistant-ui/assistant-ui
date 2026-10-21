import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { numberRoll } = vi.hoisted(() => ({
  numberRoll: vi.fn<(props: { value: number }) => ReactNode>(),
}));

vi.mock("@/components/ui/number-roll", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/ui/number-roll")>()),
  NumberRoll: ({ value }: { value: number }) => numberRoll({ value }),
}));

import { WeeklyDownloadsStat } from "./weekly-downloads-stat";

numberRoll.mockImplementation(({ value }) => <span>{value}</span>);

describe("WeeklyDownloadsStat", () => {
  it("shows a measured zero without offering an unavailable mode", () => {
    const markup = renderToStaticMarkup(
      <WeeklyDownloadsStat
        flagship={{ value: 0, caption: "@assistant-ui/react" }}
        total={null}
      />,
    );

    expect(markup).toContain("<span>0</span>");
    expect(markup).toContain("@assistant-ui/react");
    expect(markup).not.toContain("—");
    expect(markup).not.toContain("<button");
  });

  it("renders nothing when neither weekly mode was read", () => {
    const markup = renderToStaticMarkup(
      <WeeklyDownloadsStat flagship={null} total={null} />,
    );

    expect(markup).toBe("");
  });

  it("offers the mode toggle when both reads are available", () => {
    const markup = renderToStaticMarkup(
      <WeeklyDownloadsStat
        flagship={{ value: 12, caption: "@assistant-ui/react" }}
        total={{ value: 34, caption: "across all packages" }}
      />,
    );

    expect(markup).toContain("<button");
    expect(markup).toContain("@assistant-ui/react");
  });
});
