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

  it("still repairs a final block that starts with prose before a fence", () => {
    const text = "intro\n\npara **bold\n~~~\nx~y\n~~~";
    expect(tailBoundedRemend(text)).toBe(remend(text));
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
