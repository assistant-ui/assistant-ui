import { describe, it, expect, vi } from "vitest";
import {
  rewriteLatexBracketDelimiters,
  rewriteCustomMathTags,
  normalizeMathDelimiters,
  escapeCurrencyDollars,
} from "./preprocess";

describe("rewriteLatexBracketDelimiters", () => {
  it("rewrites inline brackets to single dollars", () => {
    expect(rewriteLatexBracketDelimiters("a \\(x^2\\) b")).toBe("a $x^2$ b");
  });

  it("rewrites display brackets to double dollars", () => {
    expect(rewriteLatexBracketDelimiters("\\[a + b\\]")).toBe("$$a + b$$");
  });

  it("accepts a double leading backslash", () => {
    expect(rewriteLatexBracketDelimiters("\\\\(x\\\\)")).toBe("$x$");
  });

  it("trims the captured body", () => {
    expect(rewriteLatexBracketDelimiters("\\( x \\)")).toBe("$x$");
  });

  it("fences a multiline display body", () => {
    expect(
      rewriteLatexBracketDelimiters(
        "\\[\\begin{aligned}\nS_n-rS_n\n&=a-ar^{n+1}.\n\\end{aligned}\\]",
      ),
    ).toBe("$$\n\\begin{aligned}\nS_n-rS_n\n&=a-ar^{n+1}.\n\\end{aligned}\n$$");
  });

  it("keeps the CRLF after a multiline display closer", () => {
    expect(rewriteLatexBracketDelimiters("\\[a\nb\\]\r\nrest")).toBe(
      "$$\na\nb\n$$\r\nrest",
    );
    expect(
      rewriteLatexBracketDelimiters("> 1. \\[\n> a\n> \\]\r\n> Text"),
    ).toBe("> 1. \n>    $$\n>    a\n>    $$\r\n>    Text");
  });

  it("gives the fence markers their own lines mid-paragraph", () => {
    expect(rewriteLatexBracketDelimiters("Thus \\[a\nb\\] therefore.")).toBe(
      "Thus \n$$\na\nb\n$$\n therefore.",
    );
    expect(rewriteLatexBracketDelimiters("\\[a\nb\\].")).toBe(
      "$$\na\nb\n$$\n.",
    );
  });

  it("keeps a multiline display body inside its list item", () => {
    expect(rewriteLatexBracketDelimiters("- item \\[\na\nb\n\\]\n- next")).toBe(
      "- item \n  $$\n  a\n  b\n  $$\n- next",
    );
  });

  it("keeps a multiline display body inside its blockquote", () => {
    expect(
      rewriteLatexBracketDelimiters("> quote \\[\na\nb\n\\]\n> after"),
    ).toBe("> quote \n> $$\n> a\n> b\n> $$\n> after");
  });

  it("keeps quoted list display math and its following prose inside the item", () => {
    expect(
      normalizeMathDelimiters("> 1. \\[\n> a = 1\n>   b = 2\n> \\]\n> Text"),
    ).toBe("> 1. \n>    $$\n>    a = 1\n>      b = 2\n>    $$\n>    Text");
    expect(normalizeMathDelimiters(">1. $$\n>x = 1\n>$$\n>Text")).toBe(
      ">1. $$\n>    x = 1\n>    $$\n>    Text",
    );
    expect(normalizeMathDelimiters(">1. \\[\n>x = 1\n>\\]\n>Text")).toBe(
      ">1. \n>    $$\n>    x = 1\n>    $$\n>    Text",
    );
  });

  it("rewrites both displays in a quoted list item", () => {
    const result = normalizeMathDelimiters(
      "> 1. \\[\n> a\n> \\]\n> \\[\n> b\n> \\]",
    );
    expect(result).not.toContain("\\[");
    expect(result).not.toContain("\\]");
    expect(result.match(/\$\$/g)).toHaveLength(4);
  });

  it("keeps a later display on a re-indented line inside its list item", () => {
    expect(
      rewriteLatexBracketDelimiters(
        "> 1. \\[\n> a\n> \\]\n> then \\[\n> b\n> \\]",
      ),
    ).toBe(
      "> 1. \n>    $$\n>    a\n>    $$\n>    then \n>    $$\n>    b\n>    $$",
    );
  });

  it.each([
    [
      "> 1. \\[\n> a\n> \\]\n> \\[\n> b\n> \\]\n> Text",
      "> 1. \n>    $$\n>    a\n>    $$\n>    $$\n>    b\n>    $$\n>    Text",
    ],
    [
      "> 1. \\[\n> a\n> \\]\n> \\[\n> b\n> \\]\n> \\[\n> c\n> \\]\n> Text",
      "> 1. \n>    $$\n>    a\n>    $$\n>    $$\n>    b\n>    $$\n>    $$\n>    c\n>    $$\n>    Text",
    ],
  ])(
    "keeps chained displays and following text in a quoted list item",
    (input, expected) => {
      expect(rewriteLatexBracketDelimiters(input)).toBe(expected);
    },
  );

  it("keeps chained fenced displays inside a quoted list item", () => {
    expect(
      rewriteLatexBracketDelimiters(
        "> 1. \\[\n> a1\n> a2\n> \\]\n> \\[\n> b1\n> b2\n> \\]\n> Text",
      ),
    ).toBe(
      "> 1. \n>    $$\n>    a1\n>    a2\n>    $$\n>    $$\n>    b1\n>    b2\n>    $$\n>    Text",
    );
  });

  it("keeps an inline display after a multiline display in a quoted list item", () => {
    expect(
      rewriteLatexBracketDelimiters(
        "> 1. \\[\n> a\n> \\]\n> where \\[x\\] holds",
      ),
    ).toBe("> 1. \n>    $$\n>    a\n>    $$\n>    where $$x$$ holds");
  });

  it("keeps prose after a bracket closer in the quoted list item", () => {
    expect(normalizeMathDelimiters("> 1. \\[\n> a\n> \\] then\n> more")).toBe(
      "> 1. \n>    $$\n>    a\n>    $$\n>     then\n> more",
    );
    expect(rewriteLatexBracketDelimiters("> \\[\n> a\n> \\] then")).toBe(
      "> \n> $$\n> a\n> $$\n>  then",
    );
  });

  it("keeps prose after a math tag closer in the quoted list item", () => {
    expect(
      normalizeMathDelimiters("> 1. [/math]\n> a\n> [/math] then\n> more"),
    ).toBe("> 1. \n>    $$\n>    a\n>    $$\n>     then\n> more");
  });

  it("keeps display math and following prose in an ordered list then quote", () => {
    expect(
      normalizeMathDelimiters("1. > \\[\n   > a\n   > \\] then\n   > more"),
    ).toBe("1. > \n   > $$\n   > a\n   > $$\n   >  then\n   > more");
  });

  it("keeps display math and following prose at quote depth two", () => {
    expect(
      normalizeMathDelimiters("> - > \\[\n>   > a\n>   > \\] then\n>   > more"),
    ).toBe("> - > \n>   > $$\n>   > a\n>   > $$\n>   >  then\n>   > more");
  });

  it("rewrites a multiline bracket display whose TeX body contains backticks", () => {
    expect(
      normalizeMathDelimiters("1. \\[\n\\text{`x`} = 1\nE = mc^2\n\\]\nText"),
    ).toBe("1. \n   $$\n   \\text{`x`} = 1\n   E = mc^2\n   $$\nText");
    expect(rewriteLatexBracketDelimiters("\\[a `b` c\\]")).toBe(
      "\\[a `b` c\\]",
    );
    expect(rewriteLatexBracketDelimiters("\\[a\n`\\]`\nb\\]")).toBe(
      "$$\na\n`\\]`\nb\n$$",
    );
    const fenced = "\\[a\n`x`\n```\n\\]\n```\nb\\]";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(fenced);
  });

  it("dedents a body whose lines share an indentation", () => {
    expect(
      rewriteLatexBracketDelimiters("- item \\[\n  a\n  b\n\\]\n- next"),
    ).toBe("- item \n  $$\n  a\n  b\n  $$\n- next");
  });

  it("keeps relative indentation inside the body", () => {
    expect(
      rewriteLatexBracketDelimiters(
        "- item \\[\n\\begin{aligned}\n  a &= b\n\\end{aligned}\n\\]\n- next",
      ),
    ).toBe(
      "- item \n  $$\n  \\begin{aligned}\n    a &= b\n  \\end{aligned}\n  $$\n- next",
    );
  });

  it("keeps the block prefix when inline math precedes the match", () => {
    expect(
      rewriteLatexBracketDelimiters("- see \\(y\\) \\[\na\nb\n\\]\n- next"),
    ).toBe("- see $y$ \n  $$\n  a\n  b\n  $$\n- next");
  });

  it("keeps a body line that already carries the blockquote marker", () => {
    expect(rewriteLatexBracketDelimiters("> q \\[\n>a\n>b\n\\]\n> after")).toBe(
      "> q \n> $$\n>a\n>b\n> $$\n> after",
    );
  });

  it("gives a lazy body line the markers of its nested blockquote", () => {
    expect(
      rewriteLatexBracketDelimiters(">> q \\[\n>> a\n> b\n\\]\n>> after"),
    ).toBe(">> q \n>> $$\n>> a\n>> b\n>> $$\n>> after");
  });

  it("nests a body inside a list item written in a blockquote", () => {
    expect(
      rewriteLatexBracketDelimiters(">  - item \\[\na\nb\n\\]\n>  - next"),
    ).toBe(">  - item \n>    $$\n>    a\n>    b\n>    $$\n>  - next");
  });

  it("keeps math after an ordered-list marker and touching quote in both containers", () => {
    expect(normalizeMathDelimiters(">1) > \\[ > x\n>    > >\n>    > \\]")).toBe(
      ">1) > \n>    > $$\n>    >  > x\n>    > >\n>    > $$",
    );
  });

  it("keeps math after a bullet marker and touching quote in both containers", () => {
    expect(normalizeMathDelimiters(">* > \\[x\n>   > x\n>   > \\]")).toBe(
      ">* > \n>   > $$\n>   > x\n>   > x\n>   > $$",
    );
  });

  it("keeps math after nested list markers inside the inner quote", () => {
    expect(normalizeMathDelimiters("- - > \\[x\n    > a\n    > \\]")).toBe(
      "- - > \n    > $$\n    > x\n    > a\n    > $$",
    );
  });

  it.each([
    [
      "a bullet then an ordered marker, each touching a quote",
      ">- >1) \\[x\n>   >    a\n>   >    \\]",
      ">- >1) \n>   >    $$\n>   >    x\n>   >    a\n>   >    $$",
    ],
    [
      "two ordered markers, each touching a quote",
      ">1) >2) \\[x\n>    >    a\n>    >    \\]",
      ">1) >2) \n>    >    $$\n>    >    x\n>    >    a\n>    >    $$",
    ],
    [
      "nested list markers in a quote with a [/math] display",
      "> - 1. [/math]x\n>      a\n>      [/math]",
      "> - 1. \n>      $$\n>      x\n>      a\n>      $$",
    ],
  ])("keeps math after %s", (_, input, expected) => {
    expect(normalizeMathDelimiters(input)).toBe(expected);
  });

  it("reads the block prefix past a code span on the same line", () => {
    expect(
      rewriteLatexBracketDelimiters("- see `x` \\[\na\nb\n\\]\n- next"),
    ).toBe("- see `x` \n  $$\n  a\n  b\n  $$\n- next");
  });

  it("keeps a single-line display body on its line", () => {
    expect(rewriteLatexBracketDelimiters("See \\[x=1\\] ok.")).toBe(
      "See $$x=1$$ ok.",
    );
  });

  it("leaves an empty delimiter pair as written", () => {
    expect(rewriteLatexBracketDelimiters("\\[ \\]")).toBe("\\[ \\]");
    expect(rewriteLatexBracketDelimiters("\\[ \n \\]\nrest")).toBe(
      "\\[ \n \\]\nrest",
    );
    expect(rewriteLatexBracketDelimiters("\\( \\)")).toBe("\\( \\)");
  });

  it("leaves an empty quoted list display and its following line unchanged", () => {
    const input = "> 1. \\[\n> \n> \\]\n> Text";
    expect(rewriteLatexBracketDelimiters(input)).toBe(input);
  });

  it("leaves an empty quoted display with only markers unchanged", () => {
    const input = "> 1. \\[\n> \\]";
    expect(rewriteLatexBracketDelimiters(input)).toBe(input);
  });

  it("keeps a leading > on the opener line of a quoted one-line display", () => {
    expect(rewriteLatexBracketDelimiters("> \\[ >= 0\n\\]")).toBe("> $$>= 0$$");
    expect(rewriteLatexBracketDelimiters("> 1. \\[> x\n\\]")).toBe(
      "> 1. $$> x$$",
    );
    expect(rewriteCustomMathTags("> [/math]> x[/math]")).toBe("> $$> x$$");
    expect(rewriteCustomMathTags("> 1. [/math]> x[/math]")).toBe(
      "> 1. $$> x$$",
    );
  });

  it.each([
    ["> \\[ >= 0\n> a\n> \\]", "> \n> $$\n>  >= 0\n> a\n> $$"],
    ["> \\[> x\n> a\n> \\]", "> \n> $$\n> > x\n> a\n> $$"],
    ["> \\[>x\n> a\n> \\]", "> \n> $$\n> >x\n> a\n> $$"],
    ["> \\[>\n> a\n> \\]", "> \n> $$\n> >\n> a\n> $$"],
  ])(
    "preserves an opener-line greater-than operator in %j",
    (input, expected) => {
      expect(normalizeMathDelimiters(input)).toBe(expected);
    },
  );

  it("keeps display math in a blockquote nested inside a list item", () => {
    expect(normalizeMathDelimiters("- > \\[x\n  > x\n  > \\]")).toBe(
      "- > \n  > $$\n  > x\n  > x\n  > $$",
    );
  });

  it("strips quote markers before rewriting a quoted display body", () => {
    expect(rewriteLatexBracketDelimiters("> 1. \\[\n> w3 \\]")).toBe(
      "> 1. $$w3$$",
    );
    expect(rewriteLatexBracketDelimiters("> 1. \\[\n> \n> w3 \n> \\]")).toBe(
      "> 1. \n>    $$\n>    w3 \n>    $$",
    );
  });

  it("converts displays with blank lines only at the body edges", () => {
    expect(
      rewriteLatexBracketDelimiters("\\[\n\\text{`x`} = 1\n\n\\]\nText"),
    ).toBe("$$\\text{`x`} = 1$$\nText");
    expect(
      rewriteLatexBracketDelimiters("\\[\n\n\\text{`x`} = 1\n\\]\nText"),
    ).toBe("$$\\text{`x`} = 1$$\nText");
    expect(
      rewriteLatexBracketDelimiters(
        "> \\[\n> \\text{`x`} = 1\n>\n> \\]\n> Text",
      ),
    ).toBe("> \n> $$\n> \\text{`x`} = 1\n> $$\n> Text");
  });

  it.each(["\n", "\r\n"])(
    "does not cross an interior blank line and code span with %j endings",
    (ending) => {
      const input = `\\[a${ending}${ending}\`x\`${ending}\\]`;
      expect(rewriteLatexBracketDelimiters(input)).toBe(input);
    },
  );

  it("does not pair a prose opener across a blank line and code span", () => {
    const input = "Read \\[ this\n\n`code`\n\\[ x^2 \\]";
    expect(rewriteLatexBracketDelimiters(input)).toBe(
      "Read \\[ this\n\n`code`\n$$x^2$$",
    );
    const quoted = "> Read \\[ this\n>\n> `code`\n> \\[ x^2 \\]";
    expect(rewriteLatexBracketDelimiters(quoted)).toBe(
      "> Read \\[ this\n>\n> `code`\n> $$x^2$$",
    );
  });

  it("does not pair many blocked openers across code spans", () => {
    const input = "Read \\[ x\n\n`c`\n\n".repeat(4000) + "\\]";
    expect(rewriteLatexBracketDelimiters(input)).toBe(input);
  });

  it("does not pair many blocked openers across fences", () => {
    const input = "\\[ x\n```\nc\n```\n".repeat(4000) + "\\]";
    expect(rewriteLatexBracketDelimiters(input)).toBe(input);
  });

  it("resumes at a display opener after a blocked fence", () => {
    const input = "\\[ prose\n```\ncode\n```\n\\[ x^2 \\]";
    expect(rewriteLatexBracketDelimiters(input)).toBe(
      "\\[ prose\n```\ncode\n```\n$$x^2$$",
    );
  });

  it("does not resume at a display opener inside a code span", () => {
    const input = "\\[ p\n```\nf\n```\n`a \\[ b\nc` \\]";
    expect(rewriteLatexBracketDelimiters(input)).toBe(input);
  });

  it("rechecks the blank-line barrier after resuming at a later opener", () => {
    expect(
      rewriteLatexBracketDelimiters(
        "Read \\[ this\n\n`code`\n\\[\n\\text{`x`}\n\\]",
      ),
    ).toBe("Read \\[ this\n\n`code`\n$$\\text{`x`}$$");
  });

  it("does not span newlines for inline math", () => {
    expect(rewriteLatexBracketDelimiters("\\(a\nb\\)")).toBe("\\(a\nb\\)");
  });

  it("leaves text without bracket delimiters untouched", () => {
    expect(rewriteLatexBracketDelimiters("plain $x$ text")).toBe(
      "plain $x$ text",
    );
  });

  it("leaves a delimiter inside an inline code span as written", () => {
    expect(rewriteLatexBracketDelimiters("a `\\(x\\)` b")).toBe(
      "a `\\(x\\)` b",
    );
  });

  it("leaves a delimiter inside a fenced block as written", () => {
    expect(rewriteLatexBracketDelimiters("```\n\\[a\nb\\]\n```")).toBe(
      "```\n\\[a\nb\\]\n```",
    );
  });

  it("does not close a fenced block on a line with an info string", () => {
    const fenced = "```\n```js\n\\(x\\)\n```\nafter \\(y\\)";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(
      "```\n```js\n\\(x\\)\n```\nafter $y$",
    );
  });

  it("closes a backtick fence opened inside a blockquote", () => {
    const fenced = "> ```\n> \\(x\\)\n> ```\nafter \\(y\\)";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(
      "> ```\n> \\(x\\)\n> ```\nafter $y$",
    );
  });

  it("closes a code span written mid-line with three backticks", () => {
    expect(rewriteLatexBracketDelimiters("x ```\\(a\\)``b``` \\(y\\)")).toBe(
      "x ```\\(a\\)``b``` $y$",
    );
  });

  it("protects an unclosed fence indented past a list item's content column", () => {
    const streaming = "1. Step\n   - Sub\n     ```js\n     const a = \\(x\\);";
    expect(rewriteLatexBracketDelimiters(streaming)).toBe(streaming);
  });

  it("protects a still-streaming fence quoted under a nested list item", () => {
    const streaming =
      "- Setup\n  - Note:\n    > ```js\n    > const a = \\(x\\);";
    expect(rewriteLatexBracketDelimiters(streaming)).toBe(streaming);
  });

  it("protects a still-streaming fence opened on a list item's marker line", () => {
    const streaming = "- ```js\n  const a = \\(x\\);";
    expect(rewriteLatexBracketDelimiters(streaming)).toBe(streaming);
  });

  it("closes an indented fence whose body carries a blank line", () => {
    const fenced =
      "1. Step\n   - Sub\n     ```js\n     const a = 1;\n\n     const b = 2;\n     ```\n\nafter \\(y\\)";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(
      "1. Step\n   - Sub\n     ```js\n     const a = 1;\n\n     const b = 2;\n     ```\n\nafter $y$",
    );
  });

  it("does not open a fence from a run sharing its line with a backtick", () => {
    expect(
      rewriteLatexBracketDelimiters("```\\(a\\)```b\n\nafter \\(y\\)"),
    ).toBe("```\\(a\\)```b\n\nafter $y$");
  });

  it("rewrites prose on the same line as a code span", () => {
    expect(rewriteLatexBracketDelimiters("\\(a\\) `\\(x\\)` \\(b\\)")).toBe(
      "$a$ `\\(x\\)` $b$",
    );
  });

  it("does not treat an escaped backtick as a code opener", () => {
    expect(rewriteLatexBracketDelimiters("\\` \\(x\\)")).toBe("\\` $x$");
  });

  it("fences a multiline display body directly after a code span", () => {
    expect(rewriteLatexBracketDelimiters("`c` \\[a\nb\\] d")).toBe(
      "`c` \n$$\na\nb\n$$\n d",
    );
  });

  it("leaves a delimiter pair straddling a code span as written", () => {
    expect(rewriteLatexBracketDelimiters("\\(a `b` c\\)")).toBe(
      "\\(a `b` c\\)",
    );
  });

  it("rewrites across a lone literal backtick", () => {
    expect(rewriteLatexBracketDelimiters("Use \\(x ` y\\) here")).toBe(
      "Use $x ` y$ here",
    );
  });

  it("does not pair a lone backtick with a code span in a later list item", () => {
    const input = "- Press ` to open the console\n- Type `\\(x\\)` literally";
    expect(rewriteLatexBracketDelimiters(input)).toBe(input);
  });

  it("protects an unclosed fence still streaming in", () => {
    expect(rewriteLatexBracketDelimiters("```\n\\(x\\)\nstill streaming")).toBe(
      "```\n\\(x\\)\nstill streaming",
    );
  });

  it("leaves a delimiter inside a tilde fence as written", () => {
    expect(rewriteLatexBracketDelimiters("~~~\n\\[a\nb\\]\n~~~\n\\(x\\)")).toBe(
      "~~~\n\\[a\nb\\]\n~~~\n$x$",
    );
  });

  it("protects an unclosed tilde fence to the end of the input", () => {
    expect(rewriteLatexBracketDelimiters("~~~\n\\(x\\)")).toBe("~~~\n\\(x\\)");
  });

  it("closes a tilde fence written with CRLF line endings", () => {
    expect(
      rewriteLatexBracketDelimiters("~~~\r\n\\[a\\]\r\n~~~\r\nafter \\(x\\)"),
    ).toBe("~~~\r\n\\[a\\]\r\n~~~\r\nafter $x$");
  });

  it("closes a tilde fence opened inside a blockquote", () => {
    expect(
      rewriteLatexBracketDelimiters("> ~~~\n> \\[a\\]\n> ~~~\n\nafter \\(x\\)"),
    ).toBe("> ~~~\n> \\[a\\]\n> ~~~\n\nafter $x$");
  });

  it("ends an unclosed quoted fence with its blockquote", () => {
    expect(
      rewriteLatexBracketDelimiters("> ~~~\n> \\[a\\]\n\nafter \\(x\\)"),
    ).toBe("> ~~~\n> \\[a\\]\n\nafter $x$");
  });

  it("closes a blockquoted fence whose closer omits the marker space", () => {
    expect(
      rewriteLatexBracketDelimiters("> ~~~\n> \\[a\\]\n>~~~\n\nafter \\(x\\)"),
    ).toBe("> ~~~\n> \\[a\\]\n>~~~\n\nafter $x$");
  });

  it("closes an indented root fence with an unindented closer", () => {
    expect(
      rewriteLatexBracketDelimiters("  ~~~\n\\[a\\]\n~~~\nafter \\(x\\)"),
    ).toBe("  ~~~\n\\[a\\]\n~~~\nafter $x$");
  });

  it("preserves tilde fences after list markers, indentation, and tabs", () => {
    const cases: Array<[string, string]> = [
      [
        "- ~~~text\n  \\(x\\)\n  ~~~\nafter \\(y\\)",
        "- ~~~text\n  \\(x\\)\n  ~~~\nafter $y$",
      ],
      [
        "1. Step\n   - Sub\n     ~~~text\n     \\(x\\)\n     ~~~\nafter \\(y\\)",
        "1. Step\n   - Sub\n     ~~~text\n     \\(x\\)\n     ~~~\nafter $y$",
      ],
      [
        "\t~~~text\n\t\\(x\\)\n\t~~~\nafter \\(y\\)",
        "\t~~~text\n\t\\(x\\)\n\t~~~\nafter $y$",
      ],
    ];
    for (const [fenced, expected] of cases) {
      expect(rewriteLatexBracketDelimiters(fenced)).toBe(expected);
    }
  });

  it("does not close a root fence on a quoted tilde line inside it", () => {
    const fenced = "~~~\n> ~~~\n\\(x\\) still code\n~~~\nafter \\(y\\)";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(
      "~~~\n> ~~~\n\\(x\\) still code\n~~~\nafter $y$",
    );
  });

  it("preserves a tilde fence after an indented blockquote marker", () => {
    const fenced = "    > ~~~\n> \\(x\\)\n> ~~~\nafter \\(y\\)";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(
      "    > ~~~\n> \\(x\\)\n> ~~~\nafter $y$",
    );
  });

  it("accepts a four-space root tilde fence", () => {
    const fenced = "    ~~~\n\\(x\\)\n    ~~~\nafter \\(y\\)";
    expect(rewriteLatexBracketDelimiters(fenced)).toBe(
      "    ~~~\n\\(x\\)\n    ~~~\nafter $y$",
    );
  });

  it("protects a tilde fence nested in a blockquote", () => {
    const quoted = "> ~~~\n> \\[a\\]\n> ~~~";
    expect(rewriteLatexBracketDelimiters(quoted)).toBe(quoted);
  });

  it.each(["~~~", "```"])(
    "reads a deeper quote marker inside a quoted %s fence as body",
    (marker) => {
      const fenced = `> ${marker}\n> \\[a\\]\n>> ${marker}\n> \\(x\\)\n\nTail \\(y\\)`;
      expect(rewriteLatexBracketDelimiters(fenced)).toBe(
        `> ${marker}\n> \\[a\\]\n>> ${marker}\n> \\(x\\)\n\nTail $y$`,
      );
    },
  );

  it.each([
    [
      "a shallower line",
      ">> ~~~\n>> \\[a\\]\n> \\(x\\)",
      ">> ~~~\n>> \\[a\\]\n> $x$",
    ],
    [
      "a bare shallower marker",
      ">> ~~~\n>> \\[a\\]\n>\n>> \\(x\\)",
      ">> ~~~\n>> \\[a\\]\n>\n>> $x$",
    ],
    [
      "a blank line",
      "> ~~~\n> \\[a\\]\n\n> \\(x\\)",
      "> ~~~\n> \\[a\\]\n\n> $x$",
    ],
  ])("ends a quoted fence at %s", (_, text, out) => {
    expect(rewriteLatexBracketDelimiters(text)).toBe(out);
  });

  it.each([
    ["a root", "~~~\n    ~~~\n\\(x\\)"],
    ["a quoted", "> ~~~\n>     ~~~\n> \\(x\\)"],
  ])(
    "does not close %s fence on a marker indented four past its opener",
    (_, fenced) => {
      expect(rewriteLatexBracketDelimiters(fenced)).toBe(fenced);
    },
  );

  it("closes a nested fence at its depth however the markers are spaced", () => {
    expect(
      rewriteLatexBracketDelimiters(">> ~~~\n>> \\[a\\]\n>  > ~~~\n>> \\(x\\)"),
    ).toBe(">> ~~~\n>> \\[a\\]\n>  > ~~~\n>> $x$");
  });

  it("counts every quote marker ahead of a fence opened in a quoted list item", () => {
    expect(
      rewriteLatexBracketDelimiters("> - > ~~~\n>   > \\[a\\]\n>   \\(x\\)"),
    ).toBe("> - > ~~~\n>   > \\[a\\]\n>   $x$");
  });

  it("leaves custom math tags inside a tilde fence as written", () => {
    const fenced = "~~~\n[/math]x[/math]\n~~~";
    expect(rewriteCustomMathTags(fenced)).toBe(fenced);
  });

  it("rewrites around a mid-line tilde run", () => {
    expect(rewriteLatexBracketDelimiters("a ~~~ \\(x\\)")).toBe("a ~~~ $x$");
  });
});

