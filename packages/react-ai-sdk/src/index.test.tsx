// @vitest-environment jsdom

import * as upstream from "@assistant-ui/ai-sdk";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import * as entry from "./index";

afterEach(cleanup);

// oxlint cannot follow the `export *` from @assistant-ui/ai-sdk when it is unbuilt, so members are read through a typed alias.
const index: typeof entry = entry;

describe("@assistant-ui/react-ai-sdk", () => {
  it("exports exactly what @assistant-ui/ai-sdk exports", () => {
    const exported: Record<string, unknown> = { ...entry };
    const expected: Record<string, unknown> = { ...upstream };

    expect(Object.keys(exported).sort()).toEqual(Object.keys(expected).sort());
    for (const name of Object.keys(expected)) {
      expect(exported[name]).toBe(expected[name]);
    }
  });

  it("includes the web-only runtime and tool exports", () => {
    expect(index.useChatRuntime).toBe(upstream.useChatRuntime);
    expect(index.AssistantChatTransport).toBe(upstream.AssistantChatTransport);
    expect(index.AISDKThreads).toBe(upstream.AISDKThreads);
    expect(index.AISDKToolkit).toBe(upstream.AISDKToolkit);
  });

  it("mounts a component that creates a runtime with useChatRuntime", () => {
    let runtime: ReturnType<typeof entry.useChatRuntime> | undefined;
    const Host = () => {
      runtime = index.useChatRuntime();
      return <p>mounted</p>;
    };

    const view = render(<Host />);

    expect(view.getByText("mounted")).toBeTruthy();
    expect(runtime?.thread.getState().messages).toEqual([]);
  });
});
