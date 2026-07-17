// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCloudChatCore } from "./useCloudChatCore";

describe("useCloudChatCore", () => {
  it("tracks mounted state when Strict Mode replays effects", () => {
    const cloud = {} as never;
    const { result, unmount } = renderHook(
      () =>
        useCloudChatCore(cloud, {
          threads: {} as never,
          chatConfig: {},
        }),
      { reactStrictMode: true },
    );

    const core = result.current;
    expect(core.mountedRef.current).toBe(true);

    unmount();
    expect(core.mountedRef.current).toBe(false);
  });
});
