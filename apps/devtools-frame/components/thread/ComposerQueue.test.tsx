import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ComposerQueue } from "./ComposerQueue";

describe("ComposerQueue", () => {
  it("renders the queued prompts", () => {
    const html = renderToStaticMarkup(
      <ComposerQueue
        queue={[{ id: "q1", prompt: "first" }, { prompt: "second" }]}
      />,
    );
    expect(html).toContain("Message Queue (2)");
    expect(html).toContain("first");
    expect(html).toContain("second");
  });

  it("renders nothing when the queue is empty", () => {
    expect(renderToStaticMarkup(<ComposerQueue queue={[]} />)).toBe("");
  });
});
