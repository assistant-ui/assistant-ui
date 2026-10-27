import { stripVTControlCharacters } from "node:util";
import { Box, Text } from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import {
  Markdown,
  type MarkdownComponentProps,
  type MarkdownComponents,
} from "./Markdown";

vi.hoisted(() => {
  vi.stubEnv("FORCE_COLOR", "1");
});

afterEach(cleanup);
afterAll(() => vi.unstubAllEnvs());

const frame = (text: string, components?: MarkdownComponents) =>
  stripVTControlCharacters(
    render(<Markdown text={text} final components={components} />).lastFrame()!,
  );

describe("Markdown", () => {
  test("removes a supplied OSC 8 link from rendered text", () => {
    expect(
      render(
        <Markdown
          text={"\x1b]8;;https://wrong.example\x07safe label\x1b]8;;\x07"}
          final
        />,
      ).lastFrame(),
    ).toBe("safe label");
  });

  test("keeps the text after a malformed CSI", () => {
    expect(render(<Markdown text={"a\x1b[\nb 你好"} final />).lastFrame()).toBe(
      "a\nb 你好",
    );
  });

  test("renders blocks and inline runs with one blank line between blocks", () => {
    expect(
      frame(
        '## Plan\n\nSome *em*, **strong**, ~~gone~~, `code`, a [link](https://a.dev "A") and\\\nnext\nsoft\n\n> quoted\n\n```ts title\nconst a = 1;\nconst b = 2;\n```',
      ),
    ).toBe(
      "Plan\n\nSome em, strong, gone, code, a link (https://a.dev) and\nnext\nsoft\n\n│ quoted\n\n  const a = 1;\n  const b = 2;",
    );
  });

  test.each([
    ["# Title", "\u001b[4m\u001b[1mTitle\u001b[22m\u001b[24m"],
    ["## Title", "\u001b[1mTitle\u001b[22m"],
    ["**bold**", "\u001b[1mbold\u001b[22m"],
    ["*em*", "\u001b[3mem\u001b[23m"],
    ["~~gone~~", "\u001b[9mgone\u001b[29m"],
    ["`code`", "\u001b[36mcode\u001b[39m"],
    ["```\ncode\n```", "  \u001b[32mcode\u001b[39m"],
    ["$x$", "\u001b[36mx\u001b[39m"],
  ])("applies terminal styles to %s", (text, expected) => {
    expect(render(<Markdown text={text} final />).lastFrame()).toBe(expected);
  });

  test("shows link destinations unless the label already is the URL", () => {
    expect(
      frame(
        "[go](https://a.dev) <https://b.dev> [https://c.dev](https://c.dev)",
      ),
    ).toBe("go (https://a.dev) https://b.dev https://c.dev");
    expect(render(<Markdown text="[go](/x)" final />).lastFrame()).toBe(
      "\u001b[4mgo\u001b[24m\u001b[2m (/x)\u001b[22m",
    );
  });

  test("renders images as their alt text", () => {
    expect(frame('![a cat](/cat.png "Cat") ![](/empty.png)')).toBe(
      "[image: a cat] [image: ]",
    );
  });

  test("renders tight, loose, ordered, and nested lists", () => {
    expect(frame("3. one\n4. two")).toBe("3. one\n4. two");
    expect(frame("- one\n\n- two")).toBe("• one\n\n• two");
    expect(frame("- one\n  - nested\n    2. deeper\n- two")).toBe(
      "• one\n  • nested\n    2. deeper\n• two",
    );
  });

  test("renders task markers and loose item paragraphs", () => {
    expect(frame("- [x] *done*\n- [ ] todo")).toBe("[x] done\n[ ] todo");
    expect(frame("- [x] done\n\n  more\n\n- [ ] todo")).toBe(
      "[x] done\n\n    more\n\n[ ] todo",
    );
  });

  test("passes tight list paragraphs and list items to overrides", () => {
    expect(
      frame("- one", {
        paragraph: ({ children }) => <Text>[{children}]</Text>,
        listItem: ({ children }) => (
          <Box>
            <Text>item: </Text>
            {children}
          </Box>
        ),
      }),
    ).toBe("item: [one]");
  });

  test("puts a gutter on every line of nested blockquotes", () => {
    expect(frame("> first\n> line\n>\n> > nested\n>\n> last")).toBe(
      "│ first\n│ line\n│\n│ │ nested\n│\n│ last",
    );
    expect(render(<Markdown text="> quote" final />).lastFrame()).toBe(
      "\u001b[2m│\u001b[22m quote",
    );
  });

  test("renders a dimmed rule across the available width", () => {
    const { lastFrame } = render(
      <Box width={12}>
        <Markdown text={"above\n\n---\n\nbelow"} final />
      </Box>,
    );
    expect(stripVTControlCharacters(lastFrame()!)).toBe(
      "above\n\n────────────\n\nbelow",
    );
    expect(lastFrame()).toContain("\u001b[2m────────────\u001b[22m");
  });

  test("aligns table columns with a bold header", () => {
    const text =
      "| left | mid | right |\n| :--- | :---: | ---: |\n| a | b | c |\n| wider | middle | 123456 |";
    expect(frame(text)).toBe(
      "left  │  mid   │  right\na     │   b    │      c\nwider │ middle │ 123456",
    );
    expect(render(<Markdown text={text} final />).lastFrame()).toContain(
      "\u001b[1mleft\u001b[22m",
    );
    expect(frame("| a | b |\n| - | - |")).toBe("a │ b");
  });

  test("measures rendered table content, including Unicode and overrides", () => {
    expect(
      frame("| name | link |\n| - | - |\n| 猫 | [go](/x) |", {
        link: ({ children }) => <Text>open {children}</Text>,
      }),
    ).toBe("name │ link\n猫   │ open go");
    expect(frame("| a | b |\n| - | - |\n| [go](/x) | ![cat](/cat) |")).toBe(
      "a       │ b\ngo (/x) │ [image: cat]",
    );
  });

  test("renders math as colored TeX source", () => {
    expect(frame("$x^2$ and $$y$$\n\n$$\nz\n$$")).toBe("x^2 and y\n\nz");
    expect(render(<Markdown text={"$$\nz\n$$"} final />).lastFrame()).toBe(
      "\u001b[36mz\u001b[39m",
    );
  });

  test("renders raw HTML as plain text", () => {
    expect(
      frame('<script>alert(1)</script>\n\nhi <b onclick="x()">there</b>'),
    ).toBe('<script>alert(1)</script>\n\nhi <b onclick="x()">there</b>');
  });

  test("passes overrides their nodes and rendered children", () => {
    const components: MarkdownComponents = {
      codeBlock: ({ node }) => (
        <Text>
          {node.lang}: {node.value.trimEnd()}
        </Text>
      ),
      table: ({ children }) => (
        <Box flexDirection="column">
          <Text>table:</Text>
          {children}
        </Box>
      ),
      link: ({ node, children }) => (
        <Text>
          {children} [{node.url}]
        </Text>
      ),
    };
    expect(
      frame("```py\nx\n```\n\n| a |\n| - |\n\n[*go*](/x)", components),
    ).toBe("py: x\n\ntable:\na\n\ngo [/x]");
  });

  test("wraps inline runs, lists, and quote gutters at a narrow width", () => {
    const { lastFrame } = render(
      <Box width={16}>
        <Markdown
          text={
            "one **two** three four\n\n- one two three four\n\n> one two three four"
          }
          final
        />
      </Box>,
    );
    expect(stripVTControlCharacters(lastFrame()!)).toBe(
      "one two three\nfour\n\n• one two three\n  four\n\n│ one two three\n│ four",
    );
  });

  test("renders empty text and replaces a previous message", () => {
    const { lastFrame, rerender } = render(<Markdown text="" />);
    expect(stripVTControlCharacters(lastFrame()!)).toBe("");
    rerender(<Markdown text={"# Title\n\nbody"} />);
    expect(stripVTControlCharacters(lastFrame()!)).toBe("Title\n\nbody");
    rerender(<Markdown text="replacement" final />);
    expect(stripVTControlCharacters(lastFrame()!)).toBe("replacement");
    rerender(<Markdown text="" final />);
    expect(stripVTControlCharacters(lastFrame()!)).toBe("");
  });

  test("keeps wrapped table rows aligned when the available width changes", () => {
    const text = "| left | right |\n| - | - |\n| first word | other word |";
    const { lastFrame, rerender } = render(
      <Box width={30}>
        <Markdown text={text} final />
      </Box>,
    );
    expect(stripVTControlCharacters(lastFrame()!)).toBe(
      "left       │ right\nfirst word │ other word",
    );
    rerender(
      <Box width={15}>
        <Markdown text={text} final />
      </Box>,
    );
    expect(stripVTControlCharacters(lastFrame()!)).toBe(
      "left   │ right\nfirst  │ other\nword   │ word",
    );
    rerender(
      <Box width={30}>
        <Markdown text={text} final />
      </Box>,
    );
    expect(stripVTControlCharacters(lastFrame()!)).toBe(
      "left       │ right\nfirst word │ other word",
    );
  });

  test("closes open syntax provisionally until the message is final", () => {
    const { lastFrame, rerender } = render(<Markdown text="**bold" />);
    expect(lastFrame()).toBe("\u001b[1mbold\u001b[22m");
    rerender(<Markdown text="**bold" final />);
    expect(lastFrame()).toBe("**bold");
    rerender(<Markdown text="**bold** and [go](https://a" />);
    expect(stripVTControlCharacters(lastFrame()!)).toBe("bold and go");
    rerender(<Markdown text="**bold** and [go](https://a.dev)" final />);
    expect(stripVTControlCharacters(lastFrame()!)).toBe(
      "bold and go (https://a.dev)",
    );
  });

  describe("while a message streams", () => {
    const counting = () => {
      const renders: string[] = [];
      const Heading = ({
        node,
        children,
      }: MarkdownComponentProps<"heading">) => {
        renders.push(
          node.children
            .map((child) => ("value" in child ? child.value : ""))
            .join(""),
        );
        return <Text>{children}</Text>;
      };
      return { renders, Heading };
    };

    test("renders a settled block once across equivalent component maps", () => {
      const { renders, Heading } = counting();
      const { lastFrame, rerender } = render(
        <Markdown
          text={"# Title\n\nfirst"}
          components={{ heading: Heading }}
        />,
      );
      rerender(
        <Markdown
          text={"# Title\n\nfirst words"}
          components={{ heading: Heading }}
        />,
      );
      rerender(
        <Markdown
          text={"# Title\n\nfirst words\n\n# Next"}
          components={{ heading: Heading }}
        />,
      );
      expect(renders).toEqual(["Title", "Next"]);
      expect(stripVTControlCharacters(lastFrame()!)).toBe(
        "Title\n\nfirst words\n\nNext",
      );
    });

    test("renders blocks again when a component changes or is removed", () => {
      const first = counting();
      const second = counting();
      const { lastFrame, rerender } = render(
        <Markdown
          text={"# Title\n\nbody"}
          components={{ heading: first.Heading }}
        />,
      );
      rerender(
        <Markdown
          text={"# Title\n\nbody"}
          components={{ heading: second.Heading }}
        />,
      );
      expect(first.renders).toEqual(["Title"]);
      expect(second.renders).toEqual(["Title"]);
      rerender(<Markdown text={"# Title\n\nbody"} />);
      expect(lastFrame()).toBe(
        "\u001b[4m\u001b[1mTitle\u001b[22m\u001b[24m\n\nbody",
      );
    });

    test("realigns a table as cells stream and when the text is replaced", () => {
      const { lastFrame, rerender } = render(
        <Markdown text={"| a | b |\n| - | - |\n| x | y"} />,
      );
      expect(stripVTControlCharacters(lastFrame()!)).toBe("a │ b\nx │ y");
      rerender(<Markdown text={"| a | b |\n| - | - |\n| longer | yellow |"} />);
      expect(stripVTControlCharacters(lastFrame()!)).toBe(
        "a      │ b\nlonger │ yellow",
      );
      rerender(<Markdown text={"| a | b |\n| - | - |\n| z | q |"} final />);
      expect(stripVTControlCharacters(lastFrame()!)).toBe("a │ b\nz │ q");
    });

    test("remeasures table cells when an inline component changes", () => {
      const text = "| a | b |\n| - | - |\n| [go](/x) | y |";
      const { lastFrame, rerender } = render(<Markdown text={text} final />);
      expect(stripVTControlCharacters(lastFrame()!)).toBe(
        "a       │ b\ngo (/x) │ y",
      );
      rerender(
        <Markdown
          text={text}
          final
          components={{ link: ({ children }) => <Text>{children}</Text> }}
        />,
      );
      expect(stripVTControlCharacters(lastFrame()!)).toBe("a  │ b\ngo │ y");
      rerender(<Markdown text={text} final />);
      expect(stripVTControlCharacters(lastFrame()!)).toBe(
        "a       │ b\ngo (/x) │ y",
      );
    });
  });
});
