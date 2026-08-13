// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withKey } from "@assistant-ui/tap";
import { useAui } from "@assistant-ui/store";
import { Tools } from "../react/client/Tools";
import { ModelContext } from "../store/clients/model-context-client";
import type { Toolkit } from "../react/model-context/toolbox";

type AnyClient = Record<string, any>;

const toolkit = {
  lookup: {
    description: "look something up",
    parameters: { type: "object", properties: {} },
    execute: async () => "ok",
  },
} as unknown as Toolkit;

afterEach(() => {
  cleanup();
});

describe("Tools model-context registration", () => {
  it("migrates to a structurally replaced modelContext scope", async () => {
    let aui!: AnyClient;
    const Harness = ({ generation }: { generation: number }) => {
      aui = useAui({
        tools: Tools({ toolkit }),
        modelContext: withKey(String(generation), ModelContext()),
      } as never);
      return null;
    };
    const view = render(<Harness generation={0} />);

    expect(
      Object.keys(aui.modelContext().getModelContext().tools ?? {}),
    ).toContain("lookup");

    // A rerender inside an outer act would not land until that act exits,
    // so the swap happens first and only the scheduler wait is wrapped
    view.rerender(<Harness generation={1} />);

    // The registration lands one scheduler macrotask after the swap: the
    // mount-time register marks the tap scheduler dirty, which defers the
    // structural publish to the scheduler's drain. The remounted scope
    // starts from fresh state, so the tools reappearing proves the
    // registration migrated to the replacement instance.
    await act(async () => {
      await vi.waitFor(() =>
        expect(
          Object.keys(aui.modelContext().getModelContext().tools ?? {}),
        ).toContain("lookup"),
      );
    });
  });
});
