"use client";

import {
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode,
  forwardRef,
  useEffect,
} from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HistoryExtension } from "@lexical/history";
import { PlainTextExtension } from "@lexical/plain-text";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  configExtension,
  defineExtension,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
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
import { $getCollapsedRuntimeOffset } from "./runtimeOffset";

const composerExtension = defineExtension({
  name: "@assistant-ui/react-lexical",
  namespace: "aui-lexical-composer",
  nodes: [DirectiveNode],
  dependencies: [
    PlainTextExtension,
    configExtension(HistoryExtension, { delay: 1000 }),
  ],
  onError: (error) => {
    console.error("[LexicalComposerInput]", error);
  },
});

export type LexicalComposerInputProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "autoFocus" | "children"
> & {
  /** Controls how Enter submits. @default "enter" */
  submitMode?: "enter" | "ctrlEnter" | "none" | undefined;
  /** Whether Escape cancels editing. @default true */
  cancelOnEscape?: boolean | undefined;
  /** Placeholder text shown when the editor is empty; it also names the textbox when neither `aria-label` nor `aria-labelledby` is given. */
  placeholder?: string | undefined;
  /** Focus the editor on mount. @default false */
  autoFocus?: boolean | undefined;
  /** Props forwarded to the DirectivePlugin. */
  directivePluginProps?: DirectivePluginProps | undefined;
  /** Custom component for rendering directive chips inline. */
  directiveChip?: FC<DirectiveChipProps> | undefined;
  /** Custom formatter for serializing/parsing directives. */
  formatter?: Unstable_DirectiveFormatter | undefined;
  /** Custom Lexical plugins rendered inside the composer context, after the built-in plugins. */
  children?: ReactNode | undefined;
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
          if (event.isComposing || event.keyCode === 229) return false;
          if (event.shiftKey) return false;

          // Let registered plugins (mention, slash command, etc.) handle Enter first
          if (delegateToPlugins(event)) return true;

          if (submitMode === "none") return false;

          const threadState = aui.thread.getState();
          if (
            threadState.isRunning &&
            !threadState.capabilities.queue &&
            threadState.voice === undefined
          )
            return false;

          let shouldSubmit = false;
          if (submitMode === "ctrlEnter") {
            shouldSubmit = event.ctrlKey || event.metaKey;
          } else if (submitMode === "enter") {
            shouldSubmit = !event.ctrlKey && !event.metaKey;
          }

          if (shouldSubmit) {
            event.preventDefault();
            aui.composer.send();
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
          const composer = aui.composer;
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

      editor.registerCommand(
        KEY_TAB_COMMAND,
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

    return editor.registerUpdateListener((update) => {
      const { editorState, dirtyElements, dirtyLeaves } = update;
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) lastAnchorKey = null;
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          lastAnchorKey = null;
          broadcastCursor(0);
          return;
        }

        const anchor = selection.anchor;
        if (anchor.key === lastAnchorKey && anchor.offset === lastAnchorOffset)
          return;
        lastAnchorKey = anchor.key;
        lastAnchorOffset = anchor.offset;

        broadcastCursor($getCollapsedRuntimeOffset() ?? 0);
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
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      "aria-describedby": ariaDescribedBy,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = useAuiState(
      (s) => s.thread.isDisabled || s.composer.dictation?.inputDisabled,
    );
    const resolvedFormatter =
      formatterProp ?? unstable_defaultDirectiveFormatter;

    // Decorator portals render from the composer's own React extension, above its children, so the chip context has to wrap the composer.
    return (
      <DirectiveChipProvider value={directiveChip ?? null}>
        <LexicalExtensionComposer
          extension={composerExtension}
          contentEditable={null}
        >
          <div
            ref={ref}
            className={
              className
                ? `aui-lexical-editor ${className}`
                : "aui-lexical-editor"
            }
            {...rest}
            style={{ overflowY: "auto", ...rest.style }}
          >
            <ContentEditable
              className="aui-lexical-input"
              aria-label={
                ariaLabel ?? (ariaLabelledBy ? undefined : placeholder)
              }
              aria-labelledby={ariaLabelledBy}
              aria-describedby={ariaDescribedBy}
              {...(placeholder
                ? {
                    placeholder: (
                      <div className="aui-lexical-placeholder">
                        {placeholder}
                      </div>
                    ),
                    "aria-placeholder": placeholder,
                  }
                : {})}
            />
            <SyncPlugin formatter={resolvedFormatter} />
            <DirectivePlugin {...directivePluginProps} />
            <KeyboardPlugin
              submitMode={submitMode}
              cancelOnEscape={cancelOnEscape}
            />
            <CursorPlugin />
            <FocusPlugin autoFocus={autoFocus} />
            <EditablePlugin isDisabled={!!isDisabled} />
            {children}
          </div>
        </LexicalExtensionComposer>
      </DirectiveChipProvider>
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
