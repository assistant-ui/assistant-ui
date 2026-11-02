import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import * as BaseModelSelector from "./model-selector";
import * as RadixModelSelector from "./model-selector.radix";

afterEach(cleanup);

const MODELS = [{ id: "a", name: "Model A", efforts: true }];

describe.each([
  ["Base UI", BaseModelSelector],
  ["Radix", RadixModelSelector],
])(
  "%s ModelSelectorTrigger",
  (_, { ModelSelectorRoot, ModelSelectorTrigger }) => {
    it("includes the visible selection in the combobox name and lets the consumer rename it", () => {
      const { rerender } = render(
        <ModelSelectorRoot models={MODELS} value="a" effort="high">
          <ModelSelectorTrigger />
        </ModelSelectorRoot>,
      );
      expect(
        screen.getByRole("combobox", { name: "Model: Model A High" }),
      ).toBeTruthy();

      rerender(
        <ModelSelectorRoot models={[]}>
          <ModelSelectorTrigger />
        </ModelSelectorRoot>,
      );
      expect(
        screen.getByRole("combobox", { name: "Select model" }),
      ).toBeTruthy();

      rerender(
        <ModelSelectorRoot models={MODELS} value="a">
          <ModelSelectorTrigger aria-label="Summary model" />
        </ModelSelectorRoot>,
      );
      expect(
        screen.getByRole("combobox", { name: "Summary model" }),
      ).toBeTruthy();
    });
  },
);
