// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  Markdown,
  type MarkdownComponentProps,
  type MarkdownComponents,
} from "./Markdown";

afterEach(cleanup);

describe("Markdown on React Native", () => {
  test("keeps inline text and both kinds of line break in one Text", () => {
    const { container, getByText } = render(
      <Markdown
        text={"Some *em*, **strong**, ~~gone~~, `code` and\\\nnext\nsoft"}
        final
      />,
    );
    const root = container.firstElementChild!;
    expect(root.children).toHaveLength(1);
    const paragraph = root.firstElementChild!;
    expect(paragraph.textContent).toBe(
      "Some em, strong, gone, code and\nnext\nsoft",
    );
    for (const value of ["em", "strong", "gone", "code"]) {
      expect(getByText(value).parentElement).toBe(paragraph);
    }
    expect(getComputedStyle(getByText("em")).fontStyle).toBe("italic");
    expect(getComputedStyle(getByText("strong")).fontWeight).toBe("700");
    expect(getComputedStyle(getByText("gone")).textDecorationLine).toBe(
      "line-through",
    );
    expect(getComputedStyle(getByText("code")).fontFamily).toContain(
      "monospace",
    );
  });

  test("renders bold accessible headings with a smaller size at each depth", () => {
    const { getAllByRole } = render(
      <Markdown
        text={[1, 2, 3, 4, 5, 6]
          .map((depth) => `${"#".repeat(depth)} Level ${depth}`)
          .join("\n\n")}
        final
      />,
    );
    const headings = getAllByRole("heading");
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Level 1",
      "Level 2",
      "Level 3",
      "Level 4",
      "Level 5",
      "Level 6",
    ]);
    const sizes = headings.map((heading) => {
      const style = getComputedStyle(heading);
      expect(style.fontWeight).toBe("700");
      return Number.parseFloat(style.fontSize);
    });
    for (let index = 1; index < sizes.length; index++) {
      expect(sizes[index - 1]).toBeGreaterThan(sizes[index]!);
    }
    expect(sizes.at(-1)).toBeGreaterThan(0);
  });

  test("spaces blocks vertically and draws blockquotes and hairline breaks as Views", () => {
    const { container } = render(
      <Markdown text={"before\n\n> first\n>\n> second\n\n---"} final />,
    );
    const root = container.firstElementChild!;
    expect(getComputedStyle(root).flexDirection).toBe("column");
    expect(Number.parseFloat(getComputedStyle(root).gap)).toBeGreaterThan(0);
    const [paragraph, quote, divider] = [...root.children];
    expect(paragraph!.textContent).toBe("before");
    expect([...quote!.children].map((child) => child.textContent)).toEqual([
      "first",
      "second",
    ]);
    expect(
      Number.parseFloat(getComputedStyle(quote!).borderLeftWidth),
    ).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(quote!).gap)).toBeGreaterThan(0);
    expect(
      Number.parseFloat(getComputedStyle(divider!).borderBottomWidth),
    ).toBe(StyleSheet.hairlineWidth);
    expect(divider!.textContent).toBe("");
  });

  test("opens a nested accessible link through Linking", () => {
    const openURL = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    try {
      const { container, getByRole } = render(
        <Markdown text="Visit [*go*](https://a.dev) now" final />,
      );
      const link = getByRole("link", { name: "go" });
      expect(link.parentElement).toBe(
        container.firstElementChild!.firstElementChild,
      );
      expect(getComputedStyle(link).textDecorationLine).toBe("underline");
      expect(within(link).getByText("go").textContent).toBe("go");
      fireEvent.click(link);
      expect(openURL).toHaveBeenCalledExactlyOnceWith("https://a.dev");
    } finally {
      openURL.mockRestore();
    }
  });

  test("renders an inline image with its URI and alt text", () => {
    const { container, getByRole } = render(
      <Markdown
        text={'before ![a cat](https://a.dev/cat.png "Cat") after'}
        final
      />,
    );
    const image = getByRole("img", { name: "a cat" });
    expect(image.getAttribute("src")).toBe("https://a.dev/cat.png");
    expect(image.getAttribute("alt")).toBe("a cat");
    expect(image.parentElement!.parentElement).toBe(
      container.firstElementChild!.firstElementChild,
    );
    expect(
      Number.parseFloat(getComputedStyle(image.parentElement!).width),
    ).toBeGreaterThan(0);
    expect(
      Number.parseFloat(getComputedStyle(image.parentElement!).height),
    ).toBeGreaterThan(0);
    expect(container.textContent).toBe("before  after");
  });

  test.each([
    ["- one\n- two", ["•one", "•two"]],
    ["- one\n\n- two", ["•one", "•two"]],
    ["3. one\n4. two", ["3.one", "4.two"]],
  ])("renders list markers and row content for %s", (text, expected) => {
    const { container } = render(<Markdown text={text} final />);
    const list = container.firstElementChild!.firstElementChild!;
    expect([...list.children].map((row) => row.textContent)).toEqual(expected);
    for (const row of list.children) {
      expect(getComputedStyle(row).flexDirection).toBe("row");
      expect(row.children).toHaveLength(2);
    }
    expect(Number.parseFloat(getComputedStyle(list).gap)).toBeGreaterThan(0);
  });

  test("keeps a nested list inside its parent item's content", () => {
    const { container } = render(
      <Markdown text={"- parent\n  - child\n  - sibling\n- tail"} final />,
    );
    const list = container.firstElementChild!.firstElementChild!;
    expect(list.children).toHaveLength(2);
    const content = list.firstElementChild!.lastElementChild!;
    expect(content.firstElementChild!.textContent).toBe("parent");
    expect(
      [...content.lastElementChild!.children].map((row) => row.textContent),
    ).toEqual(["•child", "•sibling"]);
    expect(list.lastElementChild!.textContent).toBe("•tail");
  });

  test("names task checkboxes by their text and exposes their checked state", () => {
    const { container, getByRole, getAllByRole } = render(
      <Markdown text={"- [x] *done*\n\n  more\n\n- [ ] todo"} final />,
    );
    const done = getByRole("checkbox", { name: "done", checked: true });
    const todo = getByRole("checkbox", { name: "todo", checked: false });
    expect(getAllByRole("checkbox")).toHaveLength(2);
    expect(done.textContent).toBe("☑");
    expect(todo.textContent).toBe("☐");
    expect(done.parentElement!.lastElementChild!.textContent).toBe("donemore");
    expect(todo.parentElement!.lastElementChild!.textContent).toBe("todo");
    expect(container.textContent).toBe("☑donemore☐todo");
  });

  test("renders table rows and cells as Views with aligned Text and bold headers", () => {
    const { container } = render(
      <Markdown
        text={
          "| left | middle | right | plain |\n| :--- | :---: | ---: | --- |\n| **1** | 2 | 3 | 4 |"
        }
        final
      />,
    );
    const table = container.firstElementChild!.firstElementChild!;
    expect(table.children).toHaveLength(2);
    expect([...table.children].map((row) => row.textContent)).toEqual([
      "leftmiddlerightplain",
      "1234",
    ]);
    for (const row of table.children) {
      expect(getComputedStyle(row).flexDirection).toBe("row");
      expect(row.children).toHaveLength(4);
      const cells = [...row.children];
      expect(cells.map((cell) => cell.children.length)).toEqual([1, 1, 1, 1]);
      expect(
        cells
          .slice(0, 3)
          .map((cell) => getComputedStyle(cell.firstElementChild!).textAlign),
      ).toEqual(["left", "center", "right"]);
    }
    for (const cell of table.firstElementChild!.children) {
      expect(getComputedStyle(cell.firstElementChild!).fontWeight).toBe("700");
    }
  });

  test("renders code and inline and block math as monospace source", () => {
    const { getByText, container } = render(
      <Markdown
        text={
          "`code` and $x^2$ and $$y$$\n\n```ts\nconst a = 1;\n```\n\n$$\nz\n$$"
        }
        final
      />,
    );
    expect(container.firstElementChild!.children).toHaveLength(3);
    expect(container.firstElementChild!.firstElementChild!.textContent).toBe(
      "code and x^2 and y",
    );
    for (const value of ["code", "x^2", "y", "const a = 1;", "z"]) {
      expect(getComputedStyle(getByText(value)).fontFamily).toContain(
        "monospace",
      );
    }
  });

  test("renders raw block and inline HTML as plain text", () => {
    const { container } = render(
      <Markdown
        text={'<script>alert(1)</script>\n\nhi <b onclick="x()">there</b>'}
        final
      />,
    );
    expect(container.textContent).toBe(
      '<script>alert(1)</script>\nhi <b onclick="x()">there</b>',
    );
    expect(container.querySelector("script, b")).toBeNull();
  });

  test("passes overrides their node and rendered children, including table rows", () => {
    const codeBlock = vi.fn(
      ({ node, children }: MarkdownComponentProps<"codeBlock">) => (
        <View testID="code">
          <Text>
            {node.lang}: {node.value}
            {children}
          </Text>
        </View>
      ),
    );
    const components: MarkdownComponents = {
      codeBlock,
      table: ({ children }) => <View testID="table">{children}</View>,
      link: ({ node, children }) => (
        <Text accessibilityRole="link" accessibilityLabel={node.url}>
          {children}
        </Text>
      ),
      emphasis: ({ children }) => (
        <Text style={{ fontWeight: "bold", color: "purple" }}>{children}</Text>
      ),
    };
    const { getByTestId, getByRole, getByText } = render(
      <Markdown
        text={"```py\nx\n```\n\n| a |\n| - |\n\n[*go*](/x)"}
        components={components}
        final
      />,
    );
    expect(codeBlock.mock.calls[0]![0].node).toMatchObject({
      type: "codeBlock",
      lang: "py",
      value: "x\n",
    });
    expect(codeBlock.mock.calls[0]![0].children).toBeUndefined();
    expect(getByTestId("code").textContent).toBe("py: x\n");
    expect(getByTestId("table").textContent).toBe("a");
    expect(getByTestId("table").children).toHaveLength(1);
    expect(getByRole("link", { name: "/x" }).textContent).toBe("go");
    expect(getComputedStyle(getByText("go")).fontWeight).toBe("700");
    expect(getComputedStyle(getByText("go")).color).toBe("rgb(128, 0, 128)");
  });

  test("passes list items and their paragraphs to overrides in a tight list", () => {
    const item = vi.fn(
      ({ node, children }: MarkdownComponentProps<"listItem">) => (
        <View testID={node.checked ? "done" : "item"}>{children}</View>
      ),
    );
    const { getByTestId } = render(
      <Markdown
        text="- [x] **one**"
        components={{
          listItem: item,
          paragraph: ({ children }) => (
            <Text testID="paragraph">{children}</Text>
          ),
        }}
        final
      />,
    );
    expect(item.mock.calls[0]![0].node).toMatchObject({
      type: "listItem",
      checked: true,
    });
    expect(getByTestId("done").textContent).toBe("one");
    expect(getByTestId("paragraph").parentElement).toBe(getByTestId("done"));
    expect(
      getComputedStyle(within(getByTestId("paragraph")).getByText("one"))
        .fontWeight,
    ).toBe("700");
  });

  test("closes unfinished syntax while streaming and restores it when final", () => {
    const { container, getByText, rerender } = render(
      <Markdown text="**bold" />,
    );
    expect(container.textContent).toBe("bold");
    expect(getComputedStyle(getByText("bold")).fontWeight).toBe("700");
    rerender(<Markdown text="**bold" final />);
    expect(container.textContent).toBe("**bold");
  });

  test("replaces a message and clears it when the text becomes empty", () => {
    const { container, getByRole, rerender, queryByRole } = render(
      <Markdown text="# Old" />,
    );
    expect(getByRole("heading", { name: "Old" }).textContent).toBe("Old");
    rerender(<Markdown text="new **message**" final />);
    expect(queryByRole("heading")).toBeNull();
    expect(container.textContent).toBe("new message");
    rerender(<Markdown text="" final />);
    expect(container.textContent).toBe("");
    expect(container.firstElementChild!.children).toHaveLength(0);
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
        return <Text accessibilityRole="header">{children}</Text>;
      };
      return { renders, Heading };
    };

    test("renders a settled block once with fresh equivalent component maps", () => {
      const { renders, Heading } = counting();
      const { container, rerender, getAllByRole } = render(
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
      rerender(
        <Markdown
          text={"# Title\n\nfirst words\n\n# Next"}
          components={{ heading: Heading }}
          final
        />,
      );
      expect(renders).toEqual(["Title", "Next"]);
      expect(
        getAllByRole("heading").map((heading) => heading.textContent),
      ).toEqual(["Title", "Next"]);
      expect(container.textContent).toBe("Titlefirst wordsNext");
    });

    test("updates settled blocks when an override changes or is removed", () => {
      const first = counting();
      const second = counting();
      const { rerender, getByRole } = render(
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
      expect(
        getComputedStyle(getByRole("heading", { name: "Title" })).fontWeight,
      ).toBe("700");
      expect(first.renders).toEqual(["Title"]);
      expect(second.renders).toEqual(["Title"]);
    });
  });
});
