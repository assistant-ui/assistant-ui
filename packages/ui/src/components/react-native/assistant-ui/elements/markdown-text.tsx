import { Icon } from "@/components/ui/icon";
import type { TextMessagePartProps } from "@assistant-ui/react-native";
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
  MarkedTokenizer,
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

type ListToken = NonNullable<ReturnType<MarkedTokenizer["list"]>>;
type ListItemToken = ListToken["items"][number];

// react-native-marked renders a list item from its inline tokens and knows no
// checkbox token, so a task item gets its box folded into the text it owns.
// marked queues inline lexing by value when a token is created, so the folded
// text is queued again into a fresh array, which is the one the parser reads.
const foldTaskBox = (item: ListItemToken, lexer: MarkedTokenizer["lexer"]) => {
  const box = item.checked ? "☑" : "☐";
  const boxIndex = item.tokens.findIndex((token) => token.type === "checkbox");
  const target = item.tokens[boxIndex === -1 ? 0 : boxIndex + 1];
  if (!target || (target.type !== "text" && target.type !== "paragraph")) {
    return;
  }
  const text = `${box} ${target.text.replace(/^\[[ xX]\][ \t]+/, "")}`;
  target.text = text;
  target.raw = text;
  target.tokens = lexer.inline(text, []);
};

export class TaskListTokenizer extends MarkedTokenizer {
  override list(src: string) {
    const list = super.list(src);
    if (list) {
      for (const item of list.items) {
        if (item.task) foldTaskBox(item, this.lexer);
      }
    }
    return list;
  }
}

const taskListTokenizer = new TaskListTokenizer();

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

type MarkdownTextVariant = "muted";

const useMarkdownOptions = (
  variant?: MarkdownTextVariant,
): useMarkdownHookOptions => {
  const { theme } = useUniwind();
  const [foreground, primary, muted, mutedForeground, border] = useCSSVariable([
    "--color-foreground",
    "--color-primary",
    "--color-muted",
    "--color-muted-foreground",
    "--color-border",
  ]);

  return useMemo(() => {
    const text = asColor(variant === "muted" ? mutedForeground : foreground);
    const link = asColor(primary);
    const code = asColor(muted);
    const rule = asColor(border);
    const colors =
      text && link && code && rule
        ? { text, link, code, border: rule }
        : undefined;

    const bodyText =
      variant === "muted"
        ? { fontSize: 14, lineHeight: 24 }
        : { fontSize: 16, lineHeight: 26 };
    const styles: MarkedStyles = {
      text: bodyText,
      paragraph: { paddingVertical: 4 },
      li: bodyText,
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
      tokenizer: taskListTokenizer,
    };
    if (colors) options.theme = { colors };
    return options;
  }, [variant, theme, foreground, primary, muted, mutedForeground, border]);
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

type MarkdownTextProps = TextMessagePartProps & {
  variant?: MarkdownTextVariant;
};

const MarkdownTextImpl: FC<MarkdownTextProps> = ({ text, variant }) => {
  const throttledText = useThrottledValue(text, STREAM_INTERVAL_MS);
  const deferredText = useDeferredValue(throttledText);
  const options = useMarkdownOptions(variant);
  const blocks = useMemo(
    () =>
      MarkedLexer(deferredText, { gfm: true }).filter(
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
