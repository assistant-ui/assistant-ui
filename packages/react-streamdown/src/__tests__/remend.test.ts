import remend from "remend";
import { parseMarkdownIntoBlocks } from "streamdown";
import { describe, expect, it } from "vitest";
import { findRemendWindowStart, tailBoundedRemend } from "../remend";

const CORPUS = `# Heading one

Intro paragraph with **bold**, *italic*, \`inline code\`, and a [link](https://example.com).

## Code

\`\`\`python
def main():
    cost = "$5"
    print(f"total: $\{cost}")
\`\`\`

Some text after the fence with $x^2 + y^2$ inline math.

$$
\\int_0^1 f(x) dx
$$

- list item one with **bold**
- list item two

| col a | col b |
| ----- | ----- |
| 1     | 2     |

~~~js
const s = \`template \${value}\`
~~~

Final paragraph with ~~strike~~ and unfinished [link text](https://exa
`;

// Block-level equality is render equality: Streamdown renders each block
// independently, so two repairs that produce the same blocks render identically
// even if the raw strings differ. Full `remend` is a valid oracle only for text
// whose earlier blocks hold no incomplete construct, since the tail-bounded
// repair deliberately leaves those alone.
const blocksOf = (text: string): string[] => parseMarkdownIntoBlocks(text);

