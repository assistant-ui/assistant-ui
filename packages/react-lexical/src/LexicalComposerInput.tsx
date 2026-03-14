"use client";

// Side-effect import: registers scope types (composer, thread, etc.) on ScopeRegistry
import "@assistant-ui/core/store";

import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useMemo,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { useAui, useAuiState } from "@assistant-ui/store";
import { MentionNode } from "./nodes/MentionNode";
import { SyncPlugin } from "./plugins/SyncPlugin";
import {
  MentionPlugin,
  type MentionPluginProps,
} from "./plugins/MentionPlugin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LexicalComposerInputProps = ComponentPropsWithoutRef<"div"> & {
  /** Controls how Enter submits. @default "enter" */
  submitMode?: "enter" | "ctrlEnter" | "none";
  /** Whether Escape cancels editing. @default true */
  cancelOnEscape?: boolean;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
  /** Props forwarded to the MentionPlugin. */
  mentionPluginProps?: MentionPluginProps;
};

// ---------------------------------------------------------------------------
// Internal: keyboard handler plugin
// ---------------------------------------------------------------------------

function KeyboardPlugin({
  submitMode,
  cancelOnEscape,
}: {
  submitMode: "enter" | "ctrlEnter" | "none";
  cancelOnEscape: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event) return false;

          // Ignore IME composition
          if (event.isComposing) return false;
          // Always allow Shift+Enter for newlines
          if (event.shiftKey) return false;

          if (submitMode === "none") return false;

          const isRunning = aui.thread().getState().isRunning;
          if (isRunning) return false;

          let shouldSubmit = false;
          if (submitMode === "ctrlEnter") {
            shouldSubmit = event.ctrlKey || event.metaKey;
          } else if (submitMode === "enter") {
            shouldSubmit = !event.ctrlKey && !event.metaKey;
          }

          if (shouldSubmit) {
            event.preventDefault();
            aui.composer().send();
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),

      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event) => {
          if (!cancelOnEscape) return false;
          const composer = aui.composer();
          if (composer.getState().canCancel) {
            composer.cancel();
            event?.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, submitMode, cancelOnEscape, aui]);

  return null;
}

// ---------------------------------------------------------------------------
// Internal: focus management plugin
// ---------------------------------------------------------------------------

function FocusPlugin() {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();

  useEffect(() => {
    return aui.on("thread.runStart", () => {
      editor.focus();
    });
  }, [editor, aui]);

  return null;
}

// ---------------------------------------------------------------------------
// LexicalComposerInput
// ---------------------------------------------------------------------------

/**
 * A Lexical-based rich text input for the assistant-ui composer.
 *
 * Supports inline mention chips via `MentionNode` and bidirectional sync
 * with the assistant-ui `ComposerRuntime`.
 *
 * Drop-in replacement for `ComposerPrimitive.Input` when you need rich
 * text features like @-mentions.
 */
export const LexicalComposerInput = forwardRef<
  HTMLDivElement,
  LexicalComposerInputProps
>(
  (
    {
      submitMode = "enter",
      cancelOnEscape = true,
      placeholder,
      mentionPluginProps,
      className,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = useAuiState(
      (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
    );

    const initialConfig = useMemo(
      () => ({
        namespace: "aui-lexical-composer",
        nodes: [MentionNode],
        onError: (error: Error) => {
          console.error("[LexicalComposerInput]", error);
        },
      }),
      [],
    );

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div
          ref={ref}
          className={
            className ? `aui-lexical-editor ${className}` : "aui-lexical-editor"
          }
          {...rest}
        >
          <PlainTextPlugin
            contentEditable={<ContentEditable className="aui-lexical-input" />}
            placeholder={
              placeholder ? (
                <div className="aui-lexical-placeholder">{placeholder}</div>
              ) : null
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <SyncPlugin />
          <MentionPlugin {...mentionPluginProps} />
          <KeyboardPlugin
            submitMode={submitMode}
            cancelOnEscape={cancelOnEscape}
          />
          <FocusPlugin />
          <EditablePlugin isDisabled={!!isDisabled} />
        </div>
      </LexicalComposer>
    );
  },
);

LexicalComposerInput.displayName = "LexicalComposerInput";

// ---------------------------------------------------------------------------
// Internal: keep editable in sync with disabled state
// ---------------------------------------------------------------------------

function EditablePlugin({ isDisabled }: { isDisabled: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(!isDisabled);
  }, [editor, isDisabled]);
  return null;
}
