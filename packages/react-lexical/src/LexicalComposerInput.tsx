"use client";

// Side-effect import: registers scope types (composer, thread, etc.) on ScopeRegistry
import "@assistant-ui/core/store";

import {
  type ComponentPropsWithoutRef,
  type FC,
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
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import { mergeRegister } from "@lexical/utils";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { INTERNAL } from "@assistant-ui/react";
import {
  DirectiveNode,
  DirectiveChipProvider,
  type DirectiveChipProps,
} from "./nodes/DirectiveNode";
import { SyncPlugin } from "./plugins/SyncPlugin";
import { DirectivePlugin } from "./plugins/DirectivePlugin";
import type { DirectivePluginProps } from "./plugins/DirectivePlugin";

export type LexicalComposerInputProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "autoFocus"
> & {
  /** Controls how Enter submits. @default "enter" */
  submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
  /** Whether Escape cancels editing. @default true */
  cancelOnEscape?: boolean | undefined;
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string | undefined;
  /** Focus the editor on mount. @default false */
  autoFocus?: boolean | undefined;
  /** Props forwarded to the DirectivePlugin. */
  directivePluginProps?: DirectivePluginProps | undefined;
  /** Custom component for rendering directive chips inline. */
  directiveChip?: FC<DirectiveChipProps> | undefined;
  /** Custom formatter for serializing/parsing directives. */
  formatter?: Unstable_DirectiveFormatter | undefined;
};

function KeyboardPlugin({
  submitMode,
  cancelOnEscape,
}: {
  submitMode: "enter" | "ctrlEnter" | "none";
  cancelOnEscape: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const pluginRegistry = INTERNAL.useComposerInputPluginRegistryOptional();

  useEffect(() => {
    const delegateToPlugins = (event: KeyboardEvent): boolean => {
      if (!pluginRegistry) return false;
      for (const plugin of pluginRegistry.getPlugins()) {
        if (plugin.handleKeyDown(event)) return true;
      }
      return false;
    };

    return mergeRegister(
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!event) return false;
          if (event.isComposing) return false;
          if (event.shiftKey) return false;

          // Let registered plugins (mention, slash command, etc.) handle Enter first
          if (delegateToPlugins(event)) return true;

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
          if (event && delegateToPlugins(event)) return true;

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

      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (event && delegateToPlugins(event)) return true;
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),

      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (event && delegateToPlugins(event)) return true;
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),

      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          if (event && delegateToPlugins(event)) return true;
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, submitMode, cancelOnEscape, aui, pluginRegistry]);

  return null;
}

function CursorPlugin() {
  const [editor] = useLexicalComposerContext();
  const pluginRegistry = INTERNAL.useComposerInputPluginRegistryOptional();

  useEffect(() => {
    if (!pluginRegistry) return undefined;

    let lastAnchorKey: string | null = null;
    let lastAnchorOffset = -1;

    const broadcastCursor = (pos: number) => {
      for (const plugin of pluginRegistry.getPlugins()) {
        plugin.setCursorPosition(pos);
      }
    };

    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          broadcastCursor(0);
          return;
        }

        const anchor = selection.anchor;
        if (anchor.type !== "text") {
          broadcastCursor(0);
          return;
        }

        const anchorNode = anchor.getNode();
        if (!$isTextNode(anchorNode)) {
          broadcastCursor(0);
          return;
        }

        // Skip expensive tree walk if selection hasn't moved
        if (anchor.key === lastAnchorKey && anchor.offset === lastAnchorOffset)
          return;
        lastAnchorKey = anchor.key;
        lastAnchorOffset = anchor.offset;

        let offset = 0;
        const paragraph = anchorNode.getParent();
        if (paragraph && $isElementNode(paragraph)) {
          const root = $getRoot();
          for (const child of root.getChildren()) {
            if (child === paragraph) break;
            if ($isElementNode(child)) {
              for (const c of child.getChildren()) {
                offset += c.getTextContent().length;
              }
            }
            offset += 1; // newline between paragraphs
          }
          for (const child of paragraph.getChildren()) {
            if (child === anchorNode) {
              offset += anchor.offset;
              break;
            }
            offset += child.getTextContent().length;
          }
        } else {
          offset = anchor.offset;
        }

        broadcastCursor(offset);
      });
    });
  }, [editor, pluginRegistry]);

  return null;
}

function FocusPlugin({ autoFocus }: { autoFocus: boolean }) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();

  useEffect(() => {
    if (autoFocus) editor.focus();
  }, [editor, autoFocus]);

  useEffect(() => {
    return aui.on("thread.runStart", () => {
      editor.focus();
    });
  }, [editor, aui]);

  return null;
}

/** Lexical-based composer input with inline directive chips and runtime sync. */
export const LexicalComposerInput = forwardRef<
  HTMLDivElement,
  LexicalComposerInputProps
>(
  (
    {
      submitMode = "enter",
      cancelOnEscape = true,
      placeholder,
      autoFocus = false,
      directivePluginProps,
      directiveChip,
      formatter: formatterProp,
      className,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = useAuiState(
      (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
    );
    const resolvedFormatter =
      formatterProp ?? unstable_defaultDirectiveFormatter;

    const initialConfig = useMemo(
      () => ({
        namespace: "aui-lexical-composer",
        nodes: [DirectiveNode],
        onError: (error: Error) => {
          console.error("[LexicalComposerInput]", error);
        },
      }),
      [],
    );

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <DirectiveChipProvider value={directiveChip ?? null}>
          <div
            ref={ref}
            className={
              className
                ? `aui-lexical-editor ${className}`
                : "aui-lexical-editor"
            }
            {...rest}
          >
            <PlainTextPlugin
              contentEditable={
                <ContentEditable className="aui-lexical-input" />
              }
              placeholder={
                placeholder ? (
                  <div className="aui-lexical-placeholder">{placeholder}</div>
                ) : null
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <SyncPlugin formatter={resolvedFormatter} />
            <DirectivePlugin {...directivePluginProps} />
            <KeyboardPlugin
              submitMode={submitMode}
              cancelOnEscape={cancelOnEscape}
            />
            <CursorPlugin />
            <FocusPlugin autoFocus={autoFocus} />
            <EditablePlugin isDisabled={!!isDisabled} />
          </div>
        </DirectiveChipProvider>
      </LexicalComposer>
    );
  },
);

LexicalComposerInput.displayName = "LexicalComposerInput";

function EditablePlugin({ isDisabled }: { isDisabled: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(!isDisabled);
  }, [editor, isDisabled]);
  return null;
}