describe("tailBoundedRemend", () => {
  it("matches full remend block output at every streaming prefix", () => {
    for (let end = 1; end <= CORPUS.length; end++) {
      const prefix = CORPUS.slice(0, end);
      expect(
        blocksOf(tailBoundedRemend(prefix)),
        `prefix length ${end}`,
      ).toEqual(blocksOf(remend(prefix)));
    }
  });

  it.each([
    ["HTML", "Use the <select element for dropdowns."],
    ["image", "See ![alt](htt for the image."],
    ["link", "See [text](htt for the link."],
    ["italic", "A *dangling in first para"],
    ["code", "Check `code in first"],
  ])(
    "preserves earlier incomplete %s without changing later paragraphs",
    (_, head) => {
      const text = `${head}\n\nNext paragraph continues here.`;
      expect(tailBoundedRemend(text)).toBe(text);
      expect(tailBoundedRemend(`${text} **bold`)).toBe(`${text} **bold**`);
      expect(tailBoundedRemend(`${head}\n\n> `)).toBe(`${head}\n\n>`);
    },
  );

  it("keeps comparison escapes after another paragraph starts", () => {
    expect(tailBoundedRemend("- > 25\n\nTail")).toBe("- \\> 25\n\nTail");
  });

  it("respects disabled escapes in earlier paragraphs", () => {
    const text = "20~25 and 30~35\n\n- > 25\n\nTail";
    expect(
      tailBoundedRemend(text, {
        singleTilde: false,
        comparisonOperators: false,
      }),
    ).toBe(text);
  });

  it("applies custom handlers to earlier paragraphs", () => {
    expect(
      tailBoundedRemend("Draft\n\nTail", {
        handlers: [
          { name: "rename", handle: (text) => text.replace("Draft", "Final") },
        ],
      }),
    ).toBe("Final\n\nTail");
  });

  it("keeps numeric ranges escaped after another paragraph starts", () => {
    expect(tailBoundedRemend("20~25 and 30~35\n\nTail")).toBe(
      "20\\~25 and 30\\~35\n\nTail",
    );
  });

  it.each([
    ["Costs $5 today. Use lm(y~x) now.", "Costs $5 today. Use lm(y\\~x) now."],
    [
      "Price is $5.\n\nUse lm(y~x) here.",
      "Price is $5.\n\nUse lm(y\\~x) here.",
    ],
    ["Some prose\n    lm(y~x)", "Some prose\n    lm(y\\~x)"],
    ["- a\n    - b uses x~y", "- a\n    - b uses x\\~y"],
  ])("keeps escaping prose near currency and indentation: %j", (text, out) => {
    expect(tailBoundedRemend(text)).toBe(out);
    expect(tailBoundedRemend(`${text}\n\nTail`)).toBe(`${out}\n\nTail`);
  });

  it.each([
    ["backtick fence", "```r\nlm(y~x)\n```"],
    ["tilde fence", "~~~r\nlm(y~x)\n~~~"],
    ["display math", "$$\na~b\n$$"],
    ["single-line display math", "$$a~b$$"],
    ["fence with a list comparison", "~~~\n- > 25\n~~~"],
    ["fence inside display math", "$$\n```\na~b\n```\n$$"],
  ])("leaves a settled %s untouched", (_, block) => {
    const text = `${block}\n\nTail`;
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["indented code", "Intro\n\n    lm(y~x)\n\nTail"],
    [
      "list-nested tilde fence",
      "- item\n\n    ~~~r\n    lm(y~x)\n    ~~~\n\nTail",
    ],
    [
      "deep-list fence with dedented body",
      "- outer\n  - inner\n\n    ~~~\nx~y\n    ~~~\n\nTail",
    ],
    ["empty-list-item nested fence", "-\n  ~~~r\n  lm(y~x)\n  ~~~\n\nTail"],
    [
      "paragraph-prefixed final fence",
      "Here is the model:\n~~~r\nlm(y~x)\n~~~",
    ],
    ["paragraph-prefixed final math", "The formula:\n$$\nx~y\n$$"],
    [
      "indented code followed by a fence",
      "Intro\n\n    code x~y\n~~~js\nfoo~bar\n~~~\n\nTail",
    ],
    [
      "fence markers inside indented code",
      "Intro\n\n    code\n    ~~~\n    x~y\n\nTail",
    ],
    ["adjacent final fences", "~~~js\na~b\n~~~\n~~~js\nc~d\n~~~"],
    ["tab-indented code", "Intro\n\n\tlm(y~x)\n\nTail"],
  ])("does not escape tildes inside %s", (_, text) => {
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("restores the outer list container after a nested item", () => {
    expect(
      tailBoundedRemend("- outer\n  - inner\n\n  outer paragraph\n\n    x~y"),
    ).toBe("- outer\n  - inner\n\n  outer paragraph\n\n    x\\~y");
  });

  it("preserves a list container across less-indented fence content", () => {
    expect(
      tailBoundedRemend("- item\n  ~~~\nx~y\n  ~~~\n\n    after x~y"),
    ).toBe("- item\n  ~~~\nx~y\n  ~~~\n\n    after x\\~y");
  });

  it("recognizes a fence at a list item's content start", () => {
    expect(tailBoundedRemend("- ~~~r\n  lm(y~x)\n  ~~~\n\n    after~x")).toBe(
      "- ~~~r\n  lm(y~x)\n  ~~~\n\n    after\\~x",
    );
  });

  it("preserves a list container across less-indented math content", () => {
    expect(tailBoundedRemend("- item\n  $$\nx~y\n  $$\n\n    after x~y")).toBe(
      "- item\n  $$\nx~y\n  $$\n\n    after x\\~y",
    );
  });

  it("preserves a list container across a nested blockquote", () => {
    expect(tailBoundedRemend("- item\n\n  > quote\n\n    x~y")).toBe(
      "- item\n\n  > quote\n\n    x\\~y",
    );
  });

  it("preserves a list container across a lazy paragraph continuation", () => {
    expect(tailBoundedRemend("- item text\ncontinuing here\n\n    x~y")).toBe(
      "- item text\ncontinuing here\n\n    x\\~y",
    );
  });

  it.each([
    ["inline HTML", "<span>continuing</span>"],
    ["an autolink", "<https://example.com>"],
    ["a custom element", "<custom-element>continuing</custom-element>"],
  ])("preserves a list container across %s", (_, continuation) => {
    expect(tailBoundedRemend(`- item text\n${continuation}\n\n    x~y`)).toBe(
      `- item text\n${continuation}\n\n    x\\~y`,
    );
  });

  it.each([
    ["an ATX heading", "# heading"],
    ["a thematic break", "---"],
    ["an HTML block", "<div>"],
  ])("ends a list container at %s", (_, block) => {
    const text = `- item\n${block}\n\n    x~y`;
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each(["* * *", "- - -"])(
    "does not open a list container for the thematic break %s",
    (thematicBreak) => {
      const text = `${thematicBreak}\n\n    lm(y~x)`;
      expect(tailBoundedRemend(text)).toBe(text);
    },
  );

  it("ends a list container after a fenced block", () => {
    const text = "- item\n  ~~~\n  code\n  ~~~\nnext para\n\n    lm(y~x)";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("finds a heading after tab padding on a list marker", () => {
    const text = "-\t# heading\nnext para\n\n    x~y";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["a bullet", "-  item\n\n      x~y", "-  item\n\n      x\\~y"],
    [
      "an ordered marker",
      "10.  item\n\n       x~y",
      "10.  item\n\n       x\\~y",
    ],
  ])("uses the actual padding after %s", (_, text, expected) => {
    expect(tailBoundedRemend(text)).toBe(expected);
  });

  it.each([
    ["a marker-only item", "-  \n\n      x~y"],
    ["a CRLF marker-only item", "- \r\n\r\n      x~y"],
    ["a tab after an indented marker", "  -\titem\n\n        x~y"],
  ])("keeps indented code after %s protected", (_, text) => {
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("ignores list markers inside a root fence", () => {
    const text = "~~~\n- fake item\n  ~~~\n\n    x~y";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("keeps a list-shaped fence marker literal inside a root fence", () => {
    const text = "~~~\n- ~~~\ncode~x\n~~~\n\nTail";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["tilde fence", "Intro\n\n~~~r\nlm(y~x)\n~~~"],
    ["display math", "Intro\n\n$$\na~b\n$$"],
    ["tilde fence with trailing newline", "Intro\n\n~~~r\nlm(y~x)\n~~~\n"],
  ])("leaves a closed %s untouched when it is the final block", (_, text) => {
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("repairs text that follows a closed final-block fence", () => {
    expect(tailBoundedRemend("Intro\n\n~~~r\nlm(y~x)\n~~~\nafter **bold")).toBe(
      "Intro\n\n~~~r\nlm(y~x)\n~~~\nafter **bold**",
    );
  });

  it("still repairs a final block that starts with prose before a fence", () => {
    const text = "intro\n\npara **bold\n~~~\nx~y\n~~~";
    expect(tailBoundedRemend(text)).toBe(
      "intro\n\npara **bold**\n~~~\nx~y\n~~~",
    );
  });

  it.each([
    ["single backtick", "`$$`"],
    ["double backtick", "``$$``"],
    ["double backtick holding a single one", "``a ` $$``"],
    ["double backtick around a single-backtick span", "`` `$$` ``"],
  ])("ignores $$ inside a %s code span when placing math blocks", (_, span) => {
    const text = `${span}\n\n$$\na~b\n$$\n\nTail`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("does not open a code span at an escaped backtick", () => {
    const text = "x \\` $$ a ` $$ b\n\n$$\nc~d\n$$\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("carries an open code span across lines of its paragraph", () => {
    const text = "a `x\n1 $$ 2` b\n\n$$\na~b\n$$\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("ends an open code span at a blank line", () => {
    const text = "a `x\n\n$$\n1~2\n$$\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("lets a line-start $$ interrupt an open code span", () => {
    const text = "a `code\n$$` b\n\n$$\nx~y\n$$\n\nTail";
    expect(tailBoundedRemend(text)).toBe(remend(text));
    expect(tailBoundedRemend(text)).toContain("x\\~y");
  });

  it.each([
    ["an escaped delimiter", "Start $$ a \\$$ b\n\nTail **b"],
    ["a delimiter inside code", "Start $$ a `$$` b\n\nTail **b"],
  ])("does not use %s as an inline math closer", (_, text) => {
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(`${text}**`);
  });

  it("recognizes line-start display math with metadata", () => {
    const text = "$$x + y\n$$\n\nUse lm(y~x)\n\n$$\na~b\n$$\n\nTail";
    expect(tailBoundedRemend(text)).toBe(
      "$$x + y\n$$\n\nUse lm(y\\~x)\n\n$$\na~b\n$$\n\nTail",
    );
  });

  it("recognizes display math at a list item's content start", () => {
    const text = "para **bold\n\n- $$\nx~y\n$$\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("recognizes display math after tab padding on a list marker", () => {
    const text = "para **bold\n\n-\t$$\nx~y\n$$\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("keeps the list container opened by display math", () => {
    expect(tailBoundedRemend("- $$\n  x = 1\n  $$\n\n    tail~z")).toBe(
      "- $$\n  x = 1\n  $$\n\n    tail\\~z",
    );
  });

  it("keeps list containers ordered when math closes on a marker line", () => {
    expect(
      tailBoundedRemend(
        "- outer\n      - inner\n        $$\nx~y\n  - $$\n\n      tail~z",
      ),
    ).toBe("- outer\n      - inner\n        $$\nx~y\n  - $$\n\n      tail\\~z");
  });

  it("keeps the settled paragraph before indented code unchanged", () => {
    const text = "intro\n\npara **bold\n\n    code";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("    code"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("does not treat a four-column marker interrupting prose as a fence", () => {
    const text = "Paragraph\n    ~~~\n    x~y";
    expect(tailBoundedRemend(text)).toBe(remend(text));
  });

  it("does not open a list-shaped fence inside indented code", () => {
    expect(
      tailBoundedRemend("Intro\n\n    - ~~~\n    body\n\nMore **bold"),
    ).toBe("Intro\n\n    - ~~~\n    body\n\nMore **bold**");
  });

  it("ends list context at a root fence before indented code", () => {
    const text = "- item\n  - inner\n~~~\ncode\n~~~\n\n    x~y";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("opens a code span at a backtick after an escaped backslash", () => {
    const text = "x \\\\` $$ ` y\n\n$$\nc~d\n$$\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["tilde fence", "~~~r\nlm(y~x)\n~~~"],
    ["display math", "$$\na~b\n$$"],
    ["blockquoted display math", "> $$\n> a~b\n> $$"],
    ["blockquoted tilde fence", "> ~~~r\n> lm(y~x)\n> ~~~"],
  ])("leaves a %s untouched when it is the whole message", (_, text) => {
    expect(tailBoundedRemend(text)).toBe(text);
    expect(tailBoundedRemend(`${text}\n\nTail`)).toBe(`${text}\n\nTail`);
  });

  it("repairs text that follows a whole-message fence without a blank line", () => {
    expect(tailBoundedRemend("~~~r\nlm(y~x)\n~~~\nafter **bold")).toBe(
      "~~~r\nlm(y~x)\n~~~\nafter **bold**",
    );
  });

  it("does not close a root fence on a quoted marker", () => {
    const text = "```md\n> ```\n\n> x~y\n> ```\n```\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("ends a quoted fence with its blockquote", () => {
    expect(
      tailBoundedRemend("> ```js\n> foo() 1~2\n\nBack x~y and **bold"),
    ).toBe("> ```js\n> foo() 1~2\n\nBack x\\~y and **bold**");
  });

  it("moves the boundary past a quoted fence that ends with its blockquote", () => {
    const text = "para\n\n> intro **bold\n> ```js\n> foo()\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
    const tilde = "para\n\n> intro\n> ~~~r\n> lm(y~x)\n\nTail";
    expect(tailBoundedRemend(tilde)).toBe(tilde);
  });

  it("keeps the boundary out of math when a quoted fence ends inside it", () => {
    const closed = "$$\n> ```js\n> a~b\nmore\n$$\n\nTail";
    expect(findRemendWindowStart(closed)).toBe(closed.indexOf("Tail"));
    expect(tailBoundedRemend(closed)).toBe(closed);
    const open = "$$\n> ```js\n> a~b\nmore";
    expect(findRemendWindowStart(open)).toBe(0);
    expect(blocksOf(tailBoundedRemend(open))).toEqual(blocksOf(remend(open)));
  });

  it("reads a bare quote marker as blank only inside a blockquote", () => {
    const inside = "> a **bold\n>\n> b";
    expect(findRemendWindowStart(inside)).toBe(inside.indexOf("> b"));
    expect(tailBoundedRemend(inside)).toBe(inside);
    const opening = "Intro\n\n~~~r\nlm(y~x)\n~~~\n\n>";
    expect(findRemendWindowStart(opening)).toBe(opening.length - 1);
    expect(tailBoundedRemend(opening)).toBe(opening);
  });

  it("measures fence indentation inside the blockquote", () => {
    const text =
      "> intro\n>\n>   ```js\n>   a~b\n> ```\n>\n> after **bold\n>\n> Tail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("> Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("closes a quoted fence on a quoted marker", () => {
    expect(tailBoundedRemend("> ```js\n> foo() 1~2\n> ```\n\nx~y **bold")).toBe(
      "> ```js\n> foo() 1~2\n> ```\n\nx\\~y **bold**",
    );
  });

  it("opens a new root fence at a root marker inside a quoted fence", () => {
    const text = "> ```js\n> foo() 1~2\n```\nx~y\n\nTail **bold";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("```\nx"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("reads a backtick run with a backtick in its info string as inline code", () => {
    const text = "```code```\n\n20~25\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe("```code```\n\n20\\~25\n\nTail");
  });

  it("escapes prose on both sides of protected blocks", () => {
    expect(
      tailBoundedRemend(
        "20~25\n\n~~~\nx~y\n~~~\n\n$$\na~b\n$$ and 1~2\n\n30~35\n\n- > 25\n\nTail",
      ),
    ).toBe(
      "20\\~25\n\n~~~\nx~y\n~~~\n\n$$\na~b\n$$ and 1\\~2\n\n30\\~35\n\n- \\> 25\n\nTail",
    );
  });

  it("protects only $$ blocks that open a line", () => {
    expect(tailBoundedRemend("See $$a~b$$ here\n\nTail")).toBe(
      "See $$a\\~b$$ here\n\nTail",
    );
    expect(tailBoundedRemend("`$$` x~y\n\n`$$` 1~2\n\nTail")).toBe(
      "`$$` x\\~y\n\n`$$` 1\\~2\n\nTail",
    );
  });

  it("runs custom handlers on the prose between protected blocks", () => {
    expect(
      tailBoundedRemend("Draft\n\n~~~\nDraft\n~~~\n\nDraft\n\nTail", {
        handlers: [
          { name: "rename", handle: (text) => text.replace("Draft", "Final") },
        ],
      }),
    ).toBe("Final\n\n~~~\nDraft\n~~~\n\nFinal\n\nTail");
  });

  it("hands custom handlers each prose segment and the final block in order", () => {
    const calls: string[] = [];
    tailBoundedRemend("Draft\n\n~~~\nDraft\n~~~\n\nDraft\n\nTail", {
      handlers: [
        {
          name: "record",
          handle: (text) => {
            calls.push(text);
            return text;
          },
        },
      ],
    });
    expect(calls).toEqual(["Draft\n\n", "\n\nDraft\n\n", "Tail"]);
  });

  it("does not relocate a separator emitted earlier by a custom handler", () => {
    expect(
      tailBoundedRemend("Draft\n\n~~~\nDraft\n~~~", {
        handlers: [
          {
            name: "rewrite",
            handle: (text) =>
              text === "Draft\n\n" ? "Heading\n\nFinal\n" : text,
          },
        ],
      }),
    ).toBe("Heading\n\nFinal\n~~~\nDraft\n~~~");
  });

  it("does not relocate a separator when a prefix handler appends content", () => {
    expect(
      tailBoundedRemend("Draft\n\n~~~\nDraft\n~~~", {
        handlers: [
          {
            name: "append",
            handle: (text) => (text === "Draft\n\n" ? `${text}More\n\n` : text),
          },
        ],
      }),
    ).toBe("Draft\n\nMore\n\n~~~\nDraft\n~~~");
  });

  it("keeps an unclosed fence inside the window", () => {
    const text = `intro\n\n\`\`\`python\n${"x = 1\n".repeat(500)}print("$dollar")`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("```python"));
    expect(blocksOf(tailBoundedRemend(text))).toEqual(blocksOf(remend(text)));
  });

  it("bounds the window to the tail paragraph when no fence is open", () => {
    const text = `para one\n\npara two\n\npara three with **bold`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("para three"));
    expect(tailBoundedRemend(text)).toBe(remend(text));
  });

  it("widens the window across an open $$ math block", () => {
    const text = `before\n\n$$\n\\frac{a}{b}`;
    expect(findRemendWindowStart(text)).toBeLessThanOrEqual(text.indexOf("$$"));
    expect(blocksOf(tailBoundedRemend(text))).toEqual(blocksOf(remend(text)));
  });

  it("leaves closed constructs untouched", () => {
    const text = `done **bold** and \`code\`\n\n\`\`\`js\nconst a = 1\n\`\`\`\n\nlast line.`;
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("keeps incomplete link text when link and image repair are disabled", () => {
    expect(
      tailBoundedRemend("a [dangling", { links: false, images: false }),
    ).toBe("a [dangling");
  });

  it("treats CRLF blank lines as block boundaries", () => {
    const text = `para one\r\n\r\npara two with **bold`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("para two"));
    expect(blocksOf(tailBoundedRemend(text))).toEqual(blocksOf(remend(text)));
  });

  it("ignores escaped math delimiters", () => {
    const text = "before\n\nescaped \\$$ marker\n\nlast **b";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("last"));
  });

  // The boundary pass runs on every streaming flush, so its cost has to stay
  // linear in the message. An unbounded search per line reads the rest of the
  // message before the loop rejects it, which no behavioural assertion can see.
  it("searches once per line", () => {
    const text = `${"20~25 and $$5\n\n".repeat(50)}tail **b`;
    let searches = 0;
    const original = String.prototype.indexOf;
    String.prototype.indexOf = function (this: string, ...args) {
      searches += 1;
      return original.apply(this, args);
    };
    try {
      findRemendWindowStart(text);
    } finally {
      String.prototype.indexOf = original;
    }

    expect(searches).toBe(text.split("\n").length);
  });

  it("matches full remend when $$ appears inside a math block", () => {
    for (const text of [
      "intro\n\n$$\nsome content with $$ inside\n\nmore content",
      "p\n\n$$\nx\n$$\n\nafter $$ y $$ done\n\ntail **b",
    ]) {
      expect(blocksOf(tailBoundedRemend(text))).toEqual(blocksOf(remend(text)));
    }
  });
});
