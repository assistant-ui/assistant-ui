// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useExternalStoreSharedOptions } from "./useExternalStoreSharedOptions";
import { pickExternalStoreSharedOptions } from "../../runtimes/external-store/external-store-shared-options";

afterEach(cleanup);

it("preserves and memoizes checkpoint availability in shared adapter options", () => {
  const { result, rerender } = renderHook(
    ({ canResume }) =>
      useExternalStoreSharedOptions(
        pickExternalStoreSharedOptions({ canResume }),
      ),
    { initialProps: { canResume: false } },
  );
  expect(result.current.canResume).toBe(false);
  const initial = result.current;
  rerender({ canResume: false });
  expect(result.current).toBe(initial);
  rerender({ canResume: true });
  expect(result.current.canResume).toBe(true);
  expect(result.current).not.toBe(initial);
});
