import { Icon } from "@/components/ui/icon";
import type { TextMessagePartComponent } from "@assistant-ui/react-native";
import * as Clipboard from "expo-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react-native";
import {
  type FC,
  memo,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import {
  MarkedLexer,
  type MarkedStyles,
  Renderer,
  useMarkdown,
  type useMarkdownHookOptions,
} from "react-native-marked";
import { useCSSVariable, useUniwind } from "uniwind";

const STREAM_INTERVAL_MS = 50;
const MONOSPACE = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

type MarkdownToken = ReturnType<typeof MarkedLexer>[number];
type ListToken = Extract<MarkdownToken, { type: "list"; items: unknown }>;

const isList = (token: MarkdownToken): token is ListToken =>
  token.type === "list" && "items" in token;

const TASK_MARKER = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+)\[([ xX])\](?=[ \t])/;

const glyph = (line: string) =>
  line.replace(
    TASK_MARKER,
    (_match, prefix: string, marker: string) =>
      `${prefix}${marker === " " ? "☐" : "☑"}`,
  );

type Walk = { raw: string; at: number };

const advancePast = (host: string, from: number, raw: string) => {
  let at = from;
  for (const line of raw.split("\n")) {
    const key = line.trim();
    if (!key) continue;
    const found = host.indexOf(key, at);
    if (found === -1) break;
    at = found + key.length;
  }
  return at;
};

// The lexer dedents nested items and drops quote markers, so each task item's
// first line is located in the host by content, always forward of everything
// walked before it, so a code sample can never stand in for a later item.
const rewriteWithin = (
  tokens: readonly MarkdownToken[],
  host: string,
  from: number,
): Walk => {
  let raw = host;
  let at = from;
  for (const token of tokens) {
    if (isList(token)) {
      for (const item of token.items) {
        const first = (item.raw.split("\n")[0] ?? "").trim();
        const found = raw.indexOf(first, at);
        if (found !== -1) {
          const line = item.task ? glyph(first) : first;
          raw = raw.slice(0, found) + line + raw.slice(found + first.length);
          at = found + line.length;
        }
        ({ raw, at } = rewriteWithin(item.tokens, raw, at));
      }
    } else if (token.type === "blockquote" && token.tokens) {
      ({ raw, at } = rewriteWithin(token.tokens, raw, at));
    } else {
      at = advancePast(raw, at, token.raw);
    }
  }
  return { raw, at };
};

// Only list and block quote tokens are rewritten, and the element lexes each
// message once.
const lexTaskAwareBlocks = (text: string): MarkdownToken[] =>
  MarkedLexer(text, { gfm: true }).map((token) =>
    isList(token) || token.type === "blockquote"
      ? { ...token, raw: rewriteWithin([token], token.raw, 0).raw }
      : token,
  );

export const rewriteMarkdownTaskListMarkers = (text: string): string =>
  lexTaskAwareBlocks(text)
    .map((token) => token.raw)
    .join("");

