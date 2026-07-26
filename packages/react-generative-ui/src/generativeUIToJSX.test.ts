import { describe, it, expect } from "vitest";
import { generativeUIToJSX } from "./generativeUIToJSX";

describe("generativeUIToJSX pretty depth bound", () => {
  it("tolerates children nested in arrays beyond the depth bound", () => {
    let node: unknown = { $type: "Text", value: "leaf" };
    for (let i = 0; i < 100; i++) node = [node];
    expect(() =>
      generativeUIToJSX({ $type: "Card", children: node }, { pretty: true }),
    ).not.toThrow();
  });
});

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

describe("generativeUIToJSX with escape: true", () => {
  it("escapes a string child containing HTML-like tags", () => {
    expect(
      generativeUIToJSX(
        { $type: "Text", children: "<script>alert(1)</script>" },
        { escape: true },
      ),
    ).toBe('<Text>{"<script>alert(1)</script>"}</Text>');
  });

  it("escapes a string child containing braces", () => {
    expect(
      generativeUIToJSX(
        { $type: "Text", children: "a {b} c" },
        { escape: true },
      ),
    ).toBe('<Text>{"a {b} c"}</Text>');
  });

  it("escapes a string child containing an ampersand", () => {
    expect(
      generativeUIToJSX({ $type: "Text", children: "Q&A" }, { escape: true }),
    ).toBe('<Text>{"Q&A"}</Text>');
  });

  it("leaves a plain text child verbatim", () => {
    expect(
      generativeUIToJSX(
        { $type: "Text", children: "hello world" },
        { escape: true },
      ),
    ).toBe("<Text>hello world</Text>");
  });

  it("leaves numbers, arrays, and nested objects unaffected", () => {
    expect(
      generativeUIToJSX(
        {
          $type: "Card",
          children: [
            { $type: "Text", children: 42 },
            { $type: "Text", data: { a: 1 }, children: "plain" },
          ],
        },
        { escape: true },
      ),
    ).toBe('<Card><Text>42</Text><Text data={{"a":1}}>plain</Text></Card>');
  });
});

describe("generativeUIToJSX with pretty: true", () => {
  const nestedCard = {
    $type: "Card",
    title: "Hi",
    children: [
      { $type: "Text", children: "a" },
      {
        $type: "Box",
        children: { $type: "Text", tone: "muted", children: "b" },
      },
    ],
  };

  it("keeps default output single-line and byte-identical without pretty", () => {
    expect(generativeUIToJSX(nestedCard)).toBe(
      '<Card title="Hi"><Text>a</Text><Box><Text tone="muted">b</Text></Box></Card>',
    );
  });

  it("block-nests elements with two-space grandchild indentation", () => {
    expect(generativeUIToJSX(nestedCard, { pretty: true })).toBe(
      [
        '<Card title="Hi">',
        "  <Text>a</Text>",
        "  <Box>",
        '    <Text tone="muted">b</Text>',
        "  </Box>",
        "</Card>",
      ].join("\n"),
    );
  });

  it("keeps elements with only string or number children on one line", () => {
    expect(
      generativeUIToJSX(
        { $type: "Text", tone: "muted", children: "hello" },
        { pretty: true },
      ),
    ).toBe('<Text tone="muted">hello</Text>');
    expect(
      generativeUIToJSX({ $type: "Text", children: 42 }, { pretty: true }),
    ).toBe("<Text>42</Text>");
    expect(generativeUIToJSX({ $type: "Divider" }, { pretty: true })).toBe(
      "<Divider />",
    );
  });

  it("renders a root-level array with each item on its own line", () => {
    expect(
      generativeUIToJSX(
        [
          { $type: "Text", children: "a" },
          { $type: "Text", children: "b" },
        ],
        { pretty: true },
      ),
    ).toBe("<Text>a</Text>\n<Text>b</Text>");
  });

  it("puts mixed text and element children each on their own line", () => {
    expect(
      generativeUIToJSX(
        {
          $type: "Card",
          children: ["hello", { $type: "Text", children: "world" }, 7],
        },
        { pretty: true },
      ),
    ).toBe(
      ["<Card>", "  hello", "  <Text>world</Text>", "  7", "</Card>"].join(
        "\n",
      ),
    );
  });

  it("skips non-renderable children without blank lines", () => {
    expect(
      generativeUIToJSX(
        {
          $type: "Card",
          children: [
            null,
            { $type: "Text", children: "a" },
            false,
            { $type: "Text", children: "b" },
            true,
          ],
        },
        { pretty: true },
      ),
    ).toBe(
      ["<Card>", "  <Text>a</Text>", "  <Text>b</Text>", "</Card>"].join("\n"),
    );
  });

  it("composes escape with pretty", () => {
    expect(
      generativeUIToJSX(
        {
          $type: "Card",
          children: {
            $type: "Text",
            children: "<script>alert(1)</script>",
          },
        },
        { escape: true, pretty: true },
      ),
    ).toBe(
      [
        "<Card>",
        '  <Text>{"<script>alert(1)</script>"}</Text>',
        "</Card>",
      ].join("\n"),
    );
  });
});
