// @vitest-environment jsdom
import { act } from "react";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Spec } from "generative-frame/spec";
import {
  cleanupSpecs,
  renderReactSpec,
  renderVueSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

const one = (type: string, props: Record<string, unknown>): Spec =>
  spec({ main: { type, props } });

describe("Citation in Vue", () => {
  it("renders numeric Citation text like React", () => {
    const input = one("Citation", { title: 42, source: 7, snippet: 9 });
    const react = renderReactSpec(input);
    const vue = renderVueSpec(input);
    expect(vue.markup()).toBe(react.markup());
    expect(vue.container.textContent).toBe("7429");
  });

  it.each([
    { title: "Guide", url: "https://www.example.com/path", snippet: "Excerpt" },
    { title: "Report", url: "http://example.com", source: "Publisher" },
    { title: "Local", url: "javascript:alert(1)", snippet: "No link" },
    { title: "Untitled source" },
  ])("renders citation like React for $title", (props) => {
    const input = one("Citation", props);
    const react = renderReactSpec(input);
    const vue = renderVueSpec(input);
    expect(vue.markup()).toBe(react.markup());
    expect(
      vue.container.querySelector('[data-aui="citation-title"]')?.tagName,
    ).toBe(props.url?.startsWith("http") ? "A" : "DIV");
  });
});

const points = [
  { label: "Mon", value: 10 },
  { label: "Tue", value: 20 },
];
const mixed = [
  { label: "Loss", value: -10 },
  { label: "Gain", value: 10 },
];
const series = [
  { label: "Revenue", color: "white", data: points },
  { label: "Cost", color: "alpha-70", data: [{ value: 4 }, { value: 8 }] },
];

describe("data vocabulary in Vue", () => {
  it.each<[string, Spec]>([
    [
      "plain table",
      one("Table", {
        columns: [{ label: "Name" }, { label: "Age" }],
        rows: [
          ["Ada", 36],
          ["Bob", 24],
        ],
      }),
    ],
    ["rows only", one("Table", { rows: [["only"]] })],
    ["empty table", one("Table", {})],
    [
      "formatted table",
      one("Table", {
        columns: [
          { label: "Number", format: { kind: "number", decimals: 1 } },
          {
            label: "Revenue",
            format: { kind: "currency", currency: "USD", decimals: 2 },
          },
          { label: "Share", format: { kind: "percent", decimals: 0 } },
          { label: "Date", format: { kind: "date" } },
        ],
        rows: [[1234.5, 12.4, 0.08, "2024-01-02"]],
      }),
    ],
    [
      "wrong typed formatted cells",
      one("Table", {
        columns: [
          { label: "Number", format: { kind: "number" } },
          { label: "Date", format: { kind: "date" } },
        ],
        rows: [["not a number", "not a date"]],
      }),
    ],
    [
      "sortable table",
      one("Table", {
        sortable: true,
        columns: [{ label: "Name" }],
        rows: [["Ada"], ["Bob"]],
      }),
    ],
    ["markdown", one("Markdown", { value: "# hi" })],
    ["bar", one("Chart", { variant: "bar", data: points, color: "white" })],
    ["line", one("Chart", { variant: "line", data: points })],
    ["sparkline", one("Chart", { variant: "sparkline", data: points })],
    [
      "line single point",
      one("Chart", { variant: "line", data: [{ value: 2 }] }),
    ],
    [
      "sparkline single point",
      one("Chart", { variant: "sparkline", data: [{ value: 2 }] }),
    ],
    ["empty chart", one("Chart", { variant: "bar", data: [] })],
    ["missing chart data", one("Chart", { variant: "line" })],
    ["mixed sign bar", one("Chart", { variant: "bar", data: mixed })],
    ["mixed sign line", one("Chart", { variant: "line", data: mixed })],
    [
      "all zero",
      one("Chart", { variant: "bar", data: [{ value: 0 }, { value: 0 }] }),
    ],
    ["bar series", one("Chart", { variant: "bar", series })],
    [
      "empty series fallback",
      one("Chart", { variant: "line", series: [], data: points }),
    ],
    [
      "series precedence",
      one("Chart", { variant: "line", data: points, series }),
    ],
    [
      "uneven series",
      one("Chart", {
        variant: "bar",
        series: [series[0], { data: [{ value: 2 }] }],
      }),
    ],
    ["stacked bars", one("Chart", { variant: "bar", stacked: true, series })],
    ["overlaid bars", one("Chart", { variant: "bar", stacked: false, series })],
    [
      "mixed stacked bars",
      one("Chart", {
        variant: "bar",
        stacked: true,
        series: [{ data: mixed }, { data: mixed }],
      }),
    ],
    [
      "axis stacked bars",
      one("Chart", {
        variant: "bar",
        stacked: true,
        showAxis: true,
        series: [
          { data: [{ value: 50 }] },
          { data: [{ value: 30 }] },
          { data: [{ value: 25 }] },
        ],
      }),
    ],
    ["area", one("Chart", { variant: "area", data: points })],
    ["mixed area", one("Chart", { variant: "area", data: mixed })],
    [
      "area single point",
      one("Chart", { variant: "area", data: [{ value: 20 }] }),
    ],
    ["empty area", one("Chart", { variant: "area", data: [] })],
    ["area series", one("Chart", { variant: "area", series })],
    ["stacked areas", one("Chart", { variant: "area", stacked: true, series })],
    [
      "mixed stacked areas",
      one("Chart", {
        variant: "area",
        stacked: true,
        series: [{ data: mixed }, { data: mixed }],
      }),
    ],
    [
      "axis stacked areas",
      one("Chart", {
        variant: "area",
        stacked: true,
        showAxis: true,
        series: [
          { data: [{ value: 60 }, { value: 60 }] },
          { data: [{ value: 60 }, { value: 60 }] },
        ],
      }),
    ],
    [
      "axis ticks",
      one("Chart", { variant: "bar", showAxis: true, data: [{ value: 42 }] }),
    ],
    [
      "axis crossing zero",
      one("Chart", { variant: "line", showAxis: true, data: mixed }),
    ],
    [
      "axis x labels",
      one("Chart", { variant: "line", showAxis: true, data: points }),
    ],
    ["legend", one("Chart", { variant: "line", showLegend: true, series })],
    [
      "single legend",
      one("Chart", {
        variant: "bar",
        color: "white",
        showLegend: true,
        data: points,
      }),
    ],
    [
      "unnamed legend",
      one("Chart", {
        variant: "line",
        showLegend: true,
        series: [{ data: points }],
      }),
    ],
    [
      "legend and axis",
      one("Chart", {
        variant: "bar",
        showLegend: true,
        showAxis: true,
        series,
      }),
    ],
    [
      "line ignores stacking",
      one("Chart", { variant: "line", stacked: true, series }),
    ],
    [
      "sparkline ignores stacking",
      one("Chart", { variant: "sparkline", stacked: true, series }),
    ],
    [
      "palette wraps",
      one("Chart", {
        variant: "bar",
        showLegend: true,
        series: Array.from({ length: 6 }, (_, i) => ({
          label: `S${i}`,
          data: [{ value: i + 1 }],
        })),
      }),
    ],
  ])("renders %s like React", (_name, input) => {
    const vue = renderVueSpec(input);
    const react = renderReactSpec(input);
    expect(vue.markup()).toBe(react.markup());
    expect(vue.markup()).toContain('data-aui="');
  });

  it("sorts through ascending, descending, and source order like React", async () => {
    const input = one("Table", {
      sortable: true,
      columns: [
        { label: "Name" },
        { label: "Score", format: { kind: "number" } },
      ],
      rows: [
        ["Item 10", 2],
        ["Item 2", 10],
        ["Item 1", 1],
      ],
    });
    const handler = vi.fn();
    const vue = renderVueSpec(input, { unused: handler });
    const react = renderReactSpec(input, { unused: handler });
    expect(vue.markup()).toBe(react.markup());
    for (const column of [1, 1, 1, 0]) {
      await act(async () =>
        react.container
          .querySelectorAll("th button")
          [column]!.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
      vue.container
        .querySelectorAll("th button")
        [column]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();
      expect(vue.markup()).toBe(react.markup());
      expect(vue.state.getState()).toEqual(react.state.getState());
      expect(handler).not.toHaveBeenCalled();
    }
  });

  it("forgets the sort when sortable turns off like React", async () => {
    const table = (sortable: boolean) =>
      one("Table", {
        sortable,
        columns: [{ label: "Name" }],
        rows: [["b"], ["a"]],
      });
    const vue = renderVueSpec(table(true));
    const react = renderReactSpec(table(true));
    await act(async () =>
      react.container.querySelector<HTMLButtonElement>("th button")!.click(),
    );
    vue.container.querySelector<HTMLButtonElement>("th button")!.click();
    await nextTick();
    expect(vue.markup()).toContain('aria-sort="ascending"');
    for (const sortable of [false, true]) {
      await react.update(table(sortable));
      await vue.update(table(sortable));
      expect(vue.markup()).toBe(react.markup());
    }
    expect(vue.markup()).not.toContain('aria-sort="ascending"');
  });
});
