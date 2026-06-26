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

  it("Chart renders a placeholder div with variant/color/data hooks", () => {
    const html = render({
      $type: "Chart",
      variant: "bar",
      data: [{ label: "a", value: 1 }],
      color: "#f00",
    });
    expect(html).toContain('data-aui="chart"');
    expect(html).toContain('data-aui-variant="bar"');
    expect(html).toContain('data-aui-color="#f00"');
    expect(html).toContain("&quot;value&quot;:1");
  });
});
