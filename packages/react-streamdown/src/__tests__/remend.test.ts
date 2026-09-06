import { describe, expect, it } from "vitest";
import { findRemendWindowStart, tailBoundedRemend } from "../remend";

describe("tailBoundedRemend", () => {
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
