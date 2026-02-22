import { describe, it, expect, vi } from "vitest";
import { ExternalStoreThreadListRuntimeCore } from "../runtimes/external-store/external-store-thread-list-runtime-core";

const createMockThreadFactory = () =>
  vi.fn(
    () =>
      ({
        __internal_setAdapter: vi.fn(),
      }) as any,
  );

describe("ExternalStoreThreadListRuntimeCore", () => {
  describe("mainThreadId initialization", () => {
    it("should set mainThreadId to DEFAULT_THREAD_ID when no threadId provided", () => {
      const factory = createMockThreadFactory();
      const core = new ExternalStoreThreadListRuntimeCore({}, factory);
      expect(core.mainThreadId).toBe("DEFAULT_THREAD_ID");
    });

    it("should set mainThreadId from adapter.threadId on construction", () => {
      const factory = createMockThreadFactory();
      const core = new ExternalStoreThreadListRuntimeCore(
        { threadId: "my-thread-123" },
        factory,
      );
      expect(core.mainThreadId).toBe("my-thread-123");
    });

    it("should retain mainThreadId when setAdapter is called with same threadId after construction", () => {
      const factory = createMockThreadFactory();
      const adapter = { threadId: "my-thread-123" };
      const core = new ExternalStoreThreadListRuntimeCore(adapter, factory);

      // Simulate useEffect calling setAdapter again with same adapter
      core.__internal_setAdapter(adapter);

      expect(core.mainThreadId).toBe("my-thread-123");
    });

    it("should update mainThreadId when adapter threadId changes", () => {
      const factory = createMockThreadFactory();
      const core = new ExternalStoreThreadListRuntimeCore(
        { threadId: "thread-1" },
        factory,
      );
      expect(core.mainThreadId).toBe("thread-1");

      core.__internal_setAdapter({ threadId: "thread-2" });
      expect(core.mainThreadId).toBe("thread-2");
    });
  });
});
