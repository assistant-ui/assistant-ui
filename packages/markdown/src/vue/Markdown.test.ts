// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import {
  Markdown,
  type MarkdownComponentProps,
  type MarkdownComponents,
  type MarkdownProps,
} from "./Markdown";

const unmounts: (() => void)[] = [];

afterEach(() => {
  for (const unmount of unmounts.splice(0)) unmount();
});

const render = (props: MarkdownProps) => {
  const source = shallowRef(props);
  const container = document.createElement("div");
  const app = createApp({ render: () => h(Markdown, source.value) });
  app.mount(container);
  unmounts.push(() => app.unmount());
  return {
    container,
    rerender: async (next: MarkdownProps) => {
      source.value = next;
      await nextTick();
    },
  };
};

const html = (text: string, components?: MarkdownComponents) =>
  render({ text, final: true, components }).container.innerHTML;

describe("Markdown", () => {
  test("renders blocks and inlines as their HTML elements", () => {
    expect(
      html(
        '## Plan\n\nSome *em*, **strong**, ~~gone~~, `code`, a [link](https://a.dev "A") and\\\nnext\n\n> quoted\n\n---\n\n```ts title\nconst a = 1;\n```',
      ),
    ).toBe(
      '<h2>Plan</h2><p>Some <em>em</em>, <strong>strong</strong>, <del>gone</del>, <code>code</code>, a <a href="https://a.dev" title="A">link</a> and<br>next</p><blockquote><p>quoted</p></blockquote><hr><pre><code class="language-ts">const a = 1;\n</code></pre>',
    );
  });

  test.each([1, 2, 3, 4, 5, 6])("renders a level %i heading", (depth) => {
    expect(html(`${"#".repeat(depth)} Title`)).toBe(
      `<h${depth}>Title</h${depth}>`,
    );
  });

  test("renders soft breaks and code blocks without a language", () => {
    expect(html("one\ntwo\n\n```\nplain\n```")).toBe(
      "<p>one\ntwo</p><pre><code>plain\n</code></pre>",
    );
  });

  test("renders a tight list's paragraphs without wrappers and a loose list's with them", () => {
    expect(html("3. one\n4. two")).toBe(
      '<ol start="3"><li>one</li><li>two</li></ol>',
    );
    expect(html("- one\n\n- two")).toBe(
      "<ul><li><p>one</p></li><li><p>two</p></li></ul>",
    );
    expect(html("1. one\n2. two")).toBe("<ol><li>one</li><li>two</li></ol>");
  });

  test("renders a task list item with a disabled checkbox named by its text", () => {
    const { container } = render({
      text: "- [x] *done*\n- [ ] todo",
      final: true,
    });
    expect(container.innerHTML).toBe(
      '<ul><li><input type="checkbox" disabled="" aria-label="done" checked=""> <em>done</em></li><li><input type="checkbox" disabled="" aria-label="todo"> todo</li></ul>',
    );
    const checkboxes = container.querySelectorAll<HTMLInputElement>("input");
    expect([...checkboxes].map((checkbox) => checkbox.checked)).toEqual([
      true,
      false,
    ]);
    expect([...checkboxes].every((checkbox) => checkbox.disabled)).toBe(true);
  });

  test("puts a loose task list item's checkbox inside its first paragraph", () => {
    expect(html("- [x] done\n\n  more\n\n- [ ] todo")).toBe(
      '<ul><li><p><input type="checkbox" disabled="" aria-label="done" checked=""> done</p><p>more</p></li><li><p><input type="checkbox" disabled="" aria-label="todo"> todo</p></li></ul>',
    );
  });

  test("passes a tight list's paragraphs to a paragraph override", () => {
    expect(
      html("- one", {
        paragraph: (_props, { slots }) => h("mark", slots.default?.()),
      }),
    ).toBe("<ul><li><mark>one</mark></li></ul>");
  });

  test("passes a task checkbox to its paragraph override", () => {
    expect(
      html("- [x] *done*", {
        paragraph: (_props, { slots }) => h("mark", slots.default?.()),
      }),
    ).toBe(
      '<ul><li><mark><input type="checkbox" disabled="" aria-label="done" checked=""> <em>done</em></mark></li></ul>',
    );
  });

  test("renders a table with its header row and column alignment", () => {
    expect(html("| a | b |\n| :-: | --- |\n| 1 | 2 |")).toBe(
      '<table><thead><tr><th style="text-align: center;">a</th><th>b</th></tr></thead><tbody><tr><td style="text-align: center;">1</td><td>2</td></tr></tbody></table>',
    );
    expect(html("| a | b |\n| :-- | --: |\n| 1 | 2 |")).toBe(
      '<table><thead><tr><th style="text-align: left;">a</th><th style="text-align: right;">b</th></tr></thead><tbody><tr><td style="text-align: left;">1</td><td style="text-align: right;">2</td></tr></tbody></table>',
    );
  });

  test("renders math as the TeX source in the classes math renderers select", () => {
    expect(html("$x^2$ and $$y$$\n\n$$\nz\n$$")).toBe(
      '<p><code class="language-math math-inline">x^2</code> and <code class="language-math math-display">y</code></p><pre><code class="language-math math-display">z</code></pre>',
    );
  });

  test("renders raw HTML as text", () => {
    expect(
      html('<script>alert(1)</script>\n\nhi <b onclick="x()">there</b>'),
    ).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;\n</p><p>hi &lt;b onclick="x()"&gt;there&lt;/b&gt;</p>',
    );
  });

  test("renders an image with its alt text", () => {
    const { container } = render({
      text: '![a cat](/cat.png "Cat")',
      final: true,
    });
    const image = container.querySelector("p > img");
    expect(image?.getAttribute("src")).toBe("/cat.png");
    expect(image?.getAttribute("alt")).toBe("a cat");
    expect(image?.getAttribute("title")).toBe("Cat");
  });

  test("closes syntax left open at the end until the text is final", async () => {
    const { container, rerender } = render({ text: "**bold" });
    expect(container.innerHTML).toBe("<p><strong>bold</strong></p>");

    await rerender({ text: "**bold", final: true });
    expect(container.innerHTML).toBe("<p>**bold</p>");
  });

  test("passes an override its node and its rendered children", () => {
    const components: MarkdownComponents = {
      codeBlock: ({ node }) =>
        h("figure", { "data-lang": node.lang }, node.value),
      table: (_props, { slots }) =>
        h("div", { class: "scroll" }, [h("table", slots.default?.())]),
      link: ({ node }, { slots }) =>
        h(
          "a",
          { href: node.url, target: "_blank", rel: "noreferrer" },
          slots.default?.(),
        ),
    };
    expect(
      html("```py\nx\n```\n\n| a |\n| - |\n\n[*go*](/x)", components),
    ).toBe(
      '<figure data-lang="py">x\n</figure><div class="scroll"><table><thead><tr><th>a</th></tr></thead></table></div><p><a href="/x" target="_blank" rel="noreferrer"><em>go</em></a></p>',
    );
  });

  test("passes a table override its rendered head and body", () => {
    expect(
      html("| a |\n| - |\n| 1 |", {
        table: (_props, { slots }) =>
          h("div", { class: "scroll" }, [h("table", slots.default?.())]),
      }),
    ).toBe(
      '<div class="scroll"><table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></div>',
    );
  });

  test("passes no default slot to a leaf override", () => {
    expect(
      html("`code`", {
        codeSpan: ({ node }, { slots }) => {
          expect(slots.default).toBeUndefined();
          return h("kbd", node.value);
        },
      }),
    ).toBe("<p><kbd>code</kbd></p>");
  });

  test("updates empty and replaced messages", async () => {
    const { container, rerender } = render({ text: "" });
    expect(container.innerHTML).toBe("");
    await rerender({ text: "# Title\n\nbody" });
    expect(container.innerHTML).toBe("<h1>Title</h1><p>body</p>");
    await rerender({ text: "> replacement", final: true });
    expect(container.innerHTML).toBe(
      "<blockquote><p>replacement</p></blockquote>",
    );
    await rerender({ text: "", final: true });
    expect(container.innerHTML).toBe("");
  });

  describe("while a message streams", () => {
    const counting = () => {
      const renders: string[] = [];
      const Heading = defineComponent(
        (props: MarkdownComponentProps<"heading">, { slots }) =>
          () => {
            renders.push(
              props.node.children
                .map((child) => ("value" in child ? child.value : ""))
                .join(""),
            );
            return h("h1", slots.default?.());
          },
        { props: ["node"] },
      );
      return { renders, Heading };
    };

    test("renders a settled block once", async () => {
      const { renders, Heading } = counting();
      const { container, rerender } = render({
        text: "# Title\n\nfirst",
        components: { heading: Heading },
      });
      await rerender({
        text: "# Title\n\nfirst words",
        components: { heading: Heading },
      });
      await rerender({
        text: "# Title\n\nfirst words\n\n# Next",
        components: { heading: Heading },
      });

      expect(renders).toEqual(["Title", "Next"]);
      expect(container.innerHTML).toBe(
        "<h1>Title</h1><p>first words</p><h1>Next</h1>",
      );
    });

    test("renders every block again with a component that changed", async () => {
      const first = counting();
      const second = counting();
      const { rerender } = render({
        text: "# Title\n\nbody",
        components: { heading: first.Heading },
      });
      await rerender({
        text: "# Title\n\nbody",
        components: { heading: second.Heading },
      });

      expect(first.renders).toEqual(["Title"]);
      expect(second.renders).toEqual(["Title"]);
    });

    test("returns to the default renderer when an override is removed", async () => {
      const heading = defineComponent(
        (_props: MarkdownComponentProps<"heading">, { slots }) =>
          () =>
            h("mark", slots.default?.()),
        { props: ["node"] },
      );
      const { container, rerender } = render({
        text: "# Title\n\nbody",
        components: { heading },
      });
      expect(container.innerHTML).toBe("<mark>Title</mark><p>body</p>");
      await rerender({ text: "# Title\n\nbody" });
      expect(container.innerHTML).toBe("<h1>Title</h1><p>body</p>");
    });

    test("keeps a separate session for each mounted message", async () => {
      const first = counting();
      const second = counting();
      const firstMessage = render({
        text: "# First\n\nbody",
        components: { heading: first.Heading },
      });
      const secondMessage = render({
        text: "# Second\n\nbody",
        components: { heading: second.Heading },
      });
      await firstMessage.rerender({
        text: "# First\n\nbody grows",
        components: { heading: first.Heading },
      });
      await secondMessage.rerender({
        text: "# Second\n\nbody grows",
        components: { heading: second.Heading },
      });

      expect(first.renders).toEqual(["First"]);
      expect(second.renders).toEqual(["Second"]);
      expect(firstMessage.container.innerHTML).toBe(
        "<h1>First</h1><p>body grows</p>",
      );
      expect(secondMessage.container.innerHTML).toBe(
        "<h1>Second</h1><p>body grows</p>",
      );
    });
  });
});
