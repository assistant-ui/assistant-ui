import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageGeneration } from "./image-generation";

afterEach(cleanup);

describe("ImageGeneration", () => {
  it("does not render regenerate without a handler", () => {
    render(<ImageGeneration prompt="A mountain lake" generating={false} />);

    expect(
      screen.queryByRole("button", { name: "Regenerate image" }),
    ).toBeNull();
  });

  it("reports regenerate after generation completes", () => {
    const onRegenerate = vi.fn();
    render(
      <ImageGeneration
        prompt="A mountain lake"
        generating={false}
        onRegenerate={onRegenerate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerate image" }));

    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("keeps the hidden regenerate action out of keyboard navigation", () => {
    const onRegenerate = vi.fn();
    render(
      <ImageGeneration
        prompt="A mountain lake"
        generating
        onRegenerate={onRegenerate}
      />,
    );

    const button = screen.getByLabelText("Regenerate image");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(button);
    expect(onRegenerate).not.toHaveBeenCalled();
  });
});
