// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  Markdown,
  type MarkdownComponentProps,
  type MarkdownComponents,
} from "./Markdown";

const html = (text: string, components?: MarkdownComponents) =>
  renderToStaticMarkup(<Markdown text={text} final components={components} />);

describe("Markdown", () => {
  test("renders blocks and inlines as their HTML elements", () => {
    expect(
      html(
        '## Plan\n\nSome *em*, **strong**, ~~gone~~, `code`, a [link](https://a.dev "A") and\\\nnext\n\n> quoted\n\n---\n\n```ts title\nconst a = 1;\n```',
      ),
    ).toBe(
      '<h2>Plan</h2><p>Some <em>em</em>, <strong>strong</strong>, <del>gone</del>, <code>code</code>, a <a href="https://a.dev" title="A">link</a> and<br/>next</p><blockquote><p>quoted</p></blockquote><hr/><pre><code class="language-ts">const a = 1;\n</code></pre>',
    );
  });

  test("renders a tight list's paragraphs without wrappers and a loose list's with them", () => {
    expect(html("3. one\n4. two")).toBe(
      '<ol start="3"><li>one</li><li>two</li></ol>',
    );
    expect(html("- one\n\n- two")).toBe(
      "<ul><li><p>one</p></li><li><p>two</p></li></ul>",
    );
  });

  test("renders a task list item with a disabled checkbox named by its text", () => {
    expect(html("- [x] *done*\n- [ ] todo")).toBe(
      '<ul><li><input type="checkbox" disabled="" aria-label="done" checked=""/> <em>done</em></li><li><input type="checkbox" disabled="" aria-label="todo"/> todo</li></ul>',
    );
  });

  test("puts a loose task list item's checkbox inside its first paragraph", () => {
    expect(html("- [x] done\n\n  more\n\n- [ ] todo")).toBe(
      '<ul><li><p><input type="checkbox" disabled="" aria-label="done" checked=""/> done</p><p>more</p></li><li><p><input type="checkbox" disabled="" aria-label="todo"/> todo</p></li></ul>',
    );
  });

  test("passes a tight list's paragraphs to a paragraph override", () => {
    expect(
      html("- one", {
        paragraph: ({ children }) => <mark>{children}</mark>,
      }),
    ).toBe("<ul><li><mark>one</mark></li></ul>");
  });

  test("renders a table with its header row and column alignment", () => {
    expect(html("| a | b |\n| :-: | --- |\n| 1 | 2 |")).toBe(
      '<table><thead><tr><th style="text-align:center">a</th><th>b</th></tr></thead><tbody><tr><td style="text-align:center">1</td><td>2</td></tr></tbody></table>',
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
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;\n</p><p>hi &lt;b onclick=&quot;x()&quot;&gt;there&lt;/b&gt;</p>",
    );
  });

  test("renders an image with its alt text", () => {
    const { container } = render(
      <Markdown text={'![a cat](/cat.png "Cat")'} final />,
    );
    const image = container.querySelector("p > img");
    expect(image?.getAttribute("src")).toBe("/cat.png");
    expect(image?.getAttribute("alt")).toBe("a cat");
    expect(image?.getAttribute("title")).toBe("Cat");
  });

  test("closes syntax left open at the end until the text is final", () => {
    const { container, rerender } = render(<Markdown text="**bold" />);
    expect(container.innerHTML).toBe("<p><strong>bold</strong></p>");

    rerender(<Markdown text="**bold" final />);
    expect(container.innerHTML).toBe("<p>**bold</p>");
  });

  test("passes an override its node and its rendered children", () => {
    const components: MarkdownComponents = {
      codeBlock: ({ node }) => (
        <figure data-lang={node.lang}>{node.value}</figure>
      ),
      table: ({ children }) => (
        <div className="scroll">
          <table>{children}</table>
        </div>
      ),
      link: ({ node, children }) => (
        <a href={node.url} target="_blank" rel="noreferrer">
          {children}
        </a>
      ),
    };
    expect(
      html("```py\nx\n```\n\n| a |\n| - |\n\n[*go*](/x)", components),
    ).toBe(
      '<figure data-lang="py">x\n</figure><div class="scroll"><table><thead><tr><th>a</th></tr></thead></table></div><p><a href="/x" target="_blank" rel="noreferrer"><em>go</em></a></p>',
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
        return <h1>{children}</h1>;
      };
      return { renders, Heading };
    };

    test("renders a settled block once", () => {
      const { renders, Heading } = counting();
      const { container, rerender } = render(
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
      expect(container.innerHTML).toBe(
        "<h1>Title</h1><p>first words</p><h1>Next</h1>",
      );
    });

    test("renders every block again with a component that changed", () => {
      const first = counting();
      const second = counting();
      const { rerender } = render(
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
    });
  });
});
