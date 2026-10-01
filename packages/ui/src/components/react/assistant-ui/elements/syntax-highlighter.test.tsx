import { cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SyntaxHighlighter } from "./syntax-highlighter";

afterEach(cleanup);

const Pre = (props: ComponentProps<"pre">) => (
  <pre data-testid="pre" {...props} />
);
const Code = (props: ComponentProps<"code">) => <code {...props} />;

describe("SyntaxHighlighter", () => {
  it("leaves the code block background to the theme's Pre", async () => {
    const { getAllByTestId } = render(
      <SyntaxHighlighter
        language="ts"
        code="const answer = 42;"
        components={{ Pre, Code }}
      />,
    );

    await waitFor(() => expect(getAllByTestId("pre")).toHaveLength(2));
    for (const pre of getAllByTestId("pre")) {
      expect(pre.style.background).toBe("");
      expect(pre.style.backgroundColor).toBe("");
      const code = pre.querySelector("code");
      expect(code).not.toBeNull();
      expect(["", "none"]).toContain(code!.style.background);
      expect(["", "transparent"]).toContain(code!.style.backgroundColor);
    }
  });
});
