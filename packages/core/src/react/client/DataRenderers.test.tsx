// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { useAui } from "@assistant-ui/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataRenderers } from "./DataRenderers";

type AnyClient = Record<string, any>;

afterEach(() => {
  cleanup();
});

describe("DataRenderers", () => {
  it("registers and removes a renderer named __proto__", async () => {
    let aui!: AnyClient;
    const Harness = () => {
      aui = useAui({ dataRenderers: DataRenderers() } as never);
      return null;
    };
    render(<Harness />);

    let remove!: () => void;
    await act(async () => {
      remove = aui.dataRenderers().setDataUI("__proto__", () => null);
      await vi.waitFor(() => {
        const renderers = aui.dataRenderers().getState().renderers;
        expect(Object.hasOwn(renderers, "__proto__")).toBe(true);
        expect(renderers.__proto__).toHaveLength(1);
      });
    });

    await act(async () => {
      remove();
      await vi.waitFor(() =>
        expect(aui.dataRenderers().getState().renderers.__proto__).toHaveLength(
          0,
        ),
      );
    });
  });
});