const useThrottledValue = <T,>(value: T, intervalMs: number): T => {
  const [throttled, setThrottled] = useState(value);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    const delay = Math.max(0, intervalMs - (Date.now() - lastEmitRef.current));
    const timer = setTimeout(() => {
      lastEmitRef.current = Date.now();
      setThrottled(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, intervalMs]);

  return throttled;
};

const CodeBlock: FC<{ code: string; language: string | undefined }> = ({
  code,
  language,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      return;
    }
    setIsCopied(true);
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <View className="aui-md-code-block border-border bg-muted/50 my-2 overflow-hidden rounded-xl border">
      <View className="aui-md-code-header border-border/50 flex-row items-center justify-between border-b py-1 pr-1 pl-3.5">
        <Text className="text-muted-foreground text-xs font-medium lowercase">
          {language || "text"}
        </Text>
        <Pressable
          onPress={copy}
          className="active:bg-muted size-7 items-center justify-center rounded-md"
          accessibilityRole="button"
          accessibilityLabel="Copy code"
        >
          <Icon
            as={isCopied ? CheckIcon : CopyIcon}
            className="text-muted-foreground size-4"
          />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-3.5 py-3"
      >
        <Text
          selectable
          className="text-foreground text-[13px] leading-5"
          style={{ fontFamily: MONOSPACE }}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
};

// One renderer per parse: the constructor takes the text it renders so the
// memo that creates it stays keyed on that text under React Compiler, and the
// key ordinal restarts with each instance.
class MarkdownRenderer extends Renderer {
  keyIndex = 0;

  constructor(_source: string) {
    super();
  }

  override getKey(): string {
    return `md-${this.keyIndex++}`;
  }

  override code(text: string, language?: string): ReactNode {
    return <CodeBlock key={this.getKey()} code={text} language={language} />;
  }
}

const asColor = (value: string | number | undefined) =>
  typeof value === "string" ? value : undefined;

const useMarkdownOptions = (): useMarkdownHookOptions => {
  const { theme } = useUniwind();
  const [foreground, primary, muted, border] = useCSSVariable([
    "--color-foreground",
    "--color-primary",
    "--color-muted",
    "--color-border",
  ]);

  return useMemo(() => {
    const text = asColor(foreground);
    const link = asColor(primary);
    const code = asColor(muted);
    const rule = asColor(border);
    const colors =
      text && link && code && rule
        ? { text, link, code, border: rule }
        : undefined;

    const styles: MarkedStyles = {
      text: { fontSize: 16, lineHeight: 26 },
      paragraph: { paddingVertical: 4 },
      li: { fontSize: 16, lineHeight: 26 },
      list: { paddingVertical: 4 },
      link: { fontStyle: "normal", textDecorationLine: "underline" },
      codespan: {
        fontFamily: MONOSPACE,
        fontSize: 14,
        borderRadius: 4,
        paddingHorizontal: 4,
      },
      blockquote: {
        borderLeftWidth: 2,
        paddingLeft: 12,
        marginVertical: 4,
        opacity: 1,
      },
      hr: { height: 1, marginVertical: 12, borderWidth: 0 },
      h1: {
        fontSize: 24,
        lineHeight: 32,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 4,
        paddingBottom: 0,
        borderBottomWidth: 0,
      },
      h2: {
        fontSize: 20,
        lineHeight: 28,
        fontWeight: "600",
        marginTop: 14,
        marginBottom: 4,
        paddingBottom: 0,
        borderBottomWidth: 0,
      },
      h3: { fontSize: 18, lineHeight: 26, fontWeight: "600", marginTop: 12 },
      h4: { fontSize: 16, lineHeight: 26, fontWeight: "600", marginTop: 10 },
      h5: { fontSize: 16, lineHeight: 26, fontWeight: "600", marginTop: 8 },
      h6: { fontSize: 16, lineHeight: 26, fontWeight: "600", marginTop: 8 },
      tableCell: { paddingHorizontal: 8, paddingVertical: 6 },
    };
    const options: useMarkdownHookOptions = {
      colorScheme: theme === "dark" ? "dark" : "light",
      styles,
    };
    if (colors) options.theme = { colors };
    return options;
  }, [theme, foreground, primary, muted, border]);
};

// Each top-level block is re-lexed on its own, so a streaming update re-renders
// only the block it touched; reference-style link definitions therefore do not
// resolve across blocks.
const MarkdownBlock = memo(
  ({ raw, options }: { raw: string; options: useMarkdownHookOptions }) => {
    // A fresh renderer per parse keeps keys unique among siblings and identical
    // across the re-parses of a streaming block instead of remounting it.
    const renderer = useMemo(() => new MarkdownRenderer(raw), [raw]);
    const blockOptions = useMemo(
      () => ({ ...options, renderer }),
      [options, renderer],
    );
    const elements = useMarkdown(raw, blockOptions);
    return <>{elements}</>;
  },
);
MarkdownBlock.displayName = "MarkdownBlock";

const MarkdownTextImpl: TextMessagePartComponent = ({ text }) => {
  const throttledText = useThrottledValue(text, STREAM_INTERVAL_MS);
  const deferredText = useDeferredValue(throttledText);
  const options = useMarkdownOptions();
  const blocks = useMemo(
    () =>
      lexTaskAwareBlocks(deferredText).filter(
        (token) => token.type !== "space",
      ),
    [deferredText],
  );

  return (
    <View className="aui-md-root">
      {blocks.map((token, index) => (
        <MarkdownBlock key={index} raw={token.raw} options={options} />
      ))}
    </View>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
