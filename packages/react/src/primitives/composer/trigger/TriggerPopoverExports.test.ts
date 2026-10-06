import { describe, expect, expectTypeOf, it } from "vitest";
import * as ComposerPrimitive from "../../composer";
import {
  defaultDirectiveFormatter,
  unstable_defaultDirectiveFormatter,
  type DirectiveFormatter,
  type TriggerAdapter,
  type TriggerCategory,
  type TriggerItem,
  type Unstable_DirectiveFormatter,
  type Unstable_TriggerBehavior,
  type Unstable_TriggerItem,
} from "../../../index";
import type { TriggerBehavior } from "./triggerSelectionResource";

describe("stable trigger popover exports", () => {
  it("keeps every old composer member as an alias of its stable member", () => {
    expect(ComposerPrimitive.Unstable_TriggerPopover).toBe(
      ComposerPrimitive.TriggerPopover,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopover.Directive).toBe(
      ComposerPrimitive.TriggerPopover.Directive,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopover.Action).toBe(
      ComposerPrimitive.TriggerPopover.Action,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopoverRoot).toBe(
      ComposerPrimitive.TriggerPopoverRoot,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopoverCategories).toBe(
      ComposerPrimitive.TriggerPopoverCategories,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopoverCategoryItem).toBe(
      ComposerPrimitive.TriggerPopoverCategoryItem,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopoverItems).toBe(
      ComposerPrimitive.TriggerPopoverItems,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopoverItem).toBe(
      ComposerPrimitive.TriggerPopoverItem,
    );
    expect(ComposerPrimitive.Unstable_TriggerPopoverBack).toBe(
      ComposerPrimitive.TriggerPopoverBack,
    );
  });

  it("keeps the old members' namespaced prop types", () => {
    expectTypeOf<ComposerPrimitive.Unstable_TriggerPopoverItem.Props>().toEqualTypeOf<ComposerPrimitive.TriggerPopoverItem.Props>();
    expectTypeOf<ComposerPrimitive.Unstable_TriggerPopoverBack.Element>().toEqualTypeOf<ComposerPrimitive.TriggerPopoverBack.Element>();
  });

  it("exports the stable adapter, item, category and formatter names beside the old ones", () => {
    expect(unstable_defaultDirectiveFormatter).toBe(defaultDirectiveFormatter);
    expectTypeOf<Unstable_TriggerItem>().toEqualTypeOf<TriggerItem>();
    expectTypeOf<Unstable_DirectiveFormatter>().toEqualTypeOf<DirectiveFormatter>();
    expectTypeOf<TriggerAdapter["categories"]>().returns.toEqualTypeOf<
      readonly TriggerCategory[]
    >();
    expectTypeOf<Unstable_TriggerBehavior>().toEqualTypeOf<TriggerBehavior>();
  });
});
