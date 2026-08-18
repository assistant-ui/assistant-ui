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
  SKIP_DOM_SELECTION_TAG,
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
  | readonly ["mention", string, string, string];

type PreservedDirective = Pick<
  Unstable_TriggerItem,
  "description" | "metadata"
> & {
  readonly label?: string;
};

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

const directiveKey = (id: string, type: string) => `${type}\0${id}`;

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
    const segments: SegmentKey[] = [];
    for (const { segment } of parse(line)) {
      if (segment.kind === "text") {
        appendTextSegment(segments, segment.text);
      } else {
        segments.push(["mention", segment.id, segment.type, segment.label]);
      }
    }
    return segments;
  });
}

function countParsedMentions(runtimeText: string, parse: CompositeParser) {
  return getParsedLines(runtimeText, parse).reduce(
    (count, line) =>
      count + line.filter((segment) => segment[0] === "mention").length,
    0,
  );
}

function getEditorLines(editor: LexicalEditor): SegmentKey[][] | undefined {
  return editor.getEditorState().read(() => {
    const lines: SegmentKey[][] = [];
    for (const paragraph of $getRoot().getChildren()) {
      if (!$isElementNode(paragraph)) return undefined;
      let segments: SegmentKey[] = [];
      for (const child of paragraph.getChildren()) {
        if ($isLineBreakNode(child)) {
          lines.push(segments);
          segments = [];
        } else if ($isTextNode(child)) {
          appendTextSegment(segments, child.getTextContent());
        } else if ($isDirectiveNode(child)) {
          const item = child.getDirectiveItem();
          segments.push(["mention", item.id, item.type, item.label]);
        } else {
          return undefined;
        }
      }
      lines.push(segments);
    }
    return lines;
  });
}

function countEditorDirectives(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    let count = 0;
    for (const paragraph of $getRoot().getChildren()) {
      if (!$isElementNode(paragraph)) continue;
      for (const child of paragraph.getChildren()) {
        if ($isDirectiveNode(child)) count += 1;
      }
    }
    return count;
  });
}

function editorMatchesParser(
  editor: LexicalEditor,
  runtimeText: string,
  parse: CompositeParser,
) {
  const editorLines = getEditorLines(editor);
  if (editorLines === undefined) return false;
  return (
    JSON.stringify(editorLines) ===
    JSON.stringify(getParsedLines(runtimeText, parse))
  );
}

function shouldRebuildForParser(
  editor: LexicalEditor,
  runtimeText: string,
  parse: CompositeParser,
) {
  if (editorMatchesParser(editor, runtimeText, parse)) return false;
  if (
    countEditorDirectives(editor) > 0 &&
    countParsedMentions(runtimeText, parse) === 0
  ) {
    return false;
  }
  return true;
}

function parsedLabelQueues(runtimeText: string, parse: CompositeParser) {
  const queues = new Map<string, string[]>();
  for (const line of runtimeText.split("\n")) {
    for (const { segment } of parse(line)) {
      if (segment.kind !== "mention") continue;
      const key = directiveKey(segment.id, segment.type);
      const labels = queues.get(key) ?? [];
      labels.push(segment.label);
      queues.set(key, labels);
    }
  }
  return queues;
}

function collectPreservedDirectives(
  runtimeText: string,
  previousParse: CompositeParser,
  nextParse: CompositeParser,
) {
  const previousLabels = parsedLabelQueues(runtimeText, previousParse);
  const nextLabels = parsedLabelQueues(runtimeText, nextParse);
  const preserved = new Map<string, PreservedDirective[]>();
  for (const paragraph of $getRoot().getChildren()) {
    if (!$isElementNode(paragraph)) continue;
    for (const child of paragraph.getChildren()) {
      if (!$isDirectiveNode(child)) continue;
      const item = child.getDirectiveItem();
      const key = directiveKey(item.id, item.type);
      const previousLabel = previousLabels.get(key)?.shift();
      const nextLabel = nextLabels.get(key)?.shift();
      const items = preserved.get(key) ?? [];
      items.push({
        description: item.description,
        metadata: item.metadata,
        ...(previousLabel !== undefined && previousLabel === nextLabel
          ? { label: item.label }
          : {}),
      });
      preserved.set(key, items);
    }
  }
  return preserved;
}

function syncRuntimeToLexical(
  editor: LexicalEditor,
  runtimeText: string,
  parse: CompositeParser,
  previousParser: CompositeParser | undefined,
  onComplete: () => void,
) {
  const parserOnly = previousParser !== undefined;
  editor.update(
    () => {
      const root = $getRoot();
      const preserved = parserOnly
        ? collectPreservedDirectives(runtimeText, previousParser, parse)
        : undefined;
      root.clear();

      if (runtimeText.length === 0) {
        root.append($createParagraphNode());
        if (!parserOnly) root.selectEnd();
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
            const extra = preserved
              ?.get(directiveKey(segment.id, segment.type))
              ?.shift();
            paragraph.append(
              $createDirectiveNodeWithFormatter(
                {
                  id: segment.id,
                  type: segment.type,
                  label: extra?.label ?? segment.label,
                  ...(extra?.description !== undefined
                    ? { description: extra.description }
                    : {}),
                  ...(extra?.metadata !== undefined
                    ? { metadata: extra.metadata }
                    : {}),
                },
                formatter,
              ),
            );
          }
        }

        root.append(paragraph);
      }

      if (!parserOnly) root.selectEnd();
    },
    {
      onUpdate: onComplete,
      tag: parserOnly ? [SYNC_TAG, SKIP_DOM_SELECTION_TAG] : SYNC_TAG,
    },
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

  const propParse = propFormatter?.parse;
  const propSerialize = propFormatter?.serialize;
  const formatters = useMemo(
    () =>
      collectFormatters(
        triggers,
        propParse && propSerialize
          ? { parse: propParse, serialize: propSerialize }
          : undefined,
      ),
    [triggers, propParse, propSerialize],
  );

  const parser = useMemo(() => composeParsers(formatters), [formatters]);

  const isSyncingFromLexicalRef = useRef(false);
  const isSyncingFromRuntimeRef = useRef(false);
  const textDirtySinceSyncRef = useRef(false);
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
            textDirtySinceSyncRef.current = true;
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

    const applyRuntimeText = (
      runtimeText: string,
      previousParser: CompositeParser | undefined,
    ) => {
      isSyncingFromRuntimeRef.current = true;
      lastSyncedTextRef.current = runtimeText;
      lastAppliedParserRef.current = parser;
      textDirtySinceSyncRef.current = false;
      syncRuntimeToLexical(editor, runtimeText, parser, previousParser, () => {
        isSyncingFromRuntimeRef.current = false;
      });
    };

    const initialText = composerRuntime.getState().text;
    const runtimeTextChanged = initialText !== lastSyncedTextRef.current;
    const parserChanged = parser !== lastAppliedParserRef.current;

    if (runtimeTextChanged) {
      applyRuntimeText(initialText, undefined);
    } else if (parserChanged) {
      const previousParser = lastAppliedParserRef.current;
      lastAppliedParserRef.current = parser;
      if (
        !textDirtySinceSyncRef.current &&
        !editor.isComposing() &&
        shouldRebuildForParser(editor, initialText, parser)
      ) {
        applyRuntimeText(initialText, previousParser);
      }
    }

    return composerRuntime.subscribe(() => {
      if (isSyncingFromLexicalRef.current) return;

      const runtimeText = composerRuntime.getState().text;

      if (runtimeText === lastSyncedTextRef.current) return;

      applyRuntimeText(runtimeText, undefined);
    });
  }, [editor, aui, parser]);

  return null;
}
