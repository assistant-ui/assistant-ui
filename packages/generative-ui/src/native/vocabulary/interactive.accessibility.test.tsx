// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const accessibilityLabels = vi.hoisted(() => ({ values: [] as unknown[] }));

vi.mock("react-native", async (importOriginal) => {
  const native = await importOriginal<typeof import("react-native")>();
  return {
    ...native,
    Pressable: (props: {
      accessibilityLabel?: unknown;
      children?: ReactNode;
    }) => {
      accessibilityLabels.values.push(props.accessibilityLabel);
      return props.children ?? null;
    },
  };
});

import { cleanupSpecs, renderElement } from "../testUtils";
import { interactiveVocabulary } from "./interactive";

afterEach(() => {
  cleanupSpecs();
  accessibilityLabels.values.length = 0;
});

describe("React Native checkbox accessibility labels", () => {
  it.each([undefined, "switch"] as const)(
    "passes numeric labels as strings for variant %s",
    (variant) => {
      renderElement(
        interactiveVocabulary.Checkbox.render({
          label: 0,
          ...(variant ? { variant } : {}),
        } as never),
      );
      expect(accessibilityLabels.values).toEqual(["0"]);
    },
  );
});
