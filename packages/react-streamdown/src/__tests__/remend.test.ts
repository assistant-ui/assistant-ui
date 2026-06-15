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
// even if the raw strings differ.
const blocksOf = (text: string): string[] => parseMarkdownIntoBlocks(text);

describe("tailBoundedRemend", () => {
  it("matches full remend block output at every streaming prefix", () => {
    for (let end = 1; end <= CORPUS.length; end++) {
      const prefix = CORPUS.slice(0, end);
      expect(
        blocksOf(tailBoundedRemend(prefix)),
        `prefix length ${end}: ${JSON.stringify(prefix.slice(-60))}`,
      ).toEqual(blocksOf(remend(prefix)));
    }
  });

  it("repairs an unclosed fence opened early in a long message", () => {
    const text = `intro\n\n\`\`\`python\n${"x = 1\n".repeat(500)}print("$dollar")`;
    expect(blocksOf(tailBoundedRemend(text))).toEqual(blocksOf(remend(text)));
    expect(findRemendWindowStart(text)).toBe(text.indexOf("```python"));
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

  it("forwards remend options", () => {
    const text = "a [dangling";
    expect(tailBoundedRemend(text, { links: false })).toBe(
      remend(text, { links: false }),
    );
  });
});
