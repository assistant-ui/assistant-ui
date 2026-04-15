"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createTextNode,
  $createParagraphNode,
  $isElementNode,
  type LexicalEditor,
} from "lexical";
import { useAui } from "@assistant-ui/store";
import type {
  Unstable_DirectiveFormatter,
  Unstable_DirectiveSegment,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import {
  unstable_useTriggerPopoverRootContextOptional,
  type Unstable_RegisteredTrigger,
} from "@assistant-ui/react";
import { $createDirectiveNodeWithFormatter } from "../nodes/DirectiveNode";

type ParsedSegment = {
  readonly segment: Unstable_DirectiveSegment;
  readonly formatter: Unstable_DirectiveFormatter;
};

type CompositeParser = (text: string) => readonly ParsedSegment[];

/** Ordered, identity-deduped: prop formatter, trigger formatters, default tail. */
export function collectFormatters(
  triggers: ReadonlyMap<string, Unstable_RegisteredTrigger>,
  propFormatter: Unstable_DirectiveFormatter | undefined,
): readonly Unstable_DirectiveFormatter[] {
  const ordered: Unstable_DirectiveFormatter[] = [];
  const seen = new Set<Unstable_DirectiveFormatter>();
  const push = (f: Unstable_DirectiveFormatter | undefined) => {
    if (!f || seen.has(f)) return;
    seen.add(f);
    ordered.push(f);
  };
  push(propFormatter);
  for (const trigger of triggers.values()) push(trigger.behavior?.formatter);
  push(unstable_defaultDirectiveFormatter);
  return ordered;
}

/** First formatter whose parse yields a mention wins; else first formatter's plain-text. */
export function composeParsers(
  formatters: readonly Unstable_DirectiveFormatter[],
): CompositeParser {
  const ordered = formatters.length
    ? formatters
    : [unstable_defaultDirectiveFormatter];
  return (text: string) => {
    let fallback: readonly ParsedSegment[] | null = null;
    for (const formatter of ordered) {
      const segments = formatter.parse(text);
      if (segments.some((s) => s.kind === "mention")) {
        return segments.map((segment) => ({ segment, formatter }));
      }
      if (!fallback) {
        fallback = segments.map((segment) => ({ segment, formatter }));
      }
    }
    return fallback!;
  };
}

function syncRuntimeToLexical(
  editor: LexicalEditor,
  runtimeText: string,
  parse: CompositeParser,
  onComplete: () => void,
) {
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();

      if (runtimeText.length === 0) {
        root.append($createParagraphNode());
        root.selectEnd();
        return;
      }

      const lines = runtimeText.split("\n");
      for (const line of lines) {
        const paragraph = $createParagraphNode();
        const segments = parse(line);

        for (const { segment, formatter } of segments) {
          if (segment.kind === "text") {
            if (segment.text.length > 0) {
              paragraph.append($createTextNode(segment.text));
            }
          } else {
            paragraph.append(
              $createDirectiveNodeWithFormatter(
                {
                  id: segment.id,
                  type: segment.type,
                  label: segment.label,
                },
                formatter,
              ),
            );
          }
        }

        root.append(paragraph);
      }

      root.selectEnd();
    },
    { onUpdate: onComplete, tag: SYNC_TAG },
  );
}

const SYNC_TAG = "aui-sync";

const EMPTY_TRIGGERS: ReadonlyMap<string, Unstable_RegisteredTrigger> =
  new Map();
const noopSubscribe = () => () => {};

/** Bidirectional sync between Lexical and ComposerRuntime with composite directive parsing. */
export function SyncPlugin({
  formatter: propFormatter,
}: {
  formatter?: Unstable_DirectiveFormatter | undefined;
} = {}) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const root = unstable_useTriggerPopoverRootContextOptional();

  const subscribe = useCallback(
    (listener: () => void) =>
      root ? root.subscribe(listener) : noopSubscribe(),
    [root],
  );
  const getSnapshot = useCallback(
    () => (root ? root.getTriggers() : EMPTY_TRIGGERS),
    [root],
  );

  const triggers = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const formatters = useMemo(
    () => collectFormatters(triggers, propFormatter),
    [triggers, propFormatter],
  );

  const parser = useMemo(() => composeParsers(formatters), [formatters]);
  const parserRef = useRef<CompositeParser>(parser);
  parserRef.current = parser;

  const isSyncingFromLexicalRef = useRef(false);
  const isSyncingFromRuntimeRef = useRef(false);
  const lastSyncedTextRef = useRef("");

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (isSyncingFromRuntimeRef.current) return;
      if (tags.has(SYNC_TAG)) return;

      editorState.read(() => {
        isSyncingFromLexicalRef.current = true;

        try {
          const rootNode = $getRoot();
          let fullText = "";

          for (const paragraph of rootNode.getChildren()) {
            if (fullText.length > 0) {
              fullText += "\n";
            }
            if (!$isElementNode(paragraph)) continue;
            for (const child of paragraph.getChildren()) {
              fullText += child.getTextContent();
            }
          }

          const composer = aui.composer();

          if (fullText !== lastSyncedTextRef.current) {
            lastSyncedTextRef.current = fullText;
            composer.setText(fullText);
          }
        } finally {
          isSyncingFromLexicalRef.current = false;
        }
      });
    });
  }, [editor, aui]);

  useEffect(() => {
    const composerRuntime = aui.composer().__internal_getRuntime?.();
    if (!composerRuntime) return;

    const initialText = composerRuntime.getState().text;
    if (initialText && initialText !== lastSyncedTextRef.current) {
      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = initialText;
      syncRuntimeToLexical(editor, initialText, parserRef.current, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    }

    return composerRuntime.subscribe(() => {
      if (isSyncingFromLexicalRef.current) return;

      const runtimeText = composerRuntime.getState().text;

      if (runtimeText === lastSyncedTextRef.current) return;

      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = runtimeText;
      syncRuntimeToLexical(editor, runtimeText, parserRef.current, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    });
  }, [editor, aui]);

  return null;
}
