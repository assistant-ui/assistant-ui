import { describe, expect, it } from "vitest";
import type { ToolsState } from "../react/types/scopes";
import {
  clearToolActivityState,
  setToolActivityState,
} from "../react/client/tools-state";

describe("Tools activity state logic", () => {
  const createState = (): ToolsState => ({
    tools: {},
    toolActivities: {},
  });

  it("does not remove a newer tool activity when an older unsubscribe runs", () => {
    const first = () => "first";
    const second = () => "second";

    let state = createState();
    state = setToolActivityState(state, "search_web", first);
    state = setToolActivityState(state, "search_web", second);

    state = clearToolActivityState(state, "search_web", first);

    expect(state.toolActivities.search_web).toBe(second);
  });
});
