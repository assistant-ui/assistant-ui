import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackageDirectory, type DirectoryRow } from "./package-directory";

const rows: DirectoryRow[] = [
  ["@assistant-ui/react", false],
  ["assistant-stream", false],
  ["@assistant-ui/react-hook-form", true],
].map(([name, deprecated]) => ({
  name: name as string,
  description: "",
  category: "core",
  deprecated: deprecated as boolean,
  weekly: null,
  series: [],
  momLabel: null,
  momTone: "flat",
}));
const liveRows = rows.filter((row) => !row.deprecated).length;

const render = (
  concentration: Parameters<typeof PackageDirectory>[0]["concentration"],
) =>
  renderToString(
    <PackageDirectory
      categories={[
        { key: "core", label: "Core", description: "", count: rows.length },
      ]}
      rows={rows}
      concentration={concentration}
    />,
  );

const statSlots = (html: string) => html.split("0 /wk").length - 1;
const hiddenBars = (html: string) =>
  html.match(/data-slot="skeleton" class="[^"]*\binvisible\b/g)?.length ?? 0;

describe("PackageDirectory", () => {
  it("lays out an unanswered npm read like the loading shell", () => {
    const loading = render(null);
    const unavailable = render({
      leaders: [],
      tailNames: [],
      tailCount: 0,
      tailWeekly: 0,
      total: 0,
    });

    expect(loading).toContain('aria-busy="true"');
    expect(unavailable).not.toContain('aria-busy="true"');
    expect(unavailable).toContain("unavailable right now");
    expect(hiddenBars(loading)).toBe(0);
    expect(hiddenBars(unavailable)).toBe(2);
    expect(statSlots(loading)).toBe(liveRows);
    expect(statSlots(unavailable)).toBe(liveRows);
  });
});
