import { resource, tapEffectEvent, tapResource } from "@assistant-ui/tap";
import type {
  Unstable_TriggerAdapter,
  Unstable_TriggerCategory,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import type { AssistantClient } from "@assistant-ui/store";
import { TriggerDetectionResource } from "./triggerDetectionResource";
import { TriggerKeyboardResource } from "./triggerKeyboardResource";
import { TriggerNavigationResource } from "./triggerNavigationResource";
import {
  TriggerSelectionResource,
  type SelectItemOverride,
  type TriggerBehavior,
} from "./triggerSelectionResource";

export type { SelectItemOverride, TriggerBehavior };
export type { TriggerPopoverKeyEvent } from "./triggerKeyboardResource";

/** @deprecated Use `TriggerBehavior`. */
export type OnSelectBehavior = TriggerBehavior;

export type TriggerPopoverResourceOutput = {
  readonly open: boolean;
  readonly query: string;
  readonly activeCategoryId: string | null;
  readonly categories: readonly Unstable_TriggerCategory[];
  readonly items: readonly Unstable_TriggerItem[];
  readonly highlightedIndex: number;
  readonly isSearchMode: boolean;
  /** Stable ID prefix for generating accessible element IDs. */
  readonly popoverId: string;
  /** ID of the currently highlighted item (for aria-activedescendant). */
  readonly highlightedItemId: string | undefined;

  selectCategory(categoryId: string): void;
  goBack(): void;
  selectItem(item: Unstable_TriggerItem): void;
  close(): void;
  handleKeyDown(e: {
    readonly key: string;
    readonly shiftKey: boolean;
    preventDefault(): void;
  }): boolean;

  setCursorPosition(pos: number): void;
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

/** Composes detection, navigation, keyboard, and selection sub-resources. */
export const TriggerPopoverResource = resource(
  ({
    adapter,
    text,
    triggerChar,
    behavior,
    aui,
    popoverId,
  }: {
    adapter: Unstable_TriggerAdapter | undefined;
    text: string;
    triggerChar: string;
    behavior: TriggerBehavior | undefined;
    aui: AssistantClient;
    /** Stable ID for accessible element IDs (pass React's useId() from component layer). */
    popoverId: string;
  }): TriggerPopoverResourceOutput => {
    const detection = tapResource(
      TriggerDetectionResource({ text, triggerChar }),
    );

    const open =
      detection.trigger !== null &&
      adapter !== undefined &&
      behavior !== undefined;

    const navigation = tapResource(
      TriggerNavigationResource({
        adapter,
        query: detection.query,
        open,
      }),
    );

    const onSelected = tapEffectEvent(() => {
      navigation.goBack();
    });

    const selection = tapResource(
      TriggerSelectionResource({
        behavior,
        trigger: detection.trigger,
        aui,
        triggerChar,
        setCursorPosition: detection.setCursorPosition,
        onSelected,
      }),
    );

    const keyboard = tapResource(
      TriggerKeyboardResource({
        navigableList: navigation.navigableList,
        isSearchMode: navigation.isSearchMode,
        activeCategoryId: navigation.activeCategoryId,
        query: detection.query,
        popoverId,
        open,
        selectItem: selection.selectItem,
        selectCategory: navigation.selectCategory,
        goBack: navigation.goBack,
        close: selection.close,
      }),
    );

    return {
      open,
      query: detection.query,
      activeCategoryId: navigation.activeCategoryId,
      categories: navigation.categories,
      items: navigation.items,
      highlightedIndex: keyboard.highlightedIndex,
      isSearchMode: navigation.isSearchMode,
      popoverId,
      highlightedItemId: keyboard.highlightedItemId,
      selectCategory: navigation.selectCategory,
      goBack: navigation.goBack,
      selectItem: selection.selectItem,
      close: selection.close,
      handleKeyDown: keyboard.handleKeyDown,
      setCursorPosition: detection.setCursorPosition,
      registerSelectItemOverride: selection.registerSelectItemOverride,
    };
  },
);
