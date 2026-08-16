// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useResourceCleanup } from "./useResourceCleanup";

describe("useResourceCleanup", () => {
  it("ignores the Strict Mode effect replay and cleans up on unmount", async () => {
    const cleanup = vi.fn();
    const Probe = () => {
      useResourceCleanup(cleanup);
      return null;
    };

    const result = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cleanup).not.toHaveBeenCalled();

    result.unmount();
    await waitFor(() => {
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });
});
