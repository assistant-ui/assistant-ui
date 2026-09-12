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
  it.each(["__proto__", "constructor"])(
    "registers and removes a renderer named %s",
    async (name) => {
      let aui!: AnyClient;
      const Harness = () => {
        aui = useAui({ dataRenderers: DataRenderers() } as never);
        return null;
      };
      render(<Harness />);

      let remove!: () => void;
      await act(async () => {
        remove = aui.dataRenderers().setDataUI(name, () => null);
        await vi.waitFor(() => {
          const renderers = aui.dataRenderers().getState().renderers;
          expect(Object.hasOwn(renderers, name)).toBe(true);
          expect(renderers[name]).toHaveLength(1);
        });
      });

      await act(async () => {
        remove();
        await vi.waitFor(() =>
          expect(
            Object.hasOwn(aui.dataRenderers().getState().renderers, name),
          ).toBe(false),
        );
      });
    },
  );
});
