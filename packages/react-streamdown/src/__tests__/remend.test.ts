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
// repair deliberately leaves those alone, and only outside an open fence, whose
// body it copies raw where remend drops a trailing space or completes emphasis
// it cannot see is code.
const blocksOf = (text: string): string[] => parseMarkdownIntoBlocks(text);

const opensFence = (block: string): boolean => /^\s*(```|~~~)/.test(block);

describe("tailBoundedRemend", () => {
  it("keeps settled blocks fixed and repairs the tail like remend at every streaming prefix", () => {
    const finalBlocks = blocksOf(tailBoundedRemend(CORPUS));
    expect(finalBlocks).toEqual(blocksOf(remend(CORPUS)));
    for (let end = 1; end <= CORPUS.length; end++) {
      const prefix = CORPUS.slice(0, end);
      const blocks = blocksOf(tailBoundedRemend(prefix));
      const settled = blocks.slice(0, -1);
      expect(settled, `prefix length ${end}`).toEqual(
        finalBlocks.slice(0, settled.length),
      );
      const tail = blocks.at(-1)!;
      if (!opensFence(tail)) {
        expect(tail, `prefix length ${end}`).toEqual(
          blocksOf(remend(prefix)).at(-1),
        );
      }
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

  it.each([
    ["tilde fence", "Here is the model:\n~~~r\nlm(y~x)\n~~~"],
    ["display math", "The formula:\n$$\nx~y\n$$"],
    ["second fence", "~~~\nx~y\n~~~\n~~~\na~b\n~~~"],
    [
      "fence in a list item",
      "- item\n\n    ~~~r\n    lm(y~x)\n    ~~~\n\nTail",
    ],
    ["open tilde fence", "Intro\n\n~~~\nx~y\nx = **y"],
  ])("leaves the %s untouched inside the final block", (_, text) => {
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("escapes the prose between blocks inside the final block", () => {
    expect(tailBoundedRemend("~~~\nx~y\n~~~\nmid 1~2\n~~~\na~b\n~~~")).toBe(
      "~~~\nx~y\n~~~\nmid 1\\~2\n~~~\na~b\n~~~",
    );
  });

  it.each([
    ["bold", "Use **this", "```r\nlm(y~x)\n```"],
    ["italic", "Use *this", "```\nx = a\n```"],
    ["strikethrough", "Old ~~this", "```\nx\n```"],
    ["link", "See [docs](https://exa", "```\nx\n```"],
    ["bold", "Note **this", "$$\nx\n$$"],
    ["bold", "Use **this", "```r\nlm(y~x)"],
    ["bold", "Note **this", "~~~\nx~y"],
  ])(
    "settles a paragraph with dangling %s that %j interrupts",
    (_, paragraph, block) => {
      const text = `${paragraph}\n${block}`;
      expect(tailBoundedRemend(text)).toBe(text);
      expect(tailBoundedRemend(`intro\n\n${text}`)).toBe(`intro\n\n${text}`);
    },
  );

  it("gives an open $$ block nothing but its closing marker", () => {
    expect(tailBoundedRemend("The formula:\n$$\nx~y **b `c")).toBe(
      "The formula:\n$$\nx~y **b `c\n$$",
    );
    expect(tailBoundedRemend("The formula:\n$$\nx~y", { katex: false })).toBe(
      "The formula:\n$$\nx~y",
    );
  });

  it("repairs the prose after a block that interrupted a paragraph", () => {
    expect(tailBoundedRemend("Use **this\n```\nx\n```\nafter **bold")).toBe(
      "Use **this\n```\nx\n```\nafter **bold**",
    );
  });

  it.each([
    ["tilde fence on a list marker line", "- ~~~r\n  lm(y~x)\n  ~~~"],
    [
      "backtick fence on an ordered list marker line",
      "1. ```bash\n   echo a~b\n   ```",
    ],
    ["display math block on a list marker line", "- $$\n  x~y\n  $$"],
    [
      "display math block after a tab-padded list marker",
      "-\t$$\n    x~y\n    $$",
    ],
    ["fence after nested list markers", "- - ~~~\n    x~y\n    ~~~"],
  ])("protects a %s", (_, block) => {
    const text = `${block}\n\n20~25 to 30~35\n\nTail`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(
      `${block}\n\n20\\~25 to 30\\~35\n\nTail`,
    );
    expect(tailBoundedRemend(`${block}\n\nafter **bold`)).toBe(
      `${block}\n\nafter **bold**`,
    );
  });

  it("leaves an open fence on a list marker line untouched", () => {
    const text = "Intro\n\n- ~~~r\n  lm(y~x)\n  a **b";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("- ~~~r"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("closes a fence only on a marker indented at most three columns past its opener", () => {
    const root = "~~~\n    ~~~\nx~y\n~~~\n\nTail";
    expect(findRemendWindowStart(root)).toBe(root.indexOf("Tail"));
    expect(tailBoundedRemend(root)).toBe(root);
    const dedented = "  ~~~\nx~y\n~~~\n\nTail";
    expect(findRemendWindowStart(dedented)).toBe(dedented.indexOf("Tail"));
    expect(tailBoundedRemend(dedented)).toBe(dedented);
    const nested = "- item\n    ~~~\n    x~y\n      ~~~\n\nTail";
    expect(findRemendWindowStart(nested)).toBe(nested.indexOf("Tail"));
    expect(tailBoundedRemend(nested)).toBe(nested);
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
    expect(tailBoundedRemend(text)).toBe(
      "a `code\n$$` b\n\n$$\nx\\~y\n$$\n\nTail\n$$",
    );
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

  it("hands custom handlers each run of prose in order", () => {
    const record = (calls: string[]) => ({
      handlers: [
        {
          name: "record",
          handle: (text: string) => {
            calls.push(text);
            return text;
          },
        },
      ],
    });
    const settled: string[] = [];
    tailBoundedRemend(
      "Draft\n\n~~~\nDraft\n~~~\n\nDraft\n\nTail",
      record(settled),
    );
    expect(settled).toEqual(["Draft\n\n", "\n\nDraft\n\n", "Tail"]);
    const interrupted: string[] = [];
    tailBoundedRemend("Draft\n~~~\nDraft\n~~~\nTail", record(interrupted));
    expect(interrupted).toEqual(["Draft\n", "\nTail"]);
    const open: string[] = [];
    tailBoundedRemend("Draft\n$$\nDraft", record(open));
    expect(open).toEqual(["Draft\n"]);
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
    const text = `${"20~25\n\n".repeat(50)}tail **b`;
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
