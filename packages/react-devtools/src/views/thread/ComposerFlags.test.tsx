import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComposerFlags } from "./ComposerFlags";

describe("ComposerFlags", () => {
  it("renders only the boolean flags that are present", () => {
    const html = renderToStaticMarkup(
      <ComposerFlags
        composer={{
          textLength: 0,
          attachments: [],
          queue: [],
          isEditing: true,
          canSend: false,
        }}
      />,
    );
    expect(html).toContain("Edit: true");
    expect(html).toContain("Can send: false");
    expect(html).not.toContain("Can cancel");
    expect(html).not.toContain("Empty");
  });
});
