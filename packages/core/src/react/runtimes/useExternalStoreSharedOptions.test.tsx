// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExternalThreadQueueAdapter } from "../../runtime/queue/external-thread-queue-adapter";
import { useExternalStoreSharedOptions } from "./useExternalStoreSharedOptions";

describe("useExternalStoreSharedOptions", () => {
  it("keeps the queue adapter in the memoized shared options", () => {
    const queue = {} as ExternalThreadQueueAdapter;
    const { result } = renderHook(() =>
      useExternalStoreSharedOptions({ queue }),
    );

    expect(result.current.queue).toBe(queue);
  });
});
