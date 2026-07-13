import { describe, it, expect } from "vitest";
import { generativeUIToJSX } from "./generativeUIToJSX";

describe("generativeUIToJSX", () => {
  it("renders a leaf element as a self-closing tag", () => {
    expect(generativeUIToJSX({ $type: "Weather", id: "5d99d2e9" })).toBe(
      '<Weather id="5d99d2e9" />',
    );
  });

  it("renders an element with no props", () => {
    expect(generativeUIToJSX({ $type: "Divider" })).toBe("<Divider />");
  });

  it("formats prop types as JSX attributes", () => {
    expect(
      generativeUIToJSX({
        $type: "Box",
        label: "hi",
        count: 3,
        open: true,
        hidden: false,
        data: { a: 1 },
      }),
    ).toBe('<Box label="hi" count={3} open hidden={false} data={{"a":1}} />');
  });

  it("uses the expression form for strings with quotes", () => {
    expect(generativeUIToJSX({ $type: "Note", text: 'say "hi"' })).toBe(
      '<Note text={"say \\"hi\\""} />',
    );
  });

  it("emits a model-provided $key as the JSX key attribute", () => {
    expect(
      generativeUIToJSX({ $type: "Text", $key: "1:Text", children: "hello" }),
    ).toBe('<Text key="1:Text">hello</Text>');
    expect(generativeUIToJSX({ $type: "Item", $key: 2 })).toBe(
      "<Item key={2} />",
    );
  });

  it("renders string children between tags", () => {
    expect(
      generativeUIToJSX({ $type: "Text", tone: "muted", children: "hello" }),
    ).toBe('<Text tone="muted">hello</Text>');
  });

  it("renders nested and arrayed children recursively", () => {
    expect(
      generativeUIToJSX({
        $type: "Card",
        title: "Hi",
        children: [
          { $type: "Text", children: "a" },
          { $type: "Text", tone: "muted", children: "b" },
        ],
      }),
    ).toBe('<Card title="Hi"><Text>a</Text><Text tone="muted">b</Text></Card>');
  });

  it("bounds deeply nested trees instead of overflowing the stack", () => {
    let node: any = { $type: "Text", children: "deep" };
    for (let i = 0; i < 5000; i++) node = { $type: "Card", children: node };
    expect(() => generativeUIToJSX(node)).not.toThrow();
  });

  it("returns empty string for non-renderable nodes", () => {
    expect(generativeUIToJSX(null)).toBe("");
    expect(generativeUIToJSX(true)).toBe("");
    expect(generativeUIToJSX({})).toBe(""); // no $type yet (still streaming)
  });
});
