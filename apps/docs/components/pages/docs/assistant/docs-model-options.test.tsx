// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { docsModelOptions } from "./docs-model-options";

afterEach(cleanup);

describe("docsModelOptions", () => {
  it("matches provider logos to the model selector icon envelope", () => {
    const { container } = render(
      <>
        {docsModelOptions().map((model) => (
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