describe("rewriteCustomMathTags", () => {
  it("rewrites [/math] to display dollars and [/inline] to inline dollars", () => {
    expect(
      rewriteCustomMathTags("[/math]a+b[/math] and [/inline]c[/inline]"),
    ).toBe("$$a+b$$ and $c$");
  });

  it("leaves a tag inside an inline code span as written", () => {
    expect(rewriteCustomMathTags("`[/math]x[/math]`")).toBe(
      "`[/math]x[/math]`",
    );
  });

  it("leaves a tag inside a fenced block as written", () => {
    expect(rewriteCustomMathTags("```\n[/inline]x[/inline]\n```")).toBe(
      "```\n[/inline]x[/inline]\n```",
    );
  });

  it("rewrites prose on the same line as a code span", () => {
    expect(
      rewriteCustomMathTags("[/inline]a[/inline] `[/inline]x[/inline]`"),
    ).toBe("$a$ `[/inline]x[/inline]`");
  });

  it("fences a multiline math tag body", () => {
    expect(
      rewriteCustomMathTags(
        "[/math]\\begin{aligned}\na&=b\n\\end{aligned}[/math]\nDone.",
      ),
    ).toBe("$$\n\\begin{aligned}\na&=b\n\\end{aligned}\n$$\nDone.");
  });

  it.each([
    ["brackets", rewriteLatexBracketDelimiters, "\\[", "\\]"],
    ["tags", rewriteCustomMathTags, "[/math]", "[/math]"],
  ] as const)(
    "trims leading blank display lines without shifting the body in %s",
    (_, preprocess, open, close) => {
      const input = `${open}${"\n".repeat(256)}x\ny${close}`;
      const shift = Array.prototype.shift;
      let shiftedEntries = 0;
      const spy = vi
        .spyOn(Array.prototype, "shift")
        .mockImplementation(function (this: unknown[]) {
          if (this.length > 100 && this[0] === "") {
            shiftedEntries += this.length - 1;
          }
          return Reflect.apply(shift, this, []);
        });
      try {
        expect(preprocess(input)).toBe("$$\nx\ny\n$$");
      } finally {
        spy.mockRestore();
      }
      expect(shiftedEntries).toBeLessThanOrEqual(256);
    },
  );

  it("gives the fence markers their own lines mid-paragraph", () => {
    expect(rewriteCustomMathTags("Thus [/math]a\nb[/math] therefore.")).toBe(
      "Thus \n$$\na\nb\n$$\n therefore.",
    );
  });

  it("keeps a single-line math tag body on its line", () => {
    expect(rewriteCustomMathTags("See [/math]x=1[/math] ok.")).toBe(
      "See $$x=1$$ ok.",
    );
  });

  it("does not add a blank line before a CRLF suffix", () => {
    expect(rewriteCustomMathTags("[/math]\na\nb\n[/math]\r\nrest")).toBe(
      "$$\na\nb\n$$\r\nrest",
    );
  });

  it("rewrites a custom tag after an unclosed inline backtick run", () => {
    expect(rewriteCustomMathTags("a ` b [/math]x[/math]")).toBe("a ` b $$x$$");
  });

  it("rewrites a custom tag after a mid-line code span", () => {
    expect(rewriteCustomMathTags("a `code` [/math]x[/math]")).toBe(
      "a `code` $$x$$",
    );
  });

  it("leaves an empty math tag pair as written", () => {
    expect(rewriteCustomMathTags("[/math][/math]")).toBe("[/math][/math]");
    expect(rewriteCustomMathTags("[/inline][/inline] rest")).toBe(
      "[/inline][/inline] rest",
    );
  });

  it("leaves a whitespace-only tag pair as written", () => {
    expect(rewriteCustomMathTags("[/math] \n [/math]\nrest")).toBe(
      "[/math] \n [/math]\nrest",
    );
    expect(rewriteCustomMathTags("[/inline]   [/inline] rest")).toBe(
      "[/inline]   [/inline] rest",
    );
  });
});

