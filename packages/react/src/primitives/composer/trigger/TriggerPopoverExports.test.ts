import { describe, expect, expectTypeOf, it } from "vitest";
import * as ComposerPrimitive from "../../composer";
import type { Unstable_TriggerBehavior } from "../../../index";
import type { TriggerBehavior } from "./triggerSelectionResource";
import {
  defaultDirectiveFormatter,
  unstable_defaultDirectiveFormatter,
  type DirectiveFormatter,
  type DirectiveSegment,
  type TriggerAdapter,
  type TriggerCategory,
  type TriggerItem,
} from "../../../../../core/src/index";

describe("stable trigger popover exports", () => {
  it("keeps the old composer members as aliases and exports the stable core surface", () => {
    expect(ComposerPrimitive.TriggerPopover).toBe(
      ComposerPrimitive.Unstable_TriggerPopover,
    );
    expect(ComposerPrimitive.TriggerPopover.Directive).toBe(
      ComposerPrimitive.Unstable_TriggerPopover.Directive,
    );
    expect(ComposerPrimitive.TriggerPopover.Action).toBe(
      ComposerPrimitive.Unstable_TriggerPopover.Action,
    );
    expect(ComposerPrimitive.TriggerPopoverRoot).toBe(
      ComposerPrimitive.Unstable_TriggerPopoverRoot,
    );
    expect(ComposerPrimitive.TriggerPopoverCategories).toBe(
      ComposerPrimitive.Unstable_TriggerPopoverCategories,
    );
    expect(ComposerPrimitive.TriggerPopoverCategoryItem).toBe(
      ComposerPrimitive.Unstable_TriggerPopoverCategoryItem,
    );
    expect(ComposerPrimitive.TriggerPopoverItems).toBe(
      ComposerPrimitive.Unstable_TriggerPopoverItems,
    );
    expect(ComposerPrimitive.TriggerPopoverItem).toBe(
      ComposerPrimitive.Unstable_TriggerPopoverItem,
    );
    expect(ComposerPrimitive.TriggerPopoverBack).toBe(
      ComposerPrimitive.Unstable_TriggerPopoverBack,
    );
    expect(defaultDirectiveFormatter).toBe(unstable_defaultDirectiveFormatter);
    expectTypeOf<TriggerItem>().toHaveProperty("id");
    expectTypeOf<TriggerCategory>().toHaveProperty("id");
    expectTypeOf<TriggerAdapter>().toHaveProperty("categories");
    expectTypeOf<DirectiveSegment>().toMatchTypeOf<
      { kind: "text" } | { kind: "mention" }
    >();
    expectTypeOf<DirectiveFormatter>().toHaveProperty("serialize");
    expectTypeOf<Unstable_TriggerBehavior>().toEqualTypeOf<TriggerBehavior>();
  });
});
