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
    ["pre", "<pre>\na~b~c\n</pre>"],
    ["script", "<script>\na~b~c\n</script>"],
    ["style", "<style>\na~b~c\n</style>"],
    ["textarea", "<textarea>\na~b~c\n</textarea>"],
    ["comment", "<!--\na~b~c\n-->"],
    ["processing instruction", "<?xml\na~b~c\n?>"],
    ["declaration", "<!DOCTYPE html\na~b~c\n>"],
    ["CDATA", "<![CDATA[\na~b~c\n]]>"],
    ["one-line pre", "<pre>a~b~c</pre>"],
  ])("leaves a raw HTML %s block untouched", (_, block) => {
    const text = block + "\n\nTail";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("keeps settled blocks fixed at every streaming prefix across HTML blocks", () => {
    const text =
      "Intro a~b~c\n\n<details>\n<summary>More a~b~c</summary>\n\nHidden **detail** x~y\n</details>\n\n<pre>\nx~y z~w\n\n</pre>\n\nTail a~b~c";
    const finalBlocks = blocksOf(tailBoundedRemend(text));
    for (let end = 1; end <= text.length; end++) {
      const blocks = blocksOf(tailBoundedRemend(text.slice(0, end)));
      const settled = blocks.slice(0, -1);
      expect(settled, `prefix length ${end}`).toEqual(
        finalBlocks.slice(0, settled.length),
      );
    }
  });

  it("ends a raw HTML block at any raw end tag", () => {
    expect(tailBoundedRemend("<pre>\na~b~c\n</script>\nx~y z~w\n\nTail")).toBe(
      "<pre>\na~b~c\n</script>\nx\\~y z\\~w\n\nTail",
    );
  });

  it.each([
    ["known tag", "<div>\na~b~c"],
    ["complete unknown tag", "<custom-element>\na~b~c"],
    ["self-closing raw tag name", "<pre/>\na~b~c"],
    ["body line holding a bare quote marker", "<div>\n>\na~b~c"],
  ])(
    "protects an HTML block until its blank-line terminator: %s",
    (_, block) => {
      const text = block + "\n\nTail 1~2";
      expect(tailBoundedRemend(text)).toBe(block + "\n\nTail 1\\~2");
    },
  );

  it("protects an HTML block that is still open at the end", () => {
    const text = "<pre>\na~b~c";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("copies an open HTML block raw through an unterminated blank line", () => {
    const text = "<div>\na~b~c\n ";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("does not protect inline HTML as a block", () => {
    expect(tailBoundedRemend("Use <pre> a~b~c\n\nTail")).toBe(
      "Use <pre> a\\~b\\~c\n\nTail",
    );
  });

  it("keeps fence markers inside an HTML block body raw", () => {
    const text = "<pre>\n> ~~~\n\n> a~b~c\n</pre>\n\nTail";
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["one list marker", "- <div>\n  a~b~c"],
    ["an ordered marker wider than three columns", "10. <pre>\n    a~b~c"],
    ["nested list markers", "- - <pre>\n    a~b~c"],
    ["a sibling ordered item marker", "1. Intro\n2. <pre>\n   a~b~c"],
  ])("protects HTML opened after %s", (_, block) => {
    expect(tailBoundedRemend(block + "\n\nTail 1~2")).toBe(
      block + "\n\nTail 1\\~2",
    );
  });

  it("ends a quoted HTML block with its blockquote", () => {
    expect(tailBoundedRemend("> <div>\n> a~b~c\nx~y z~w")).toBe(
      "> <div>\n> a~b~c\nx\\~y z\\~w",
    );
  });

  it("ends a quoted HTML block at a blank line inside its blockquote", () => {
    expect(tailBoundedRemend("> <div>\n> a~b~c\n>\n> x~y z~w")).toBe(
      "> <div>\n> a~b~c\n>\n> x\\~y z\\~w",
    );
  });

  it.each([
    ["a blank line", "Intro\n\n<span>\na~b~c"],
    ["a closed fence", "~~~\ncode\n~~~\n<span>\na~b~c"],
    ["a heading", "# Title\n<span>\na~b~c"],
    ["a thematic break", "***\n<span>\na~b~c"],
    ["a setext underline", "Title\n---\n<span>\na~b~c"],
    ["the start of a list item", "Intro\n- <span>\n  a~b~c"],
    ["the start of a blockquote", "Intro\n> <span>\n> a~b~c"],
    ["a thematic break in a list item", "1. ---\n   <span>\n   a~b~c"],
  ])("opens an HTML block at a lone tag line after %s", (_, block) => {
    expect(tailBoundedRemend(block + "\n\nTail 1~2")).toBe(
      block + "\n\nTail 1\\~2",
    );
  });

  it.each([
    [
      "a lone tag line",
      "Price range\n<br>\nfrom 5~10 to 20~30",
      "Price range\n<br>\nfrom 5\\~10 to 20\\~30",
    ],
    [
      "a quoted lone tag line",
      "> Price range\n> <br>\n> from 5~10 to 20~30",
      "> Price range\n> <br>\n> from 5\\~10 to 20\\~30",
    ],
    [
      "an ordered item numbered other than 1",
      "Price range\n2. <pre>\n   from 5~10 to 20~30",
      "Price range\n2. <pre>\n   from 5\\~10 to 20\\~30",
    ],
  ])("escapes the paragraph %s continues", (_, text, expected) => {
    expect(tailBoundedRemend(text + "\n\nTail")).toBe(expected + "\n\nTail");
  });

  it.each([
    [
      "an HTML block opened on a list item's continuation line ends with the item",
      "- Intro\n  <pre>\nx~y **bold",
      "- Intro\n  <pre>\nx\\~y **bold**",
    ],
    [
      "a quote marker indented four columns leaves the tag line paragraph text",
      "Intro\n    > <span>\n    > a~b **bold",
      "Intro\n    > <span>\n    > a\\~b **bold**",
    ],
    [
      "an equals line opening a blockquote is paragraph text, not an underline",
      "Intro\n> ===\n> <span>\n> a~b **bold",
      "Intro\n> ===\n> <span>\n> a\\~b **bold**",
    ],
  ])("repairs the prose that follows when %s", (_, text, expected) => {
    expect(tailBoundedRemend(text)).toBe(expected);
  });

  it("completes the paragraph a lone tag line continues", () => {
    expect(
      tailBoundedRemend(
        'Here is the chart:\n<img src="x.png">\nRevenue is **up',
      ),
    ).toBe('Here is the chart:\n<img src="x.png">\nRevenue is **up**');
  });

  it.each([
    ["lone tag line", "$$\n<br>\n$$"],
    ["raw tag line", "$$\n<pre>\n$$"],
  ])("reads a %s inside display math as math", (_, block) => {
    expect(tailBoundedRemend(block + "\n\nTail a~b~c")).toBe(
      block + "\n\nTail a\\~b\\~c",
    );
  });

  it("does not open an HTML block in indented code", () => {
    expect(tailBoundedRemend("    <pre>\nx~y z~w\n\nTail")).toBe(
      "    <pre>\nx\\~y z\\~w\n\nTail",
    );
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
    [
      "fence with tab indented content on a list marker line",
      "- ~~~\n\tx~y\n\t~~~",
    ],
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

  it.each([
    ["an unindented closer", "- ~~~\n  x~y\n~~~\n\n20~25 **bol", "~~~\n\n"],
    ["unindented content", "1. ```bash\nnpm i\n```\n\nThen **bol", "npm i"],
  ])(
    "ends a fence opened on a list marker line with its item at %s",
    (_, text, next) => {
      expect(findRemendWindowStart(text)).toBe(text.indexOf(next));
      expect(tailBoundedRemend(text)).toBe(text);
    },
  );

  it("ends a $$ block opened on a list marker line with its item", () => {
    expect(tailBoundedRemend("- $$\nx~y\n$$\n\nThen 20~25")).toBe(
      "- $$\nx\\~y\n$$\n\nThen 20~25\n$$",
    );
  });

  it("repairs the text after a list-shaped fence line in indented code", () => {
    const text = "Intro\n\n    - ~~~\n    code\n\nTail 20~25";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(
      "Intro\n\n    - ~~~\n    code\n\nTail 20\\~25",
    );
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
    ["a single backtick span", "`$$`"],
    ["a double backtick span", "``$$``"],
    ["a double backtick span holding a single one", "``a ` $$``"],
    ["a double backtick span around a single-backtick span", "`` `$$` ``"],
    ["a span after an escaped backtick", "x \\` $$ a ` $$ b"],
    ["a span after an escaped backslash", "x \\\\` $$ ` y"],
    ["a span across lines", "a `x\n1 $$ 2` b"],
    ["an unclosed span", "a `x"],
    ["a shell command", "Run echo $$ in bash"],
    ["a price tier", "Price: $$$ tier"],
    ["a text math pair across lines", "See $$x\nand y$$ here"],
  ])("opens no math block at a $$ inside %s", (_, prose) => {
    const text = `${prose}\n\n$$\na~b\n$$\n\nTail`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("opens a math block at a line-start $$ after an unclosed backtick", () => {
    const text = "a `code\n$$` b\n\n$$\nx~y\n$$\n\nTail";
    expect(tailBoundedRemend(text)).toBe(
      "a `code\n$$` b\n\n$$\nx\\~y\n$$\n\nTail\n$$",
    );
  });

  it("opens a math block at a $$ after a list marker after an unclosed backtick", () => {
    const text = "a `code\n- $$\n  x~y\n  $$\n\nTail 20~25";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(
      "a `code\n- $$\n  x~y\n  $$\n\nTail 20\\~25",
    );
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

  it("reads a fence marker inside display math as math", () => {
    const closed = "$$\n> ```js\n> a~b\nmore\n$$\n\nTail";
    expect(findRemendWindowStart(closed)).toBe(closed.indexOf("Tail"));
    expect(tailBoundedRemend(closed)).toBe(closed);
    const open = "$$\n> ```js\n> a~b\nmore";
    expect(findRemendWindowStart(open)).toBe(0);
    expect(blocksOf(tailBoundedRemend(open))).toEqual(blocksOf(remend(open)));
    const unpaired = "$$\n```\nx~y\n$$\n\n20~25\n\nTail";
    expect(findRemendWindowStart(unpaired)).toBe(unpaired.indexOf("Tail"));
    expect(tailBoundedRemend(unpaired)).toBe(
      "$$\n```\nx~y\n$$\n\n20\\~25\n\nTail",
    );
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
        "20~25\n\n~~~\nx~y\n~~~\n\n$$\na~b\n$$\n\n$$c~d$$ and 1~2\n\n30~35\n\n- > 25\n\nTail",
      ),
    ).toBe(
      "20\\~25\n\n~~~\nx~y\n~~~\n\n$$\na~b\n$$\n\n$$c~d$$ and 1\\~2\n\n30\\~35\n\n- \\> 25\n\nTail",
    );
  });

  it("closes display math only on a matching fence line", () => {
    const text = "$$\na $$ b\n$$\n\nx~y\n\nTail";
    expect(tailBoundedRemend(text)).toBe("$$\na $$ b\n$$\n\nx\\~y\n\nTail");
  });

  it.each([
    ["a shorter fence", "$$$\na~b\n$$\n\nTail"],
    ["a trailing-text fence", "$$\na~b\n$$ and 1~2\n\nTail"],
    ["an escaped fence", "$$\na~b\n\\$$\n\nTail"],
    ["a quoted fence", "$$\na~b\n> $$\n\nTail"],
    ["a fence indented four spaces", "$$\na~b\n    $$\n\nTail"],
  ])("keeps %s in an open display block", (_, text) => {
    expect(findRemendWindowStart(text)).toBe(0);
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("accepts a longer matching fence with trailing whitespace", () => {
    const text = "$$\na~b\n$$$  \n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it("ends a quoted $$ block with its blockquote", () => {
    const text = "> $$\n> a~b\nx~y z~w\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe("> $$\n> a~b\nx\\~y z\\~w\n\nTail");
    const reopened = "> $$\n> a~b\n$$\n\nx~y";
    expect(findRemendWindowStart(reopened)).toBe(reopened.indexOf("$$\n\n"));
    expect(tailBoundedRemend(reopened)).toBe(`${reopened}\n$$`);
  });

  it.each([
    ["$$ block", "> $$\n> a\n\n> ~~~\n> $$\n> x~y\n> ~~~"],
    ["fence", "> ~~~\n> a\n\n> ~~~\n> x~y\n> ~~~"],
  ])("ends a quoted %s at a blank line outside the quote", (_, text) => {
    expect(tailBoundedRemend(`${text}\n\nTail`)).toBe(`${text}\n\nTail`);
  });

  it.each([
    ["$$ block", "- $$\n  > $$\n  x~y\n  $$"],
    ["fence", "- ~~~\n  > ~~~\n  x~y\n  ~~~"],
  ])("reads a quote marker inside an unquoted %s as body", (_, text) => {
    expect(tailBoundedRemend(`${text}\n\nTail`)).toBe(`${text}\n\nTail`);
  });

  it.each([
    ["$$ block", "> $$\n> a\n>> $$\n> x~y"],
    ["tilde fence", "> ~~~\n> a\n>> ~~~\n> x~y z~w"],
    ["backtick fence", "> ```\n> a\n>> ```\n> x~y z~w"],
  ])("reads a deeper quote marker inside a quoted %s as body", (_, block) => {
    const text = `${block}\n\nTail`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    [
      "$$ block at a shallower line",
      ">> $$\n>> a\n> x~y z~w",
      ">> $$\n>> a\n> x\\~y z\\~w",
    ],
    [
      "fence at a shallower line",
      ">> ~~~\n>> a\n> x~y z~w",
      ">> ~~~\n>> a\n> x\\~y z\\~w",
    ],
    [
      "$$ block at a bare shallower marker",
      ">> $$\n>> a\n>\n>> x~y z~w",
      ">> $$\n>> a\n>\n>> x\\~y z\\~w",
    ],
    [
      "fence at a bare shallower marker",
      ">> ~~~\n>> a\n>\n>> x~y z~w",
      ">> ~~~\n>> a\n>\n>> x\\~y z\\~w",
    ],
  ])("ends a nested %s", (_, text, out) => {
    expect(tailBoundedRemend(`${text}\n\nTail`)).toBe(`${out}\n\nTail`);
  });

  it("measures a quoted list item's content column up to a deeper quote marker", () => {
    const text = "> - ~~~\n>   > a~b c~d\n>   ~~~\n\nTail";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["three dollars opened", "$$$\na~b"],
    ["a blockquote holds", "> $$\n> a~b"],
    ["opened on a list marker line", "- $$\n  a~b"],
  ])("adds no $$ to an open block that %s", (_, block) => {
    const text = `Intro\n\n${block}`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf(block));
    expect(tailBoundedRemend(text)).toBe(text);
  });

  it.each([
    ["", "$$a~b$$ and 1~2", "$$a~b$$ and 1\\~2"],
    [" after a backslash", "$$a~b\\$$ and 1~2", "$$a~b\\$$ and 1\\~2"],
    [" below an unpaired run", "$$a$b\n$$$c~d$$$", "$$a$b\n$$$c~d$$$"],
  ])(
    "protects inline math that starts a line up to its closing run%s",
    (_, text, out) => {
      expect(tailBoundedRemend(`${text}\n\nTail`)).toBe(`${out}\n\nTail`);
    },
  );

  it("leaves a line-start run with no pair on its line in the prose", () => {
    expect(tailBoundedRemend("$$a$b c~d~e\n# x$$\n\nTail")).toBe(
      "$$a$b c\\~d\\~e\n# x$$\n\nTail",
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

  it("does not treat an unmatched mid-line $$ as an open block", () => {
    const text = "Price: $$$ tier\n\nTail **b";
    expect(findRemendWindowStart(text)).toBe(text.indexOf("Tail"));
    expect(tailBoundedRemend(text)).toBe("Price: $$$ tier\n\nTail **b**");
  });

  it("keeps final-block completion for an unmatched mid-line $$", () => {
    expect(tailBoundedRemend("Price: $$$ tier **b")).toBe(
      "Price: $$$ tier **b**$$",
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
