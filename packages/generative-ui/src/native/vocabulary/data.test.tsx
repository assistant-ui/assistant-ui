// @vitest-environment jsdom
import { Linking } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  byRole,
  cleanupSpecs,
  press,
  renderNativeSpec,
  renderWebSpec,
  spec,
} from "../testUtils";

afterEach(cleanupSpecs);

const bars = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-testid="chart-bar"]'),
];
const rows = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[data-testid="table-row"]')].map(
    (row) => row.textContent,
  );

const table = (sortable: boolean) =>
  spec({
    main: {
      type: "Table",
      props: {
        sortable,
        columns: [
          { label: "Name" },
          { label: "Price", format: { kind: "currency", currency: "USD" } },
          { label: "Rate", format: { kind: "percent", decimals: 0 } },
        ],
        rows: [
          ["B", 12, 0.25],
          ["A", 3, 0.5],
          ["C", 8, 0.1],
        ],
      },
    },
  });

const chart = (props: Record<string, unknown>) =>
  spec({ main: { type: "Chart", props: { variant: "bar", ...props } } });

describe("data vocabulary on React Native", () => {
  it("renders numeric Citation text as a link", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Citation",
          props: {
            title: 0,
            url: "https://example.com",
            source: 12,
            snippet: 34,
          },
        },
      }),
    );
    expect(byRole(container, "link").textContent).toBe("12034");
  });

  it("uses unlinked Citation text to name a bound row", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["citation"],
          on: { press: { action: "open" } },
        },
        citation: {
          type: "Citation",
          props: { title: 0, source: 12, snippet: 34 },
        },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(byRole(container, "button", "12, 0, 34")).toBeTruthy();
    for (const value of ["12", "0", "34"]) {
      expect(
        [
          ...container.querySelectorAll<HTMLElement>("[aria-hidden='true']"),
        ].find((element) => element.textContent === value),
      ).toBeTruthy();
    }
  });

  it("keeps a linked Citation separate from a bound row label", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "ListView", children: ["row"] },
        row: {
          type: "ListViewItem",
          children: ["citation"],
          on: { press: { action: "open" } },
        },
        citation: {
          type: "Citation",
          props: {
            title: 0,
            url: "https://example.com",
            source: 12,
            snippet: 34,
          },
        },
      }),
      { open: vi.fn() },
      { open: { description: "Open" } },
    );
    expect(byRole(container, "link").textContent).toBe("12034");
    expect(byRole(container, "button").getAttribute("aria-label")).toBeNull();
  });

  it("renders Citation content without making a non-http URL pressable", () => {
    const input = spec({
      main: {
        type: "Citation",
        props: {
          title: "Local source",
          url: "file:///private/note",
          source: "Notebook",
          snippet: "A passage",
        },
      },
    });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    expect(native.querySelector('[role="link"]')).toBeNull();
    expect(native.textContent).toBe(web.textContent);
    expect(native.textContent).toBe("NotebookLocal sourceA passage");
    const titleOnly = renderNativeSpec(
      spec({
        main: {
          type: "Citation",
          props: { title: "Untitled source" },
        },
      }),
    ).container;
    expect(titleOnly.textContent).toBe("Untitled source");
    expect(titleOnly.querySelector('[role="link"]')).toBeNull();
  });

  it("swallows a Citation link no app can open", async () => {
    const openURL = vi
      .spyOn(Linking, "openURL")
      .mockRejectedValue(new Error("No app handles this URL"));
    try {
      const native = renderNativeSpec(
        spec({
          main: {
            type: "Citation",
            props: { title: "Reference", url: "https://example.com/a" },
          },
        }),
      ).container;
      await press(byRole(native, "link"));
      await Promise.resolve();
      expect(openURL).toHaveBeenCalledOnce();
    } finally {
      openURL.mockRestore();
    }
  });

  it.each(["http", "https"])(
    "opens a %s Citation and uses the link host when source is absent",
    async (scheme) => {
      const openURL = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
      const url = `${scheme}://www.example.com/article`;
      const input = spec({
        main: {
          type: "Citation",
          props: {
            title: "Reference",
            url,
          },
        },
      });
      const native = renderNativeSpec(input).container;
      const web = renderWebSpec(input).container;
      expect(native.textContent).toBe(web.textContent);
      expect(native.textContent).toBe("example.comReference");
      try {
        await press(byRole(native, "link"));
        expect(openURL).toHaveBeenCalledExactlyOnceWith(url);
      } finally {
        openURL.mockRestore();
      }
    },
  );

  it("formats and aligns Table cells like the web", () => {
    const native = renderNativeSpec(table(false)).container;
    const web = renderWebSpec(table(false)).container;
    const cells = [
      ...native.querySelectorAll<HTMLElement>('[data-testid="table-cell"]'),
    ];
    expect(cells.map((cell) => cell.textContent)).toEqual(
      [...web.querySelectorAll("td")].map((cell) => cell.textContent),
    );
    expect(cells.slice(0, 3).map((cell) => cell.style.textAlign)).toEqual([
      "left",
      "right",
      "right",
    ]);
    expect(getComputedStyle(cells[0]!).fontSize).toBe("14px");
    expect(cells[1]!.getAttribute("aria-label")).toBe("Price: $12.00");
  });

  it("cycles Table sorting with the web and forgets it when disabled", async () => {
    const native = renderNativeSpec(table(true));
    expect(
      getComputedStyle(byRole(native.container, "button", "Name, not sorted"))
        .minHeight,
    ).toBe("40px");
    expect(
      getComputedStyle(
        native.container.querySelector<HTMLElement>(
          '[data-testid="table-cell"]',
        )!,
      ).minHeight,
    ).not.toBe("40px");
    const web = renderWebSpec(table(true));
    for (const [previous, direction] of [
      ["not sorted", "sorted ascending"],
      ["sorted ascending", "sorted descending"],
      ["sorted descending", "not sorted"],
    ]) {
      await press(byRole(native.container, "button", `Name, ${previous}`));
      await press(
        web.container.querySelector<HTMLButtonElement>(
          '[data-aui="table-sort"]',
        )!,
      );
      expect(rows(native.container)).toEqual(
        [...web.container.querySelectorAll("tbody tr")].map(
          (row) => row.textContent,
        ),
      );
      expect(
        byRole(native.container, "button", `Name, ${direction}`).textContent,
      ).toBe(
        direction === "sorted ascending"
          ? "Name↑"
          : direction === "sorted descending"
            ? "Name↓"
            : "Name",
      );
    }
    await press(byRole(native.container, "button", "Name, not sorted"));
    await native.update(table(false));
    expect(rows(native.container)).toEqual([
      "B$12.0025%",
      "A$3.0050%",
      "C$8.0010%",
    ]);
    await native.update(table(true));
    expect(
      byRole(native.container, "button", "Name, not sorted").textContent,
    ).toBe("Name");
  });

  it("renders Markdown source as plain text", () => {
    const input = spec({
      main: { type: "Markdown", props: { value: "# Title\n**plain**" } },
    });
    const native = renderNativeSpec(input).container;
    expect(native.textContent).toContain("# Title\n**plain**");
    expect(native.textContent).toBe(renderWebSpec(input).container.textContent);
  });

  it("places a Markdown Button outside its source Text", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Markdown",
          props: { value: "Source" },
          children: ["button"],
        },
        button: { type: "Button", props: { label: "Open" } },
      }),
    );
    const source = container.querySelector("[dir]")!;
    const button = byRole(container, "button", "Open");
    expect(source.textContent).toBe("Source");
    expect(source.contains(button)).toBe(false);
  });

  it("draws proportional positive and negative bars with matching tooltips", () => {
    const input = chart({
      data: [
        { label: "A", value: 10 },
        { label: "B", value: -5 },
        { value: 5 },
      ],
    });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    const marks = bars(native);
    expect(marks).toHaveLength(3);
    expect(marks.map((bar) => bar.getAttribute("aria-label"))).toEqual(
      [...web.querySelectorAll("rect title")].map((title) => title.textContent),
    );
    const heights = marks.map((bar) => Number.parseFloat(bar.style.height));
    expect(heights[0]).toBeCloseTo(32);
    expect(heights[1]).toBeCloseTo(16);
    expect(heights[2]).toBeCloseTo(16);
    expect(Number.parseFloat(marks[1]!.style.top)).toBeGreaterThan(
      Number.parseFloat(marks[0]!.style.top),
    );
    expect(
      native.querySelector('[data-testid="chart-baseline"]'),
    ).not.toBeNull();
  });

  it("stacks series and shows named legend, axis ticks, and web tooltip text", () => {
    const input = chart({
      stacked: true,
      showAxis: true,
      showLegend: true,
      series: [
        {
          label: "East",
          data: [
            { label: "Q1", value: 4 },
            { label: "Q2", value: -2 },
          ],
        },
        {
          label: "West",
          data: [
            { label: "Q1", value: 6 },
            { label: "Q2", value: -3 },
          ],
        },
      ],
    });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    const marks = bars(native);
    expect(marks).toHaveLength(4);
    expect(marks.map((bar) => bar.getAttribute("aria-label"))).toEqual(
      [...web.querySelectorAll("rect title")].map((title) => title.textContent),
    );
    expect(Number.parseFloat(marks[1]!.style.top)).toBeLessThan(
      Number.parseFloat(marks[3]!.style.top),
    );
    expect(
      [...native.querySelectorAll('[data-testid="chart-tick"]')].map(
        (tick) => tick.textContent,
      ),
    ).toEqual(
      [...web.querySelectorAll('[data-aui="chart-ticks"] > *')].map(
        (tick) => tick.textContent,
      ),
    );
    expect(native.textContent).toContain("East");
    expect(native.textContent).toContain("West");
    expect(native.textContent).toContain("Q1");
    const labels = [
      ...native.querySelectorAll<HTMLElement>('[data-testid="chart-x-label"]'),
    ];
    expect(labels.map((label) => label.textContent)).toEqual(["Q1", "Q2"]);
    expect(labels[0]!.parentElement!.parentElement).toBe(
      marks[0]!.parentElement!.parentElement,
    );
    expect(
      labels.every(
        (label) =>
          getComputedStyle(label).flexGrow === "1" &&
          label.style.textAlign === "center",
      ),
    ).toBe(true);
  });

  it("keeps a sparkline compact without axis or legend", () => {
    const native = renderNativeSpec(
      chart({
        variant: "sparkline",
        showAxis: true,
        showLegend: true,
        data: [{ value: 1 }, { value: 2 }],
      }),
    ).container;
    expect(bars(native)).toHaveLength(2);
    expect(native.querySelector('[data-testid="chart-tick"]')).toBeNull();
    expect(native.querySelector('[data-testid="chart-legend"]')).toBeNull();
  });

  it.each([
    ["emphasis", "rgb(10, 10, 10)"],
    ["secondary", "rgba(10, 10, 10, 0.62)"],
    ["alpha-70", "rgba(10, 10, 10, 0.7)"],
    ["white", "rgb(255, 255, 255)"],
    ["white-70", "rgba(255, 255, 255, 0.7)"],
    ["white-50", "rgba(255, 255, 255, 0.5)"],
  ])("maps the %s chart color token", (color, expected) => {
    const native = renderNativeSpec(
      chart({ color, data: [{ value: 1 }] }),
    ).container;
    expect(bars(native)[0]?.style.backgroundColor).toBe(expected);
  });
  it.each(["line", "area"])("draws %s points as accessible bars", (variant) => {
    const input = chart({
      variant,
      data: [{ label: "First", value: 2 }, { value: -1 }],
    });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    expect(bars(native)).toHaveLength(2);
    expect(bars(native).map((bar) => bar.getAttribute("aria-label"))).toEqual(
      [...web.querySelectorAll('[data-aui="chart-point"] title')].map(
        (title) => title.textContent,
      ),
    );
  });

  it("places unstacked series side by side with palette colors and named legend", () => {
    const native = renderNativeSpec(
      chart({
        showLegend: true,
        series: [
          { label: "East", data: [{ value: 2 }] },
          { label: "West", data: [{ value: 3 }] },
        ],
      }),
    ).container;
    const marks = bars(native);
    expect(marks).toHaveLength(2);
    expect(Number.parseFloat(marks[0]!.style.left)).toBeLessThan(
      Number.parseFloat(marks[1]!.style.left),
    );
    expect(marks.map((bar) => bar.style.backgroundColor)).toEqual([
      "rgb(245, 73, 0)",
      "rgb(0, 150, 137)",
    ]);
    expect(
      native.querySelector('[data-testid="chart-legend"]')?.textContent,
    ).toBe("EastWest");
  });

  it("hides named series when showLegend is absent", () => {
    const input = chart({ series: [{ label: "East", data: [{ value: 2 }] }] });
    const native = renderNativeSpec(input).container;
    const web = renderWebSpec(input).container;
    expect(native.querySelector('[data-testid="chart-legend"]')).toBeNull();
    expect(web.querySelector('[data-aui="chart-legend"]')).toBeNull();
  });
});
