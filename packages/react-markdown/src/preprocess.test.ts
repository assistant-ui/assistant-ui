import { describe, it, expect } from "vitest";
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

  it("nests a body inside a list item written in a blockquote", () => {
    expect(
      rewriteLatexBracketDelimiters(">  - item \\[\na\nb\n\\]\n>  - next"),
    ).toBe(">  - item \n>    $$\n>    a\n>    b\n>    $$\n>  - next");
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
    expect(rewriteLatexBracketDelimiters("\\( \\)")).toBe("\\( \\)");
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
      "- > ```js\n  > const price = $5;\n\n  > const tax = $2;\n  > ```\n\nafter $10";
    expect(escapeCurrencyDollars(fenced)).toBe(
      "- > ```js\n  > const price = $5;\n\n  > const tax = $2;\n  > ```\n\nafter \\$10",
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

  it("escapes currency glued to a preceding word", () => {
    expect(escapeCurrencyDollars("Prices range from US$50 to US$100")).toBe(
      "Prices range from US\\$50 to US\\$100",
    );
  });

  it("escapes an amount whose next dollar opens another amount", () => {
    expect(escapeCurrencyDollars("$50 to US$60")).toBe("\\$50 to US\\$60");
  });
});
