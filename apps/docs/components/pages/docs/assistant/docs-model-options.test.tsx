// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { docsModelOptions } from "./docs-model-options";

afterEach(cleanup);

describe("docsModelOptions", () => {
  it("disables gated models for anonymous visitors", () => {
    const options = docsModelOptions({ signedIn: false });
    for (const id of ["gpt-6-luna", "anthropic/claude-haiku-5-5"]) {
      expect(options.find((option) => option.id === id)).toMatchObject({
        disabled: true,
        description: "Sign in to use",
      });
    }
    expect(
      options.find((option) => option.id === "zai/glm-5.3-flash")?.disabled,
    ).toBeUndefined();
    const signedIn = docsModelOptions({ signedIn: true });
    for (const id of ["gpt-6-luna", "anthropic/claude-haiku-5-5"]) {
      const option = signedIn.find((candidate) => candidate.id === id);
      expect(option?.disabled).toBeUndefined();
      expect(option?.description).toBeUndefined();
    }
  });

  it("matches provider logos to the model selector icon envelope", () => {
    const { container } = render(
      <>
        {docsModelOptions({ signedIn: true }).map((model) => (
          <div key={model.id}>{model.icon}</div>
        ))}
      </>,
    );

    const images = Array.from(container.querySelectorAll("img"));
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.getAttribute("width")).toBe("14");
      expect(image.getAttribute("height")).toBe("14");
      expect([...image.classList]).toContain("size-3.5");
    }
  });
});
