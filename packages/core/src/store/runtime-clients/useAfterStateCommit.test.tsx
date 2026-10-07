// @vitest-environment jsdom

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAfterStateCommit } from "./useAfterStateCommit";

const actEnvironment = globalThis as {
  IS_REACT_ACT_ENVIRONMENT?: boolean | undefined;
};
let previousActEnvironment: boolean | undefined;

beforeEach(() => {
  previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  // Outside act(), React flushes passive effects in a later task, so a
  // promise settled during render resolves before the first effect runs.
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
});

afterEach(() => {
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

const state = { loaded: true };
const getState = () => state;

it("waits for the first commit when the promise settles before it", async () => {
  const order: string[] = [];
  let delayed: Promise<void> | undefined;
  const Owner = () => {
    const afterStateCommit = useAfterStateCommit(state, getState);
    delayed ??= afterStateCommit(Promise.resolve()).then(() => {
      order.push("resolved");
    });
    useEffect(() => {
      order.push("committed");
    }, []);
    return null;
  };

  const root = createRoot(document.createElement("div"));
  root.render(<Owner />);
  await vi.waitFor(() => expect(order).toContain("resolved"));
  expect(order).toEqual(["committed", "resolved"]);
  root.unmount();
});

it("resolves at once after the owner unmounts", async () => {
  let afterStateCommit:
    | ReturnType<typeof useAfterStateCommit<typeof state>>
    | undefined;
  let committed = false;
  const Owner = () => {
    afterStateCommit = useAfterStateCommit(state, getState);
    useEffect(() => {
      committed = true;
    }, []);
    return null;
  };

  const root = createRoot(document.createElement("div"));
  root.render(<Owner />);
  await vi.waitFor(() => expect(committed).toBe(true));
  root.unmount();

  const resolved = vi.fn();
  void afterStateCommit!(Promise.resolve()).then(resolved);
  // Well under the 100ms commit timeout.
  await vi.waitFor(() => expect(resolved).toHaveBeenCalled(), {
    timeout: 50,
    interval: 5,
  });
});
