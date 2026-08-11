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
  $isLineBreakNode,
  $isTextNode,
  type LexicalEditor,
} from "lexical";
import { useAui } from "@assistant-ui/store";
import type {
  Unstable_DirectiveFormatter,
  Unstable_DirectiveSegment,
  Unstable_TriggerItem,
} from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import {
  unstable_useTriggerPopoverRootContextOptional,
  type Unstable_RegisteredTrigger,
} from "@assistant-ui/react";
import {
  $createDirectiveNodeWithFormatter,
  $isDirectiveNode,
} from "../nodes/DirectiveNode";

type ParsedSegment = {
  readonly segment: Unstable_DirectiveSegment;
  readonly formatter: Unstable_DirectiveFormatter;
};

type CompositeParser = (text: string) => readonly ParsedSegment[];

type SegmentKey =
  | readonly ["text", string]
  | readonly ["mention", string, string, string, string];

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

function appendTextSegment(segments: SegmentKey[], text: string) {
  if (text.length === 0) return;
  const previous = segments.at(-1);
  if (previous?.[0] === "text") {
    segments[segments.length - 1] = ["text", previous[1] + text];
  } else {
    segments.push(["text", text]);
  }
}

function getParsedLines(
  runtimeText: string,
  parse: CompositeParser,
): SegmentKey[][] {
  return runtimeText.split("\n").map((line) => {
    const result: SegmentKey[] = [];
    for (const { segment, formatter } of parse(line)) {
      if (segment.kind === "text") {
        appendTextSegment(result, segment.text);
      } else {
        result.push([
          "mention",
          segment.id,
          segment.type,
          segment.label,
          formatter.serialize(segment),
        ]);
      }
    }
    return result;
  });
}

function getDirectiveKey(item: Unstable_TriggerItem, directiveText: string) {
  return JSON.stringify([item.id, item.type, directiveText]);
}

function editorMatchesParsedText(
  editor: LexicalEditor,
  runtimeText: string,
  parse: CompositeParser,
) {
  const parsedLines = getParsedLines(runtimeText, parse);
  return editor.getEditorState().read(() => {
    const paragraphs = $getRoot().getChildren();
    const lexicalLines: SegmentKey[][] = [];
    for (const paragraph of paragraphs) {
      if (!$isElementNode(paragraph)) return false;
      let segments: SegmentKey[] = [];
      for (const child of paragraph.getChildren()) {
        if ($isLineBreakNode(child)) {
          lexicalLines.push(segments);
          segments = [];
        } else if ($isTextNode(child)) {
          appendTextSegment(segments, child.getTextContent());
        } else if ($isDirectiveNode(child)) {
          const item = child.getDirectiveItem();
          segments.push([
            "mention",
            item.id,
            item.type,
            item.label,
            child.getDirectiveText(),
          ]);
        } else {
          return false;
        }
      }
      lexicalLines.push(segments);
    }
    if (lexicalLines.length !== parsedLines.length) return false;
    return JSON.stringify(lexicalLines) === JSON.stringify(parsedLines);
  });
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
      const preservedDirectiveItems = new Map<
        string,
        Pick<Unstable_TriggerItem, "description" | "metadata">[]
      >();
      for (const paragraph of root.getChildren()) {
        if (!$isElementNode(paragraph)) continue;
        for (const child of paragraph.getChildren()) {
          if (!$isDirectiveNode(child)) continue;
          const item = child.getDirectiveItem();
          const key = getDirectiveKey(item, child.getDirectiveText());
          const items = preservedDirectiveItems.get(key) ?? [];
          items.push({
            description: item.description,
            metadata: item.metadata,
          });
          preservedDirectiveItems.set(key, items);
        }
      }
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
            const item = {
              id: segment.id,
              type: segment.type,
              label: segment.label,
            };
            const key = getDirectiveKey(item, formatter.serialize(segment));
            const preservedItem = preservedDirectiveItems.get(key)?.shift();
            paragraph.append(
              $createDirectiveNodeWithFormatter(
                preservedItem ? { ...item, ...preservedItem } : item,
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

  const isSyncingFromLexicalRef = useRef(false);
  const isSyncingFromRuntimeRef = useRef(false);
  const lastSyncedTextRef = useRef("");
  const lastAppliedParserRef = useRef(parser);

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

          const composer = aui.composer;

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
    const composerRuntime = aui.composer.__internal_getRuntime?.();
    if (!composerRuntime) return;

    const initialText = composerRuntime.getState().text;
    const parserChanged = parser !== lastAppliedParserRef.current;
    lastAppliedParserRef.current = parser;
    const runtimeTextChanged = initialText !== lastSyncedTextRef.current;
    const parserRequiresResync =
      parserChanged && !editorMatchesParsedText(editor, initialText, parser);
    if (runtimeTextChanged || parserRequiresResync) {
      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = initialText;
      syncRuntimeToLexical(editor, initialText, parser, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    }

    return composerRuntime.subscribe(() => {
      if (isSyncingFromLexicalRef.current) return;

      const runtimeText = composerRuntime.getState().text;

      if (runtimeText === lastSyncedTextRef.current) return;

      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = runtimeText;
      syncRuntimeToLexical(editor, runtimeText, parser, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    });
  }, [editor, aui, parser]);

  return null;
}