describe("normalizeMathDelimiters", () => {
  it("normalizes both bracket delimiters and custom tags", () => {
    expect(normalizeMathDelimiters("\\(x\\) [/math]y[/math]")).toBe(
      "$x$ $$y$$",
    );
  });

  it("keeps code inert for both delimiter families", () => {
    expect(normalizeMathDelimiters("`\\(x\\)` and `[/math]y[/math]`")).toBe(
      "`\\(x\\)` and `[/math]y[/math]`",
    );
  });

  it("keeps many inline code spans in one paragraph unchanged", () => {
    const input = "a `\\(x\\)` ".repeat(1000);
    expect(normalizeMathDelimiters(input)).toBe(input);
  });

  it.each([
    ["currency", "triple-backtick", escapeCurrencyDollars, "a ```b``` "],
    ["math", "triple-backtick", normalizeMathDelimiters, "a ```b``` "],
    ["currency", "tilde", escapeCurrencyDollars, "x ~~~ "],
    ["math", "tilde", normalizeMathDelimiters, "x ~~~ "],
  ] as const)(
    "does not rescan the line prefix in %s for %s runs",
    (_, _marker, preprocess, segment) => {
      const fencePrefixSource =
        /^[ \t]*(?:>[ \t]*|(?:[-*+]|\d{1,9}[.)])[ \t]+)*$/.source;
      const fencePrefixCharSource = /[ \t>*+\-0-9.)]/.source;
      const scannedFor = (input: string) => {
        const test = RegExp.prototype.test;
        const lastIndexOf = String.prototype.lastIndexOf;
        let scanned = 0;
        let charChecks = 0;
        const regexScan = vi
          .spyOn(RegExp.prototype, "test")
          .mockImplementation(function (this: RegExp, candidate) {
            if (this.source === fencePrefixSource) scanned += candidate.length;
            if (this.source === fencePrefixCharSource) {
              scanned += candidate.length;
              charChecks += 1;
            }
            return Reflect.apply(test, this, [candidate]);
          });
        const newlineScan = vi
          .spyOn(String.prototype, "lastIndexOf")
          .mockImplementation(function (this: string, search, position) {
            if (this.valueOf() === input && search === "\n") {
              scanned +=
                position === undefined
                  ? input.length
                  : Math.min(input.length, Math.max(0, position + 1));
            }
            return Reflect.apply(lastIndexOf, this, [search, position]);
          });
        let output: string;
        try {
          output = preprocess(input);
        } finally {
          newlineScan.mockRestore();
          regexScan.mockRestore();
        }
        expect(output).toBe(input);
        return { scanned, charChecks };
      };

      const input = segment.repeat(100);
      const first = scannedFor(input);
      const second = scannedFor(input + input);
      expect(first.scanned).toBeLessThanOrEqual(input.length * 3);
      expect(second.scanned).toBeLessThanOrEqual(input.length * 6);
      expect(second.scanned).toBeLessThanOrEqual(first.scanned * 2);
      expect(second.charChecks).toBeLessThanOrEqual(first.charChecks * 2);
    },
  );

  it.each([
    ["\t", "$5\n\n$7"],
    ["- ", "$5\n\n$7"],
    ["* ", "$5\n\n$7"],
    ["+ ", "$5\n\n$7"],
    ["1. ", "$5\n\n$7"],
    ["1) ", "$5\n\n$7"],
    ["x ", "\\$5\n\n\\$7"],
  ])("handles tilde runs after prefix %j", (prefix, body) => {
    expect(escapeCurrencyDollars(`${prefix}~~~js\n$5\n\n$7\n~~~`)).toBe(
      `${prefix}~~~js\n${body}\n~~~`,
    );
  });

  it("does not open a backtick fence after prose", () => {
    expect(escapeCurrencyDollars("x ```js\n$5\n\n$7\n```")).toBe(
      "x ```js\n\\$5\n\n\\$7\n```",
    );
  });

  it.each([
    ["currency", escapeCurrencyDollars],
    ["math", normalizeMathDelimiters],
  ] as const)(
    "keeps rejected tilde prefix checks constant in %s",
    (_, preprocess) => {
      const prefixCharSource = /[ \t>*+\-0-9.)]/.source;
      const checksFor = (length: number) => {
        const input = `x ${"~".repeat(length)}`;
        const test = RegExp.prototype.test;
        let checks = 0;
        const spy = vi
          .spyOn(RegExp.prototype, "test")
          .mockImplementation(function (this: RegExp, candidate) {
            if (this.source === prefixCharSource) checks += 1;
            return Reflect.apply(test, this, [candidate]);
          });
        try {
          expect(preprocess(input)).toBe(input);
        } finally {
          spy.mockRestore();
        }
        return checks;
      };

      const first = checksFor(256);
      const second = checksFor(512);
      expect(first).toBeGreaterThan(0);
      expect(second).toBe(first);
    },
  );

  it("nests a $$ fence opened on a list item's marker line", () => {
    expect(
      normalizeMathDelimiters(
        "1. $$\nF = ma\n$$\nNewton\n\n2. $$\nE = mc^2\n$$",
      ),
    ).toBe("1. $$\n   F = ma\n   $$\n   Newton\n\n2. $$\n   E = mc^2\n   $$");
  });

  it.each([
    "+ \\frac{1}{2}mv^2",
    "- \\frac{1}{2}mv^2",
    "- 2v + 1",
    "+ mgh",
    "- b",
  ])(
    "nests a $$ fence whose formula continues on an operator-led line: %j",
    (line) => {
      expect(
        normalizeMathDelimiters(`1. $$\nE = mc^2\n${line}\n$$\nTotal energy.`),
      ).toBe(`1. $$\n   E = mc^2\n   ${line}\n   $$\n   Total energy.`);
    },
  );

  it("leaves a streaming $$ fence that reaches an operator marker as written", () => {
    const text = "1. $$\nE = mc^2\n+ \\frac{1}{2}mv^2";
    expect(normalizeMathDelimiters(text)).toBe(text);
  });

  it("nests a $$ fence in a list item inside a blockquote", () => {
    expect(normalizeMathDelimiters("> 1. $$\n> x = 1\n> $$\n> Text")).toBe(
      "> 1. $$\n>    x = 1\n>    $$\n>    Text",
    );
    expect(normalizeMathDelimiters("> 1. $$\nx = 1\n> $$\n> 2. b")).toBe(
      "> 1. $$\n>    x = 1\n>    $$\n> 2. b",
    );
    expect(normalizeMathDelimiters("> 1. $$\n> x = 1\n> $$\nText")).toBe(
      "> 1. $$\n>    x = 1\n>    $$\nText",
    );
    expect(normalizeMathDelimiters("1. $$\n> 1. $$\nx = 1\n> $$")).toBe(
      "1. $$\n> 1. $$\n>    x = 1\n>    $$",
    );
  });

  it("scans a $$ fence across a code span without changing its contents", () => {
    expect(normalizeMathDelimiters("1. $$\n\\text{`x`} = 1\n$$\nText")).toBe(
      "1. $$\n   \\text{`x`} = 1\n   $$\n   Text",
    );
  });

  it("nests a still-streaming $$ fence across a code span", () => {
    expect(normalizeMathDelimiters("1. $$\n\\text{`x`} = 1")).toBe(
      "1. $$\n   \\text{`x`} = 1",
    );
  });

  it("leaves a quoted $$ fence that reaches a nested blockquote as written", () => {
    const text = "> 1. $$\n>    x\n> >     code";
    expect(normalizeMathDelimiters(text)).toBe(text);
  });

  it("leaves a $$ fence that reaches a code fence before it closes", () => {
    const text = "1. $$\na\n```\ncode\n```\n$$";
    expect(normalizeMathDelimiters(text)).toBe(text);
  });

  it("nests a $$ fence to the content column of its marker", () => {
    expect(normalizeMathDelimiters("- $$\na\n$$")).toBe("- $$\n  a\n  $$");
    expect(normalizeMathDelimiters("10. $$\na\n$$")).toBe(
      "10. $$\n    a\n    $$",
    );
  });

  it("keeps the paragraph after a nested $$ fence in its item", () => {
    expect(normalizeMathDelimiters("1. $$\na\n$$\none two\nthree")).toBe(
      "1. $$\n   a\n   $$\n   one two\nthree",
    );
    expect(normalizeMathDelimiters("- $$\na\n$$\n- next")).toBe(
      "- $$\n  a\n  $$\n- next",
    );
  });

  it.each(["more", "--- | :", "--- | --- | ---"])(
    "keeps a line holding a pipe after a nested $$ fence in its item when %j is no delimiter row for it",
    (after) => {
      expect(normalizeMathDelimiters(`1. $$\na\n$$\nA | B\n${after}`)).toBe(
        `1. $$\n   a\n   $$\n   A | B\n${after}`,
      );
    },
  );

  it("keeps a paragraph that opens with a code span after a nested $$ fence in its item", () => {
    expect(normalizeMathDelimiters("1. $$\na\n$$\n`a` is the input.")).toBe(
      "1. $$\n   a\n   $$\n   `a` is the input.",
    );
    expect(normalizeMathDelimiters("1. $$\na\n$$\n```a``` is the input.")).toBe(
      "1. $$\n   a\n   $$\n   ```a``` is the input.",
    );
    expect(normalizeMathDelimiters("1. $$\na\n$$\n```js\nx\n```")).toBe(
      "1. $$\n   a\n   $$\n```js\nx\n```",
    );
  });

  it.each(["-", "2", "2.", "#", "$", "`", "``", "~", "~~"])(
    "keeps a half-streamed %j after a nested $$ fence at the root column",
    (next) => {
      expect(normalizeMathDelimiters(`- $$\na\n$$\n${next}`)).toBe(
        `- $$\n  a\n  $$\n${next}`,
      );
    },
  );

  it.each(["A | B\n--- | ---\n1 | 2", "| A | B |\n| - | - |"])(
    "leaves a table right after a nested $$ fence at the root: %j",
    (table) => {
      expect(normalizeMathDelimiters(`1. $$\na\n$$\n${table}`)).toBe(
        `1. $$\n   a\n   $$\n${table}`,
      );
    },
  );

  it("leaves root indented code after a nested $$ fence at the root", () => {
    expect(normalizeMathDelimiters("   - $$\na\n$$\n    code")).toBe(
      "   - $$\n     a\n     $$\n    code",
    );
  });

  it.each([
    "1. $$\n   a\n   $$\nText",
    "- $$\n  a\n  $$\nText",
    "> 1. $$\n>    a\n>    $$\n> Text",
    "> 1. $$\n>    x\n>    > y\n>    $$\nText",
    "> \t1. $$\n>      x\n>      $$\nText",
  ])(
    "leaves a $$ fence already at its item's content column, and the root paragraph after it: %j",
    (text) => {
      expect(normalizeMathDelimiters(text)).toBe(text);
    },
  );

  it("nests a still-streaming $$ fence opened on a marker line", () => {
    expect(normalizeMathDelimiters("1. $$\nF = ")).toBe("1. $$\n   F = ");
    expect(normalizeMathDelimiters("1. $$\nF = ma\n ")).toBe(
      "1. $$\n   F = ma\n ",
    );
  });

  it("leaves a $$ fence that reaches a sibling item before it closes", () => {
    const text = "1. $$\na\n2. b\n$$";
    expect(normalizeMathDelimiters(text)).toBe(text);
    expect(normalizeMathDelimiters("1. $$\na\n2. $$\nb\n$$")).toBe(
      "1. $$\na\n2. $$\n   b\n   $$",
    );
  });

  it.each([
    "- $$\nF = ma\n- where $F_{net}$ is the net force\n$$\np = mv\n$$",
    "- $$\nF = ma\n- the net force on the body\n$$",
    "1. $$\nF = ma\n- Summary\n$$",
    "- $$\nF = ma\n- \n$$",
  ])(
    "leaves a $$ fence that reaches a sibling item of prose or nothing before it closes: %j",
    (text) => {
      expect(normalizeMathDelimiters(text)).toBe(text);
    },
  );

  it.each([
    "1. $$\nF = ma\n\nThat is Newton's second law.",
    "1. $$\nF = ma\n\nText\n\n$$\nx\n$$",
  ])(
    "leaves a $$ fence with no closing line before a blank line as written: %j",
    (text) => {
      expect(normalizeMathDelimiters(text)).toBe(text);
    },
  );

  it.each([
    "1. $$\nF = ma$$\nThat is Newton's second law.",
    "1. $$\nF = ma$$\n\nThat is Newton's second law.",
    "1. $$\n`a\nF = ma$$\nb`\nText",
    "> 1. $$\n>    `a\n>    F = ma$$\n>    b`\nText",
  ])(
    "leaves a $$ fence that closes on its formula line as written: %j",
    (text) => {
      expect(normalizeMathDelimiters(text)).toBe(text);
    },
  );

  it("nests a later $$ fence after one that closes on its formula line", () => {
    expect(
      normalizeMathDelimiters(
        "1. $$\nF = ma$$\nNewton\n2. $$\nE = mc^2\n$$\nEinstein",
      ),
    ).toBe("1. $$\nF = ma$$\nNewton\n2. $$\n   E = mc^2\n   $$\n   Einstein");
  });

  it("nests a $$ fence written with CRLF line endings", () => {
    expect(
      normalizeMathDelimiters(
        "1. $$\r\nF = ma\r\n$$\r\nNewton\r\n\r\n2. $$\r\nx",
      ),
    ).toBe("1. $$\r\n   F = ma\r\n   $$\r\n   Newton\r\n\r\n2. $$\r\n   x");
  });

  it("leaves root and fenced $$ blocks as written", () => {
    expect(normalizeMathDelimiters("$$\na\n$$")).toBe("$$\na\n$$");
    const fenced = "```md\n1. $$\na\n$$\n```";
    expect(normalizeMathDelimiters(fenced)).toBe(fenced);
  });

  it("does not nest a list-shaped marker inside an open $$ block", () => {
    const root = "$$\n1. $$\nx\n$$\nText";
    expect(normalizeMathDelimiters(root)).toBe(root);
    const quoted =
      "> 1. $$\n>    x\n> > $$ meta\n>    > 10. $$\n> > y\n> > $$\n> > Text";
    expect(normalizeMathDelimiters(quoted)).toBe(quoted);
  });
});

