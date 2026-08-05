import { describe, expect, it } from "vitest";
import type { ExternalThreadQueueAdapter } from "../../runtime/queue/external-thread-queue-adapter";
import { pickExternalStoreSharedOptions } from "./external-store-shared-options";

describe("pickExternalStoreSharedOptions", () => {
  it("forwards the queue adapter", () => {
    const queue = {} as ExternalThreadQueueAdapter;

    expect(pickExternalStoreSharedOptions({ queue }).queue).toBe(queue);
  });
});
