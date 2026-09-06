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

describe("tailBoundedRemend", () => {
  it("matches full remend block output at every streaming prefix", () => {
    for (let end = 1; end <= CORPUS.length; end++) {
      const prefix = CORPUS.slice(0, end);
      expect(
        parseMarkdownIntoBlocks(tailBoundedRemend(prefix)),
        `prefix length ${end}`,
      ).toEqual(parseMarkdownIntoBlocks(remend(prefix)));
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

  it("keeps an unclosed fence inside the window", () => {
    const text = `intro\n\n\`\`\`python\n${"x = 1\n".repeat(500)}print("$dollar")`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("```python"));
  });

  it("bounds the window to the tail paragraph when no fence is open", () => {
    const text = `para one\n\npara two\n\npara three with **bold`;
    expect(findRemendWindowStart(text)).toBe(text.indexOf("para three"));
  });

  it("widens the window across an open $$ math block", () => {
    const text = `before\n\n$$\n\\frac{a}{b}`;
    expect(findRemendWindowStart(text)).toBeLessThanOrEqual(text.indexOf("$$"));
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
  });
});