describe("escapeCurrencyDollars", () => {
  it("escapes a dollar followed by a digit", () => {
    expect(escapeCurrencyDollars("it costs $5 and $10.")).toBe(
      "it costs \\$5 and \\$10.",
    );
  });

  it("escapes currency at the start of the string", () => {
    expect(escapeCurrencyDollars("$1,299 total")).toBe("\\$1,299 total");
  });

  it("leaves display math intact", () => {
    expect(escapeCurrencyDollars("$$5x$$")).toBe("$$5x$$");
  });

  it("does not touch a dollar followed by a letter", () => {
    expect(escapeCurrencyDollars("$x$")).toBe("$x$");
  });

  it("does not double-escape an already escaped dollar", () => {
    expect(escapeCurrencyDollars("already \\$5")).toBe("already \\$5");
  });

  it("escapes currency after an escaped backslash", () => {
    expect(escapeCurrencyDollars("\\\\$5")).toBe("\\\\\\$5");
  });

  it("escapes each amount in a list of prices", () => {
    expect(escapeCurrencyDollars("Prices are $10, $20, and $30.")).toBe(
      "Prices are \\$10, \\$20, and \\$30.",
    );
  });

  it("keeps inline math that opens with a digit", () => {
    expect(
      escapeCurrencyDollars("gives $0$ points, $1$ to the second, up to $m-1$"),
    ).toBe("gives $0$ points, $1$ to the second, up to $m-1$");
  });

  it("keeps an expression that opens with a digit", () => {
    expect(escapeCurrencyDollars("Solve $5x = 10$ for x.")).toBe(
      "Solve $5x = 10$ for x.",
    );
  });

  it("escapes currency but keeps math in the same line", () => {
    expect(escapeCurrencyDollars("Pay $20 when $n=3$ holds.")).toBe(
      "Pay \\$20 when $n=3$ holds.",
    );
  });

  it("does not shift the delimiters that follow an escaped amount", () => {
    expect(escapeCurrencyDollars("costs $5 and $7, and $n$ holds")).toBe(
      "costs \\$5 and \\$7, and $n$ holds",
    );
  });

  it("escapes a currency range", () => {
    expect(escapeCurrencyDollars("Prices: $5-$10 each")).toBe(
      "Prices: \\$5-\\$10 each",
    );
  });

  it("escapes a currency range written with a slash", () => {
    expect(escapeCurrencyDollars("Pay $5/$10 split")).toBe(
      "Pay \\$5/\\$10 split",
    );
  });

  it("does not rewrite a code span", () => {
    expect(escapeCurrencyDollars("Use `$5` as the placeholder.")).toBe(
      "Use `$5` as the placeholder.",
    );
  });

  it("keeps many inline code spans in one paragraph unchanged", () => {
    const input = "a `$5` ".repeat(1000);
    expect(escapeCurrencyDollars(input)).toBe(input);
  });

  it("does not carry an unmatched code span across a CRLF paragraph break", () => {
    expect(escapeCurrencyDollars("$$\r\n`$5\r\n\r\n`")).toBe(
      "$$\r\n`\\$5\r\n\r\n`",
    );
    expect(normalizeMathDelimiters("\\[`\r\n\r\n\\]`")).toBe("$$`$$`");
  });

  it("does not close one- or two-backtick code spans on a longer run", () => {
    expect(escapeCurrencyDollars("`value ``` costs $5 ` after $7")).toBe(
      "`value ``` costs $5 ` after \\$7",
    );
    expect(
      escapeCurrencyDollars("Use ``value ````` costs $5 `` after $7"),
    ).toBe("Use ``value ````` costs $5 `` after \\$7");
  });

  it("escapes currency after an inline opener with no equal-length closer", () => {
    expect(escapeCurrencyDollars("`a ``b`` $5")).toBe("`a ``b`` \\$5");
  });

  it("does not rewrite a fenced block", () => {
    expect(escapeCurrencyDollars("```\nconst price = $5;\n```")).toBe(
      "```\nconst price = $5;\n```",
    );
  });

  it("preserves tilde-fenced currency and escapes the following prose", () => {
    expect(escapeCurrencyDollars("~~~text\n$5\n~~~\nafter $10")).toBe(
      "~~~text\n$5\n~~~\nafter \\$10",
    );
  });

  it("preserves tilde-fenced currency after list markers, indentation, and tabs", () => {
    const cases: Array<[string, string]> = [
      [
        "- ~~~text\n  $5\n  ~~~\nafter $10",
        "- ~~~text\n  $5\n  ~~~\nafter \\$10",
      ],
      [
        "1. Step\n   - Sub\n     ~~~text\n     $5\n     ~~~\nafter $10",
        "1. Step\n   - Sub\n     ~~~text\n     $5\n     ~~~\nafter \\$10",
      ],
      [
        "\t~~~text\n\t$5\n\t~~~\nafter $10",
        "\t~~~text\n\t$5\n\t~~~\nafter \\$10",
      ],
    ];
    for (const [fenced, expected] of cases) {
      expect(escapeCurrencyDollars(fenced)).toBe(expected);
    }
  });

  it("preserves currency while a tilde fence is incomplete", () => {
    const text = "~~~text\n$5\n~~~";
    for (let end = 3; end <= text.length; end++) {
      expect(escapeCurrencyDollars(text.slice(0, end))).toBe(
        text.slice(0, end),
      );
    }
  });

  it("does not close an unclosed root fence on a quoted tilde run", () => {
    expect(escapeCurrencyDollars("~~~a\n$5\n> ~~~\nafter $10")).toBe(
      "~~~a\n$5\n> ~~~\nafter $10",
    );
  });

  it("ends an unclosed quoted fence with its blockquote", () => {
    expect(escapeCurrencyDollars("> ~~~\n> $5\n\nafter $10")).toBe(
      "> ~~~\n> $5\n\nafter \\$10",
    );
  });

  it("preserves currency while a backtick fence is incomplete", () => {
    expect(escapeCurrencyDollars("```text\nconst price = $5;")).toBe(
      "```text\nconst price = $5;",
    );
  });

  it("accepts a longer closing run for a fenced block", () => {
    expect(escapeCurrencyDollars("```\nconst price = $5;\n````")).toBe(
      "```\nconst price = $5;\n````",
    );
  });

  it("does not close a fenced block on a line with an info string", () => {
    const fenced = "```\n```js\nconst price = $5;\n```\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "```\n```js\nconst price = $5;\n```\nafter \\$10",
    );
  });

  it("does not rewrite a quoted fence indented past a nested list item", () => {
    const fenced =
      "- Setup\n  - Note:\n    > ```js\n    > const price = $5;\n    >\n    > const tax = $2;\n    > ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "- Setup\n  - Note:\n    > ```js\n    > const price = $5;\n    >\n    > const tax = $2;\n    > ```\n\nafter \\$10",
    );
  });

  it("does not rewrite a tab-indented quoted fence", () => {
    const fenced =
      "\t> ```js\n\t> const price = $5;\n\t>\n\t> const tax = $2;\n\t> ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "\t> ```js\n\t> const price = $5;\n\t>\n\t> const tax = $2;\n\t> ```\n\nafter \\$10",
    );
  });

  it("does not rewrite a fence quoted inside a list item", () => {
    const fenced =
      "- > ```js\n  > const price = $5;\n  >\n  > const tax = $2;\n  > ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "- > ```js\n  > const price = $5;\n  >\n  > const tax = $2;\n  > ```\n\nafter \\$10",
    );
  });

  it("escapes currency once a blank line ends a fence quoted inside a list item", () => {
    const fenced =
      "- > ```js\n  > const price = $5;\n\n  > const tax = $2;\n  > ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "- > ```js\n  > const price = $5;\n\n  > const tax = \\$2;\n  > ```\n\nafter \\$10",
    );
  });

  it("does not rewrite a fence opened on a list item's marker line", () => {
    const fenced =
      "- ```js\n  const price = $5;\n\n  const tax = $2;\n  ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "- ```js\n  const price = $5;\n\n  const tax = $2;\n  ```\n\nafter \\$10",
    );
  });

  it("does not rewrite an indented fence whose body carries a blank line", () => {
    const fenced =
      "1. Step\n   - Sub\n     ```js\n     const price = $5;\n\n     const tax = $2;\n     ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "1. Step\n   - Sub\n     ```js\n     const price = $5;\n\n     const tax = $2;\n     ```\n\nafter \\$10",
    );
  });

  it("keeps a run left open in prose from swallowing a fence across CRLF", () => {
    const prose =
      "use ``` to fence code\r\n\r\n```js\r\nconst price = $5;\r\n```\r\nafter $10";
    expect(escapeCurrencyDollars(prose)).toBe(
      "use ``` to fence code\r\n\r\n```js\r\nconst price = $5;\r\n```\r\nafter \\$10",
    );
  });

  it("does not let a run left open in prose swallow a later fence", () => {
    const prose =
      "use ``` to fence code\n\n```js\nconst price = $5;\n```\nafter $10";
    expect(escapeCurrencyDollars(prose)).toBe(
      "use ``` to fence code\n\n```js\nconst price = $5;\n```\nafter \\$10",
    );
  });

  it("does not rewrite a fenced block opened inside a blockquote", () => {
    const fenced = "> ```\n> ```js\n> const price = $5;\n> ```\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "> ```\n> ```js\n> const price = $5;\n> ```\nafter \\$10",
    );
  });

  it("escapes an amount when the prose before the next span carries latex syntax", () => {
    expect(
      escapeCurrencyDollars("Pay $20 when x_1 rises, then $n$ holds"),
    ).toBe("Pay \\$20 when x_1 rises, then $n$ holds");
  });

  it("keeps digit-initial math that carries latex syntax", () => {
    expect(escapeCurrencyDollars("Solve $5x_2 = 10$ now")).toBe(
      "Solve $5x_2 = 10$ now",
    );
  });

  it("escapes a currency range written with a unicode minus", () => {
    expect(escapeCurrencyDollars("Prices: $5\u2212$10 each")).toBe(
      "Prices: \\$5\u2212\\$10 each",
    );
  });

  it("escapes currency after an unclosed backtick", () => {
    expect(escapeCurrencyDollars("see `unclosed then $5 and $7 later")).toBe(
      "see `unclosed then \\$5 and \\$7 later",
    );
  });

  it.each([
    ["a list item", "- legacy ` syntax\n- Run `cost=$5`"],
    ["an ordered list item", "1. legacy ` syntax\n2. Run `cost=$5`"],
    ["a heading", "legacy ` syntax\n# Run `cost=$5`"],
    ["a blockquote", "legacy ` syntax\n> Run `cost=$5`"],
    ["a setext underline", "legacy ` syntax\n---\nRun `cost=$5`"],
    [
      "a heading in a nested list item",
      "- outer\n  - legacy ` syntax\n    # Run `cost=$5`",
    ],
    [
      "a thematic break in a nested list item",
      "- outer\n  - legacy ` syntax\n    ***\n    Run `cost=$5`",
    ],
  ])("does not pair a lone backtick with a code span after %s", (_, input) => {
    expect(escapeCurrencyDollars(input)).toBe(input);
  });

  it("pairs a lone backtick across a line that continues its paragraph", () => {
    expect(escapeCurrencyDollars("legacy ` syntax\n2. Run `cost=$5`")).toBe(
      "legacy ` syntax\n2. Run `cost=\\$5`",
    );
  });

  it.each([
    ["an indented list marker", "see `cost=$5\n    - more` here"],
    ["a tab-indented list marker", "see `cost=$5\n\t- more` here"],
    ["a nested item's indented marker", "- see `cost=$5\n      - more` here"],
    ["an indented quote marker", "see `cost=$5\n    > more` here"],
    ["a lazy quote continuation", "> see `cost=$5\nmore` here"],
    ["a CRLF line ending", "see `cost=$5\r\n    - more` here"],
  ])("keeps a code span open across %s", (_, input) => {
    expect(escapeCurrencyDollars(input)).toBe(input);
  });

  it("escapes currency glued to a preceding word", () => {
    expect(escapeCurrencyDollars("Prices range from US$50 to US$100")).toBe(
      "Prices range from US\\$50 to US\\$100",
    );
  });

  it("escapes an amount whose next dollar opens another amount", () => {
    expect(escapeCurrencyDollars("$50 to US$60")).toBe("\\$50 to US\\$60");
  });

  it("does not rewrite an indented code block", () => {
    expect(
      escapeCurrencyDollars("Pricing:\n\n    total = $5 + $10\n\nend"),
    ).toBe("Pricing:\n\n    total = $5 + $10\n\nend");
  });

  it("keeps a multi-line indented code block with blank lines intact", () => {
    expect(
      escapeCurrencyDollars(
        "    line1 = $5\n    line2 = $10\n\n    line3 = $15",
      ),
    ).toBe("    line1 = $5\n    line2 = $10\n\n    line3 = $15");
  });

  it("keeps a tab-indented code block intact", () => {
    expect(escapeCurrencyDollars("\tconst price = $5;")).toBe(
      "\tconst price = $5;",
    );
  });

  it("still escapes currency when an indented line interrupts a paragraph", () => {
    expect(escapeCurrencyDollars("para\n    not code $5")).toBe(
      "para\n    not code \\$5",
    );
  });

  it("escapes prose currency around an indented code block", () => {
    expect(escapeCurrencyDollars("$5\n\n    code $10\n\n$15")).toBe(
      "\\$5\n\n    code $10\n\n\\$15",
    );
  });

  it("still escapes a list continuation paragraph", () => {
    expect(
      escapeCurrencyDollars(
        "- Plan A\n\n    Costs $5 per month and $10 extra.",
      ),
    ).toBe("- Plan A\n\n    Costs \\$5 per month and \\$10 extra.");
  });

  it.each(["Heading\n===\n    total = $5", "Heading\n---\n    total = $5"])(
    "does not rewrite indented code right after a setext heading: %j",
    (input) => {
      expect(escapeCurrencyDollars(input)).toBe(input);
    },
  );

  it.each(["1. ---\n       total = $5", "1. ***\n       total = $5"])(
    "does not rewrite indented code right after a thematic break in a list item: %j",
    (input) => {
      expect(escapeCurrencyDollars(input)).toBe(input);
    },
  );

  it("still escapes a continuation below the code column after a thematic break in a list item", () => {
    expect(escapeCurrencyDollars("1. ---\n      total = $5")).toBe(
      "1. ---\n      total = \\$5",
    );
  });

  it("closes a list item at root prose after a blank-line-terminated code block", () => {
    const input = "- item\n\n      code $1\n\nroot prose\n\n    root code $6";
    expect(escapeCurrencyDollars(input)).toBe(input);
  });

  it("does not rewrite code indented past a list item's content column", () => {
    const markdown = "- item\n\n      total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("restores the outer list column after leaving a nested item", () => {
    const markdown = "- outer\n  - inner\n\n  parent prose\n\n      total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("does not rewrite code indented past a nested item's content column", () => {
    const markdown = "- outer\n  - inner\n\n        total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("escapes prose below a nested item's code column", () => {
    expect(escapeCurrencyDollars("- outer\n  - inner\n\n    total = $5")).toBe(
      "- outer\n  - inner\n\n    total = \\$5",
    );
  });

  it("resumes escaping after indented code ends inside a list item", () => {
    expect(
      escapeCurrencyDollars("- item\n\n      total = $5\n    prose $10"),
    ).toBe("- item\n\n      total = $5\n    prose \\$10");
  });

  it("does not rewrite indented code after an ATX heading", () => {
    const markdown = "# Pricing\n    total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it.each(["\r", "\r\n"])(
    "does not rewrite indented code after a blank line using %j endings",
    (ending) => {
      const markdown = `Pricing:${ending}${ending}    total = $5`;
      expect(escapeCurrencyDollars(markdown)).toBe(markdown);
    },
  );

  it("still escapes a nested sublist paragraph", () => {
    expect(
      escapeCurrencyDollars("- a\n\n    - b\n\n      costs $5 and $10"),
    ).toBe("- a\n\n    - b\n\n      costs \\$5 and \\$10");
  });

  it("still escapes a lazy list continuation paragraph", () => {
    expect(
      escapeCurrencyDollars("- Plan A\nwraps here\n\n    costs $5 and $10"),
    ).toBe("- Plan A\nwraps here\n\n    costs \\$5 and \\$10");
  });

  it("does not rewrite root code after a closed list", () => {
    expect(
      escapeCurrencyDollars("- Plan A\n\nSome text\n\n    total = $5 + $10"),
    ).toBe("- Plan A\n\nSome text\n\n    total = $5 + $10");
  });

  it("still escapes prose under a blockquote inside a list item", () => {
    expect(
      escapeCurrencyDollars("1. Step\n\n   > Tip: x\n\n    Costs $5 and $10"),
    ).toBe("1. Step\n\n   > Tip: x\n\n    Costs \\$5 and \\$10");
  });

  it("still escapes prose under a bare list marker", () => {
    expect(escapeCurrencyDollars("-\n  foo\n\n    bar costs $5 and $10")).toBe(
      "-\n  foo\n\n    bar costs \\$5 and \\$10",
    );
  });

  it.each([
    ["1.\n   foo\n\n      bar costs $5", "1.\n   foo\n\n      bar costs \\$5"],
    [
      "10.\n    foo\n\n       bar costs $5",
      "10.\n    foo\n\n       bar costs \\$5",
    ],
  ])(
    "still escapes prose under a bare ordered marker: %j",
    (input, expected) => {
      expect(escapeCurrencyDollars(input)).toBe(expected);
    },
  );

  it.each(["1.\n   foo\n\n       code $5", "10.\n    foo\n\n        code $5"])(
    "does not rewrite code indented past a bare ordered marker's content column: %j",
    (input) => {
      expect(escapeCurrencyDollars(input)).toBe(input);
    },
  );

  it("still escapes list prose inside a blockquote", () => {
    expect(
      escapeCurrencyDollars("> - a\n>\n>   para1\n>\n>     para2 costs $5"),
    ).toBe("> - a\n>\n>   para1\n>\n>     para2 costs \\$5");
  });

  it("retains the list column across a nested blockquote", () => {
    expect(
      escapeCurrencyDollars(
        "- > item\n  >\n  >     prose $5\n  >\n  >       code $10\n\n    after $15",
      ),
    ).toBe(
      "- > item\n  >\n  >     prose $5\n  >\n  >       code $10\n\n    after \\$15",
    );
  });

  it("does not rewrite quoted indented code inside a list item", () => {
    const markdown = "- item\n\n  >     total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("does not rewrite code whose quote marker is itself indented", () => {
    const markdown = "- item\n\n        >     total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it.each([
    "    > first $5\n    > second $10",
    "    > first $5\n    second $10",
    "    first $5\n    > second $10",
    "    > first $5\n    >> second $10",
    "    >     first $5\n    second $10",
    "\tfirst $5\n\t> second $10",
    ">     first $5\n>     > second $10",
    ">     > first $5\n>     second $10",
    ">     > first $5\n>     >> second $10",
    "- item\n\n  >     > first $5\n  >     second $10",
    "> - item\n>\n>       > first $5\n>       second $10",
  ])("preserves literal quote markers in indented code: %j", (markdown) => {
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("resumes escaping when literal quote markers leave indented code", () => {
    expect(escapeCurrencyDollars("    > first $5\n> second $10")).toBe(
      "    > first $5\n> second \\$10",
    );
  });

  it("retains the list content column after literal quote markers", () => {
    expect(
      escapeCurrencyDollars("- item\n\n      > code $5\n    prose $10"),
    ).toBe("- item\n\n      > code $5\n    prose \\$10");
  });

  it("escapes quoted prose at the content column of a wide list marker", () => {
    expect(escapeCurrencyDollars("100. item\n\n     > prose $5")).toBe(
      "100. item\n\n     > prose \\$5",
    );
  });

  it("retains quoted list indentation across lazy paragraph continuations", () => {
    expect(
      escapeCurrencyDollars("> - a\nlazy\n>\n>     costs $5 and $10"),
    ).toBe("> - a\nlazy\n>\n>     costs \\$5 and \\$10");
  });

  it.each([">\t> $5", ">\t $5", "> \t$5", "> \t $5"])(
    "escapes quoted prose with absolute tab stops: %j",
    (markdown) => {
      expect(escapeCurrencyDollars(markdown)).toBe(
        markdown.replace("$5", "\\$5"),
      );
    },
  );

  it.each([">\t  $5", "> - a\n# heading\n    code $5", "> - a\n\n    code $5"])(
    "preserves code after tab padding or a quoted list boundary: %j",
    (markdown) => {
      expect(escapeCurrencyDollars(markdown)).toBe(markdown);
    },
  );

  it("starts a root list after a quoted list paragraph", () => {
    expect(escapeCurrencyDollars("> - a\n- b\n\n    prose $5")).toBe(
      "> - a\n- b\n\n    prose \\$5",
    );
  });

  it.each(["# Pricing", "***", "```\nx\n```"])(
    "closes a root list before the block %j",
    (block) => {
      const markdown = `- a\n${block}\n    total = $5`;
      expect(escapeCurrencyDollars(markdown)).toBe(markdown);
    },
  );

  it.each([
    "- > - # Heading\n  >\n  >     costs $5",
    "> - # Heading\n>\n>     costs $5",
    "- # Heading\n\n    costs $5",
  ])("retains list prose after an item heading: %j", (markdown) => {
    expect(escapeCurrencyDollars(markdown)).toBe(
      markdown.replace("$5", "\\$5"),
    );
  });

  it("still escapes footnote prose", () => {
    expect(
      escapeCurrencyDollars("[^1]: Pricing note\n\n    Plans cost $5 and $10"),
    ).toBe("[^1]: Pricing note\n\n    Plans cost \\$5 and \\$10");
  });

  it("escapes list prose split across an html block boundary", () => {
    // The html block hands the callback a fresh slice starting below it, but
    // the indented line still sits inside the list item, so its currency is
    // prose rather than code.
    expect(
      escapeCurrencyDollars(
        "- Step\n\n  <details>\n  <summary>Cost</summary>\n\n    Costs $5 and $10\n",
      ),
    ).toBe(
      "- Step\n\n  <details>\n  <summary>Cost</summary>\n\n    Costs \\$5 and \\$10\n",
    );
  });

  it("does not veto a code block containing marker-like text", () => {
    expect(
      escapeCurrencyDollars("notes:\n\n    - not a list $5\n    more $10"),
    ).toBe("notes:\n\n    - not a list $5\n    more $10");
  });

  it("does not hang on input starting with a blank line", () => {
    expect(escapeCurrencyDollars("\n\n    code $5")).toBe("\n\n    code $5");
  });

  it("does not hang on a lone leading newline", () => {
    expect(escapeCurrencyDollars("\nIntro:\n\n    x = $1")).toBe(
      "\nIntro:\n\n    x = $1",
    );
  });

  it("does not rewrite indented code inside a blockquote", () => {
    expect(escapeCurrencyDollars(">     total = $5")).toBe(">     total = $5");
  });

  it.each([
    ["fenced code", "```\n- fake item\n```"],
    ["HTML block", "<pre>\n- fake item\n</pre>"],
  ])("ignores a list marker inside %s before root code", (_, block) => {
    const markdown = `${block}\n\n    total = $5`;
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("preserves alternative math delimiters inside indented code", () => {
    const markdown =
      "    \\(x\\) [/math]y[/math] $5\n\nprose \\(z\\) [/math]w[/math]";
    expect(escapeCurrencyDollars(normalizeMathDelimiters(markdown))).toBe(
      "    \\(x\\) [/math]y[/math] $5\n\nprose $z$ $$w$$",
    );
  });

  it("starts indented code immediately after a fence closes", () => {
    const markdown = "```\ncode\n```\n    total = $5";
    expect(escapeCurrencyDollars(markdown)).toBe(markdown);
  });

  it("still escapes a blockquote paragraph", () => {
    expect(escapeCurrencyDollars("> total = $5")).toBe("> total = \\$5");
  });
});

describe("HTML blocks", () => {
  it("escapes prose after block tags inside display math", () => {
    expect(
      escapeCurrencyDollars("$$\n<p> = m <v>\n$$\nThe price is $5 and $10."),
    ).toBe("$$\n<p> = m <v>\n$$\nThe price is \\$5 and \\$10.");
  });

  it("escapes prose after raw tags inside display math", () => {
    expect(escapeCurrencyDollars("$$\n<pre>\n$$\n\ncosts $5")).toBe(
      "$$\n<pre>\n$$\n\ncosts \\$5",
    );
  });

  it.each([
    ["\\[", "\\]"],
    ["\\\\[", "\\\\]"],
    ["[/math]", "[/math]"],
  ])("normalizes %s display math containing block tags", (open, close) => {
    expect(normalizeMathDelimiters(`${open}\n<p> = m <v>\n${close}`)).toBe(
      "$$<p> = m <v>$$",
    );
    expect(
      normalizeMathDelimiters(`${open}\n<pre>\nx\n${close}\n\\(y\\)`),
    ).toBe("$$\n<pre>\nx\n$$\n$y$");
  });

  it("preserves currency in a completed pre block", () => {
    const text = "<pre>\ncosts $5 and $10\n</pre>";
    expect(escapeCurrencyDollars(text)).toBe(text);
  });

  it("preserves currency in an HTML block inside a nested list item", () => {
    const text = "- a\n  - b\n    <div>\n    costs $5\n    </div>";
    expect(escapeCurrencyDollars(text)).toBe(text);
  });

  it("preserves bracket math in a completed pre block", () => {
    const text = "<pre>\n\\[x\\]\n</pre>";
    expect(normalizeMathDelimiters(text)).toBe(text);
  });

  it("escapes currency outside HTML after a sibling item heading", () => {
    expect(
      escapeCurrencyDollars(
        "- item\n- # heading\n  <pre>\n  costs $5\noutside $10",
      ),
    ).toBe("- item\n- # heading\n  <pre>\n  costs $5\noutside \\$10");
  });

  describe.each([
    [
      "currency",
      escapeCurrencyDollars,
      "costs $5 and $10",
      "costs \\$5 and \\$10",
    ],
    [
      "math",
      normalizeMathDelimiters,
      "\\[x\\] \\(y\\) [/math]z[/math] [/inline]w[/inline]",
      "$$x$$ $y$ $$z$$ $w$",
    ],
  ] as const)("%s", (_, preprocess, body, rewritten) => {
    describe.each([
      ["\\[", "\\]"],
      ["\\\\[", "\\\\]"],
      ["[/math]", "[/math]"],
    ])("%s display math", (open, close) => {
      it.each([
        ["blockquote", "> ", "> ", ""],
        ["list item", "- ", "  ", ""],
        ["continued list item", "- item\n  ", "  ", ""],
        ["list inside a blockquote", "> - ", ">   ", "> "],
        ["blockquote inside a list item", "- > ", "  > ", "> "],
        ["list before a deeper blockquote", "- ", "  ", "> "],
      ])(
        "preserves HTML after the %s ends before the math closer",
        (_, prefix, continuation, after) => {
          const block = `${prefix}${open}\n${continuation}x\n${after}<pre>\n${after}${body}\n${after}${close}\n${after}</pre>`;
          expect(preprocess(`${block}\n${body}`)).toBe(
            `${block}\n${rewritten}`,
          );
        },
      );
    });

    it.each([
      ["equal closing run", "$$", "$$"],
      ["longer closing run", "$$$", "$$$$"],
      ["opening metadata", "$$ math", "$$"],
      ["shorter body run", "$$$", "$$\n<pre>\n$$$"],
      ["body run with metadata", "$$", "$$ math\n<pre>\n$$"],
      ["indented closer", "  $$", "   $$ \t"],
    ])("keeps HTML inert in display math with %s", (_, open, close) => {
      const block = `${open}\n<p> = m <v>\n${close}`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
      expect(preprocess(`${block}\n<pre>\n${body}\n</pre>\n${body}`)).toBe(
        `${block}\n<pre>\n${body}\n</pre>\n${rewritten}`,
      );
    });

    it.each(["$", "$$x$$", "$$ meta$"])(
      "does not treat %s as a display math opener",
      (open) => {
        const block = `${open}\n<pre>\n${body}\n</pre>`;
        expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
      },
    );

    it.each(["# h", "***", "```\nx\n```", "$$\nx\n$$"])(
      "preserves root HTML after %s ends a list item",
      (ending) => {
        const block = `- item\n${ending}\n  <pre>\n${body}\n</pre>`;
        expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
      },
    );

    it("preserves the item indent after a heading inside the list", () => {
      const block = `- item\n  # h\n  <pre>\n  ${body}`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it("preserves the item indent after a sibling item heading", () => {
      const block = `- item\n- # heading\n  <pre>\n  ${body}`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it.each([
      ["kind 1", "<pre>", "</pre>"],
      ["kind 1 with a tab", "<script\tdata-x>", "</script>"],
      ["kind 1 at line end", "<style", "</style>"],
      ["kind 1 with mixed case", "<TeXtArEa >", "</TEXTAREA>"],
      ["kind 2", "<!--", "-->"],
      ["kind 3", "<?target", "?>"],
      ["kind 4", "<!DOCTYPE", ">"],
      ["kind 4 with lowercase", "<!doctype", ">"],
      ["kind 5", "<![CDATA[", "]]>"],
      ["kind 6", "<div>", "</div>"],
      ["kind 6 with a closing tag", "</section>", "</section>"],
      ["kind 6 with a self-closing tag", "<div/>", "</div>"],
      ["kind 6 with an incomplete tag", "<div data-x=", "</div>"],
      ["kind 7 with a body line", "<widget>", "</widget>"],
      ["kind 7 with a closing tag", "</widget >", "</widget>"],
      [
        "kind 7 with attributes",
        "<widget :a-b.c_0='x' _b=\"y\" disabled>",
        "</widget>",
      ],
      ["kind 7 with repeated equals", "<widget value=a=b>", "</widget>"],
      [
        "kind 7 with an unquoted self-closing value",
        "<widget value=a/>",
        "</widget>",
      ],
      [
        "kind 7 with an empty self-closing value",
        "<widget value=/>",
        "</widget>",
      ],
    ])("preserves %s", (_, open, close) => {
      const block = `${open}\n${body}\n${close}`;
      expect(preprocess(`${body}\n\n${block}\n\n${body}`)).toBe(
        `${rewritten}\n\n${block}\n\n${rewritten}`,
      );
    });

    it.each([
      ["kind 1 with a longer tag name", "<prelude> tail"],
      ["kind 2 with one dash", "<!-"],
      ["kind 3 with a space before the question mark", "< ?target"],
      ["kind 4 with a digit", "<!1DOCTYPE"],
      ["kind 5 with lowercase cdata", "<![cdata["],
      ["kind 6 with a slash before attributes", "<div/foo>"],
      ["kind 7 with trailing prose", "<widget> tail"],
      ["kind 7 with a multiline tag", "<widget\nvalue='x'>"],
      ["kind 7 with a slash in an unquoted value", "<widget value=a/b>"],
      ["kind 7 with consecutive equals", "<widget value=a==b>"],
      ["kind 7 with a missing attribute value", "<widget value=>"],
      ["kind 7 with a backtick value", "<widget value=`x`>"],
      ["kind 7 with an unclosed quoted value", "<widget value='x>"],
      ["kind 7 with adjacent quoted attributes", "<widget value='x'other>"],
      ["kind 7 with attributes on a closing tag", "</widget value=x>"],
      ["kind 7 with an invalid tag name", "<widget_name>"],
    ])("rejects %s", (_, open) => {
      expect(preprocess(`${open}\n${body}`)).toBe(`${open}\n${rewritten}`);
    });

    it.each(["</script>", "</style>", "</textarea>", "</PRE>"])(
      "closes a pre block on %s",
      (close) => {
        const block = `<pre>\n${body}\n${close} ${body}`;
        expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
      },
    );

    it.each(["</pre >", "</pre\t>", "</pre/>", "</prelude>"])(
      "does not close a pre block on %s",
      (close) => {
        const block = `<pre>\n${close}\n${body}\n</pre>`;
        expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
      },
    );

    it.each(["<pre", "<!--", "<?", "<!D", "<![CDATA[", "<div>", "<widget>"])(
      "preserves every streaming body prefix after %s",
      (open) => {
        const block = `${open}\n${body}`;
        for (let end = open.length; end <= block.length; end += 1) {
          const prefix = block.slice(0, end);
          expect(preprocess(prefix)).toBe(prefix);
        }
      },
    );

    it.each(["<pre/>", "<div>", "<widget>"])(
      "ends %s at a blank line even without a closing tag",
      (open) => {
        const block = `${open}\n${body}\n</pre>\n${body}`;
        expect(preprocess(`${block}\n \t\n${body}`)).toBe(
          `${block}\n \t\n${rewritten}`,
        );
      },
    );

    it("does not close CDATA on an odd run of brackets", () => {
      const block = `<![CDATA[\n]]]>\n${body}\n]]]]]>\n${body}\n]]>`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it("closes CDATA on an even run of brackets", () => {
      const block = `<![CDATA[\n${body}\n]]]]>`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it.each(["<!-->", "<!--->", "<?>", "<!D>", "<![CDATA[]]>"])(
      "closes an empty %s block on its opening line",
      (open) => {
        expect(preprocess(`${open} ${body}\n${body}`)).toBe(
          `${open} ${body}\n${rewritten}`,
        );
      },
    );

    it.each(["<pre>", "<!--", "<?", "<!D", "<![CDATA[", "<div>"])(
      "lets %s interrupt a paragraph",
      (open) => {
        expect(preprocess(`prose\n${open}\n${body}`)).toBe(
          `prose\n${open}\n${body}`,
        );
      },
    );

    it.each([
      "<widget>",
      "<pre/>",
      "2. <widget>",
      "2) <widget>",
      "10. <widget>",
      "2. <pre>",
    ])("keeps %s in an existing paragraph", (open) => {
      expect(preprocess(`prose\n${open}\n${body}`)).toBe(
        `prose\n${open}\n${rewritten}`,
      );
    });

    it.each([
      "# heading",
      "---",
      "prose\n===",
      "prose\n---",
      "<!-- closed -->",
      "```\ncode\n```",
    ])("allows kind 7 after %s", (prefix) => {
      const block = `${prefix}\n<widget>\n${body}`;
      expect(preprocess(block)).toBe(block);
    });

    it.each(["-", "1.", "1)"])(
      "opens HTML after an interrupting %s list marker",
      (marker) => {
        const indent = " ".repeat(marker.length + 1);
        const block = `prose\n${marker} <widget>\n${indent}${body}`;
        expect(preprocess(`${block}\n\n${body}`)).toBe(
          `${block}\n\n${rewritten}`,
        );
      },
    );

    it("opens HTML in a noninterrupting ordered item after a blank line", () => {
      const block = `prose\n\n2. <widget>\n   ${body}`;
      expect(preprocess(`${block}\n\n${body}`)).toBe(
        `${block}\n\n${rewritten}`,
      );
    });

    it.each(["```", "~~~"])("keeps HTML inside %s fences inert", (fence) => {
      const block = `${fence}\n<pre>\n${body}\n${fence}`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it("keeps fences inside HTML inert", () => {
      const block = `<pre>\n~~~\n${body}\n</pre>`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it.each(["<pre>", "<widget>", "<div>", "<!--", "<![CDATA["])(
      "preserves %s in a blockquote inside a list item",
      (open) => {
        const block = `- > ${open}\n  > ${body}`;
        expect(preprocess(`${block}\n\n${body}`)).toBe(
          `${block}\n\n${rewritten}`,
        );
      },
    );

    it("ends HTML when a containing list ends before its blockquote", () => {
      const block = `- > <pre>\n  > ${body}`;
      expect(preprocess(`${block}\n> ${body}`)).toBe(
        `${block}\n> ${rewritten}`,
      );
    });

    it("keeps HTML inside a fence in a quoted list inert", () => {
      const block = `- > ~~~\n  > <pre>\n  > ${body}\n  > ~~~`;
      expect(preprocess(`${block}\n\n${body}`)).toBe(
        `${block}\n\n${rewritten}`,
      );
    });

    it("preserves a quoted raw block and resumes at its closing line", () => {
      const block = `> <pre>\n> ${body}\n> </pre>`;
      expect(preprocess(`${block}\n> ${body}\n\n${body}`)).toBe(
        `${block}\n> ${rewritten}\n\n${rewritten}`,
      );
    });

    it("ends a quoted raw block when its container ends", () => {
      const block = `>> <pre>\n>> ${body}`;
      expect(preprocess(`${block}\n> ${body}`)).toBe(
        `${block}\n> ${rewritten}`,
      );
    });

    it("ends a quoted kind 7 block on a blank quoted line", () => {
      const block = `> <widget>\n> ${body}`;
      expect(preprocess(`${block}\n>\n> ${body}`)).toBe(
        `${block}\n>\n> ${rewritten}`,
      );
    });

    it("opens kind 7 in a new blockquote after prose", () => {
      const block = `prose\n> <widget>\n> ${body}`;
      expect(preprocess(block)).toBe(block);
    });

    it("keeps kind 7 in a lazy continuation of a quoted paragraph", () => {
      const block = `> prose\n<widget>\n${body}`;
      expect(preprocess(block)).toBe(`> prose\n<widget>\n${rewritten}`);
    });

    it.each(["\r\n", "\r"])(
      "preserves HTML with %j line endings",
      (newline) => {
        const block = `<pre>${newline}${body}${newline}</pre>`;
        expect(preprocess(`${block}${newline}${body}`)).toBe(
          `${block}${newline}${rewritten}`,
        );
      },
    );

    it("does not require a raw body to keep its opener's indentation", () => {
      const block = `   <pre>\n${body}\n</pre>`;
      expect(preprocess(`${block}\n${body}`)).toBe(`${block}\n${rewritten}`);
    });

    it("keeps inline tags in prose eligible for preprocessing", () => {
      expect(preprocess(`prose <span>${body}</span>`)).toBe(
        `prose <span>${rewritten}</span>`,
      );
    });

    it("does not carry an inline code span across an HTML block", () => {
      const block = `prose \`\n<pre>\n${body}\n</pre>`;
      expect(preprocess(`${block}\n\` ${body}`)).toBe(
        `${block}\n\` ${rewritten}`,
      );
    });
  });
});
