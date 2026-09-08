// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource, useResource } from "@assistant-ui/tap";
import { useResourceCleanup } from "./useResourceCleanup";

describe("useResourceCleanup", () => {
  afterEach(cleanup);

  it("cleans up permanent disposal when client-destroy cleanup is disabled", () => {
    const dispose = vi.fn();
    const First = resource(function useFirst() {
      useResourceCleanup(false, dispose);
      return null;
    });
    const Second = resource(function useSecond() {
      return null;
    });
    function App({ first }: { first: boolean }) {
      useResource(first ? First() : Second());
      return null;
    }

    const { rerender } = render(<App first={true} />);
    expect(dispose).not.toHaveBeenCalled();

    rerender(<App first={false} />);
    expect(dispose).toHaveBeenCalledOnce();
  });
});
