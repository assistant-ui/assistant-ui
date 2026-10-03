import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PackageDirectory, type DirectoryRow } from "./package-directory";

const rows: DirectoryRow[] = ["@assistant-ui/react", "assistant-stream"].map(
  (name) => ({
    name,
    description: "",
    category: "core",
    deprecated: false,
    weekly: null,
    series: [],
    momLabel: null,
    momTone: "flat",
  }),
);

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
    expect(unavailable).toContain("Share of weekly downloads");
    expect(statSlots(loading)).toBe(rows.length);
    expect(statSlots(unavailable)).toBe(rows.length);
  });
});
