import { resource, tapEffectEvent, tapRef } from "@assistant-ui/tap";
import type {
  Unstable_DirectiveFormatter,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import type { AssistantClient } from "@assistant-ui/store";
import type { DetectedTrigger } from "./triggerDetectionResource";

/** External override for selection (used by Lexical's DirectivePlugin). */
export type SelectItemOverride = (item: Unstable_TriggerItem) => boolean;

export type TriggerBehavior =
  | {
      readonly kind: "directive";
      readonly formatter: Unstable_DirectiveFormatter;
      readonly onInserted?: (item: Unstable_TriggerItem) => void;
    }
  | {
      readonly kind: "action";
      readonly formatter: Unstable_DirectiveFormatter;
      readonly onExecute: (item: Unstable_TriggerItem) => void;
      readonly removeOnExecute?: boolean;
    };

export type TriggerSelectionResourceOutput = {
  /** Select an item — runs override (if any) then applies behavior. */
  selectItem(item: Unstable_TriggerItem): void;
  /** Close the popover (moves cursor before trigger to deactivate detection). */
  close(): void;
  /** Register a Lexical-style selection override. Returns unregister fn. */
  registerSelectItemOverride(fn: SelectItemOverride): () => void;
};

/** Owns composer text mutation + behavior dispatch on item selection. */
export const TriggerSelectionResource = resource(
  ({
    behavior,
    trigger,
    aui,
    triggerChar,
    setCursorPosition,
    onSelected,
  }: {
    behavior: TriggerBehavior | undefined;
    trigger: DetectedTrigger | null;
    aui: AssistantClient;
    triggerChar: string;
    setCursorPosition: (pos: number) => void;
    /** Called after a successful selection so the parent can reset nav state. */
    onSelected: () => void;
  }): TriggerSelectionResourceOutput => {
    // Select-item override: lets Lexical's DirectivePlugin intercept selection
    // and drive its own node insertion.
    const selectItemOverrideRef = tapRef<SelectItemOverride | null>(null);

    const registerSelectItemOverride = tapEffectEvent(
      (fn: SelectItemOverride) => {
        selectItemOverrideRef.current = fn;
        return () => {
          if (selectItemOverrideRef.current === fn) {
            selectItemOverrideRef.current = null;
          }
        };
      },
    );

    const selectItem = tapEffectEvent((item: Unstable_TriggerItem) => {
      if (!trigger || !behavior) return;

      if (selectItemOverrideRef.current?.(item)) {
        onSelected();
        return;
      }

      const currentText = aui.composer().getState().text;
      const before = currentText.slice(0, trigger.offset);
      const after = currentText.slice(
        trigger.offset + triggerChar.length + trigger.query.length,
      );

      const insertDirective = () => {
        const directive = behavior.formatter.serialize(item);
        aui
          .composer()
          .setText(
            before + directive + (after.startsWith(" ") ? after : ` ${after}`),
          );
      };

      if (behavior.kind === "directive") {
        insertDirective();
        behavior.onInserted?.(item);
      } else {
        if (behavior.removeOnExecute) {
          aui
            .composer()
            .setText(before + (after.startsWith(" ") ? after.slice(1) : after));
        } else {
          // Leave directive chip in the composer as an audit trail
          insertDirective();
        }
        behavior.onExecute(item);
      }

      onSelected();
    });

    const close = tapEffectEvent(() => {
      onSelected();
      // Move cursor before the trigger so trigger detection deactivates
      if (trigger) {
        setCursorPosition(trigger.offset);
      }
    });

    return {
      selectItem,
      close,
      registerSelectItemOverride,
    };
  },
);
