import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderGenerativeUI } from "../renderGenerativeUI";
import { dataVocabulary } from "./data";

const render = (node: unknown) =>
  renderToStaticMarkup(<>{renderGenerativeUI(node, dataVocabulary)}</>);

describe("dataVocabulary", () => {
  it("Table renders columns and rows", () => {
    const html = render({
      $type: "Table",
      columns: [{ label: "Name" }, { label: "Age" }],
      rows: [
        ["Ada", 36],
        ["Bob", 24],
      ],
    });
    expect(html).toContain('data-aui="table"');
    expect(html).toContain('<th data-aui="table-col">Name</th>');
    expect(html).toContain('<th data-aui="table-col">Age</th>');
    expect(html).toContain("<td>Ada</td>");
    expect(html).toContain("<td>36</td>");
    expect(html).toContain("<td>Bob</td>");
    expect(html).toContain("<td>24</td>");
  });

  it("Table renders with only rows (no header)", () => {
    const html = render({ $type: "Table", rows: [["only"]] });
    expect(html).toContain('data-aui="table"');
    expect(html).not.toContain("<thead>");
    expect(html).toContain("<td>only</td>");
  });

  it("Markdown renders the value in a div", () => {
    expect(render({ $type: "Markdown", value: "# hi" })).toBe(
      '<div data-aui="markdown"># hi</div>',
    );
  });

  it("Markdown renders partial value while streaming", () => {
    expect(
      renderToStaticMarkup(
        <>
          {renderGenerativeUI(
            { $type: "Markdown", value: "partial" },
            dataVocabulary,
            { status: "streaming" },
          )}
        </>,
      ),
    ).toBe('<div data-aui="markdown">partial</div>');
  });

  it("Chart bar variant renders one rect per data point", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 1 }, { value: 2 }, { value: 3 }],
      color: "#f00",
    });
    expect(html).toContain('data-aui="chart"');
    expect(html).toContain('data-aui-variant="bar"');
    expect(html).toContain('data-aui-color="#f00"');
    expect((html.match(/<rect/g) ?? []).length).toBe(3);
    expect(html).not.toContain("<polyline");
    expect(html).not.toContain("data-aui-data");
  });

  it("Chart line variant renders a single polyline through all points", () => {
    const html = render({
      $type: "Chart",
      variant: "line",
      data: [{ value: 0 }, { value: 20 }, { value: 40 }],
    });
    expect((html.match(/<polyline/g) ?? []).length).toBe(1);
    expect(html).not.toContain("<rect");
    expect(html).toContain('points="0,40 50,20 100,0"');
  });

  it("Chart sparkline variant is structurally identical to line, differentiated by the variant attribute", () => {
    const html = render({
      $type: "Chart",
      variant: "sparkline",
      data: [{ value: 0 }, { value: 20 }, { value: 40 }],
    });
    expect((html.match(/<polyline/g) ?? []).length).toBe(1);
    expect(html).toContain('data-aui-variant="sparkline"');
    expect(html).toContain('points="0,40 50,20 100,0"');
  });

  it("Chart renders an aria-label describing the variant and point count", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 1 }, { value: 2 }],
    });
    expect(html).toContain('aria-label="bar chart with 2 data points"');
  });

  it("Chart with empty data renders an empty svg without throwing", () => {
    expect(() =>
      render({ $type: "Chart", variant: "bar", data: [] }),
    ).not.toThrow();
    const html = render({ $type: "Chart", variant: "line", data: [] });
    expect(html).toContain('data-aui="chart"');
    expect(html).not.toContain("<rect");
    expect(html).not.toContain("<polyline");
    expect(html).toContain('aria-label="line chart with 0 data points"');
  });

  it("Chart with missing data renders an empty svg without throwing", () => {
    expect(() => render({ $type: "Chart", variant: "bar" })).not.toThrow();
    const html = render({ $type: "Chart", variant: "bar" });
    expect(html).toContain('data-aui="chart"');
    expect(html).not.toContain("<rect");
  });

  it("Chart clamps negative and non-finite values to 0", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: -5 }, { value: Number.NaN }, { value: 10 }],
    });
    expect((html.match(/<rect/g) ?? []).length).toBe(3);
    expect(html).toContain('height="0"');
    expect(html).toContain('height="40"');
  });

  it("Chart with all-zero data renders flat baseline marks", () => {
    const barHtml = render({
      $type: "Chart",
      variant: "bar",
      data: [{ value: 0 }, { value: 0 }],
    });
    expect((barHtml.match(/height="0"/g) ?? []).length).toBe(2);

    const lineHtml = render({
      $type: "Chart",
      variant: "line",
      data: [{ value: 0 }, { value: 0 }, { value: 0 }],
    });
    expect(lineHtml).toContain('points="0,40 50,40 100,40"');
  });
});
