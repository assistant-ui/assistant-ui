import { act, cleanup, render } from "@testing-library/react";
import {
  forwardRef,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const positioner = vi.hoisted(() => ({ preferredSides: [] as string[] }));

function withFlippingPositioner<T extends object>(original: T) {
  const opposite = (side: string) => (side === "top" ? "bottom" : "top");
  const PopoverContent = forwardRef<
    HTMLDivElement,
    ComponentPropsWithoutRef<"div"> & {
      side?: string;
      align?: string;
      sideOffset?: number;
    }
  >(function PopoverContent(
    { side = "bottom", align: _align, sideOffset: _sideOffset, ...props },
    ref,
  ) {
    const [rendered, setRendered] = useState<string>();
    positioner.preferredSides.push(side);
    useEffect(() => {
      const timer = setTimeout(() => setRendered(opposite(side)));
      return () => clearTimeout(timer);
    }, [side]);
    return <div ref={ref} data-side={rendered ?? side} {...props} />;
  });
  return {
    ...original,
    Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
    PopoverContent,
  };
}

vi.mock("@/components/ui/popover", async (importOriginal) =>
  withFlippingPositioner(await importOriginal<object>()),
);
vi.mock("@/components/ui/radix/popover", async (importOriginal) =>
  withFlippingPositioner(await importOriginal<object>()),
);

import * as BaseModelSelector from "./model-selector";
import * as RadixModelSelector from "./model-selector.radix";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

const MODELS = [
  { id: "a", name: "Model A" },
  { id: "b", name: "Model B" },
];

describe.each([
  ["Base UI", BaseModelSelector],
  ["Radix", RadixModelSelector],
])(
  "%s ModelSelectorContent",
  (_, { ModelSelectorRoot, ModelSelectorContent }) => {
    it("keeps the side it first flips to when the positioner keeps flipping", async () => {
      positioner.preferredSides.length = 0;
      render(
        <ModelSelectorRoot models={MODELS} defaultOpen>
          <ModelSelectorContent />
        </ModelSelectorRoot>,
      );

      for (let i = 0; i < 10; i++) {
        await act(() => new Promise((resolve) => setTimeout(resolve)));
      }

      const changes = positioner.preferredSides.filter(
        (side, index, sides) => index > 0 && side !== sides[index - 1],
      );
      expect(changes).toEqual(["top"]);
    });
  },
);
