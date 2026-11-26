import { useState, type ReactNode } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type TextStyle,
} from "react-native";
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  type MessageState,
  type ToolCallMessagePart,
} from "@assistant-ui/react-native";

/**
 * A full-screen chat for React Native, built from the assistant-ui native
 * primitives and styled with StyleSheet, so it needs nothing beyond
 * react-native and @assistant-ui/react-native. It follows the system color
 * scheme.
 */

type Palette = {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
};

const LIGHT: Palette = {
  background: "#ffffff",
  surface: "#f4f4f5",
  border: "#e4e4e7",
  text: "#18181b",
  muted: "#71717a",
  accent: "#18181b",
  accentText: "#ffffff",
};

const DARK: Palette = {
  background: "#09090b",
  surface: "#1c1c1f",
  border: "#27272a",
  text: "#fafafa",
  muted: "#a1a1aa",
  accent: "#fafafa",
  accentText: "#09090b",
};

const MONO = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "ui-monospace, SFMono-Regular, Menlo, monospace",
});

const SUGGESTIONS = [
  "What's the weather in Tokyo?",
  "Write a debounce function",
  "Compare React, Vue and Svelte",
];

export type NativeChatThreadProps = {
  /** The header title. */
  title?: string | undefined;
};

export function NativeChatThread({ title = "Chat" }: NativeChatThreadProps) {
  const colors = useColorScheme() === "dark" ? DARK : LIGHT;

  return (
    <ThreadPrimitive.Root
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <ThreadListPrimitive.New
          accessibilityLabel="New chat"
          style={({ pressed }) => [
            styles.iconButton,
            { borderColor: colors.border },
            pressed && { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.iconGlyph, { color: colors.text }]}>+</Text>
        </ThreadListPrimitive.New>
      </View>

      <AuiIf condition={(s) => s.thread.messages.length === 0}>
        <Welcome colors={colors} />
      </AuiIf>

      <AuiIf condition={(s) => s.thread.messages.length > 0}>
        <ThreadPrimitive.MessagesFlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {({ message }) => <Message message={message} colors={colors} />}
        </ThreadPrimitive.MessagesFlatList>
      </AuiIf>

      <Composer colors={colors} />
    </ThreadPrimitive.Root>
  );
}

function Welcome({ colors }: { colors: Palette }) {
  return (
    <View style={styles.welcome}>
      <Text style={[styles.welcomeTitle, { color: colors.text }]}>
        Hello there!
      </Text>
      <Text style={[styles.welcomeText, { color: colors.muted }]}>
        How can I help you today?
      </Text>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((prompt) => (
          <ThreadPrimitive.Suggestion
            key={prompt}
            prompt={prompt}
            send
            style={({ pressed }) => [
              styles.suggestion,
              { borderColor: colors.border },
              pressed && { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.suggestionText, { color: colors.text }]}>
              {prompt}
            </Text>
          </ThreadPrimitive.Suggestion>
        ))}
      </View>
    </View>
  );
}

function Message({
  message,
  colors,
}: {
  message: MessageState;
  colors: Palette;
}) {
  if (message.role === "user") {
    return (
      <MessagePrimitive.Root style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: colors.surface }]}>
          <MessagePrimitive.Content
            renderText={({ part }) => (
              <Text style={[styles.body, { color: colors.text }]}>
                {part.text}
              </Text>
            )}
          />
        </View>
      </MessagePrimitive.Root>
    );
  }

  if (message.role !== "assistant") return null;

  return (
    <MessagePrimitive.Root style={styles.assistantRow}>
      <MessagePrimitive.Content
        renderText={({ part }) => <Markdown text={part.text} colors={colors} />}
        renderReasoning={({ part }) => (
          <Reasoning text={part.text} colors={colors} />
        )}
        renderToolCall={({ part }) => <ToolCall part={part} colors={colors} />}
      />
      {message.status?.type === "running" && message.content.length === 0 ? (
        <Text style={[styles.body, { color: colors.muted }]}>Thinking…</Text>
      ) : null}
      <AuiIf condition={(s) => s.message.isLast && !s.thread.isRunning}>
        <View style={styles.actions}>
          <ActionBarPrimitive.Reload
            style={({ pressed }) => [
              styles.action,
              pressed && { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.actionText, { color: colors.muted }]}>
              Retry
            </Text>
          </ActionBarPrimitive.Reload>
        </View>
      </AuiIf>
    </MessagePrimitive.Root>
  );
}

function Reasoning({ text, colors }: { text: string; colors: Palette }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.reasoning}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
      >
        <Text style={[styles.reasoningLabel, { color: colors.muted }]}>
          {open ? "▾" : "▸"} Thinking
        </Text>
      </Pressable>
      {open ? (
        <Text
          style={[
            styles.reasoningText,
            { color: colors.muted, borderLeftColor: colors.border },
          ]}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

function ToolCall({
  part,
  colors,
}: {
  part: ToolCallMessagePart;
  colors: Palette;
}) {
  const done = part.result !== undefined;
  return (
    <View
      style={[
        styles.tool,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <Text style={[styles.toolName, { color: colors.text }]}>
        {done ? "✓" : "…"} {part.toolName}
      </Text>
      <Text style={[styles.toolText, { color: colors.muted }]}>
        {part.argsText}
      </Text>
      {done ? (
        <Text style={[styles.toolText, { color: colors.muted }]}>
          {JSON.stringify(part.result)}
        </Text>
      ) : null}
    </View>
  );
}

function Composer({ colors }: { colors: Palette }) {
  return (
    <View style={[styles.composerWrap, { borderTopColor: colors.border }]}>
      <ComposerPrimitive.Root
        style={[
          styles.composer,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <ComposerPrimitive.Input
          placeholder="Send a message…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          multiline
        />
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: colors.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.sendGlyph, { color: colors.accentText }]}>
              ↑
            </Text>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel
            accessibilityLabel="Stop generating"
            style={({ pressed }) => [
              styles.send,
              { backgroundColor: colors.accent },
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[styles.stopGlyph, { backgroundColor: colors.accentText }]}
            />
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </ComposerPrimitive.Root>
    </View>
  );
}

/**
 * Just enough markdown for chat replies: fenced code blocks, tables, bullet
 * lists, and **bold**, *italic* and `code` inside a line.
 */
function Markdown({ text, colors }: { text: string; colors: Palette }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.startsWith("```")) {
      const code: string[] = [];
      index++;
      while (index < lines.length && !lines[index]?.startsWith("```")) {
        code.push(lines[index] ?? "");
        index++;
      }
      index++;
      blocks.push(
        <View
          key={blocks.length}
          style={[
            styles.codeBlock,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.code, { color: colors.text }]}>
            {code.join("\n")}
          </Text>
        </View>,
      );
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index]?.startsWith("|")) {
        const cells = (lines[index] ?? "")
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-+:?$/.test(cell))) rows.push(cells);
        index++;
      }
      blocks.push(
        <View
          key={blocks.length}
          style={[styles.table, { borderColor: colors.border }]}
        >
          {rows.map((cells, row) => (
            <View
              key={row}
              style={[
                styles.tableRow,
                row > 0 && { borderTopColor: colors.border },
                row > 0 && styles.tableDivider,
              ]}
            >
              {cells.map((cell, column) => (
                <Text
                  key={column}
                  style={[
                    styles.tableCell,
                    { color: colors.text },
                    row === 0 && styles.bold,
                  ]}
                >
                  <Inline text={cell} colors={colors} />
                </Text>
              ))}
            </View>
          ))}
        </View>,
      );
      continue;
    }

    if (line.trim() !== "") {
      const bullet = /^\s*[-*] /.test(line);
      blocks.push(
        <Text
          key={blocks.length}
          style={[styles.body, { color: colors.text }, bullet && styles.bullet]}
        >
          {bullet ? "•  " : null}
          <Inline text={line.replace(/^\s*[-*] /, "")} colors={colors} />
        </Text>,
      );
    }
    index++;
  }

  return <View style={styles.markdown}>{blocks}</View>;
}

function Inline({ text, colors }: { text: string; colors: Palette }) {
  const pieces = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return pieces.map((piece, index) => {
    let style: TextStyle | undefined;
    let content = piece;
    if (piece.startsWith("**") && piece.endsWith("**") && piece.length > 4) {
      style = styles.bold;
      content = piece.slice(2, -2);
    } else if (piece.startsWith("`") && piece.endsWith("`")) {
      style = { ...styles.inlineCode, backgroundColor: colors.surface };
      content = piece.slice(1, -1);
    } else if (
      piece.startsWith("*") &&
      piece.endsWith("*") &&
      piece.length > 2
    ) {
      style = styles.italic;
      content = piece.slice(1, -1);
    }
    return (
      <Text key={index} style={style}>
        {content}
      </Text>
    );
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: "600" },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: { fontSize: 18, lineHeight: 20 },
  welcome: { flex: 1, justifyContent: "center", padding: 24, gap: 4 },
  welcomeTitle: { fontSize: 22, fontWeight: "600" },
  welcomeText: { fontSize: 16 },
  suggestions: { marginTop: 20, gap: 8 },
  suggestion: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: { fontSize: 14 },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 16 },
  userRow: { alignItems: "flex-end" },
  userBubble: {
    maxWidth: "85%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  assistantRow: { gap: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  markdown: { gap: 8 },
  bullet: { paddingLeft: 4 },
  bold: { fontWeight: "600" },
  italic: { fontStyle: "italic" },
  inlineCode: { fontFamily: MONO, fontSize: 13, borderRadius: 4 },
  codeBlock: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
  },
  code: { fontFamily: MONO, fontSize: 13, lineHeight: 19 },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableRow: { flexDirection: "row" },
  tableDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  tableCell: { flex: 1, fontSize: 13, lineHeight: 18, padding: 8 },
  reasoning: { gap: 6 },
  reasoningLabel: { fontSize: 13, fontWeight: "500" },
  reasoningText: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  tool: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  toolName: { fontSize: 13, fontWeight: "600" },
  toolText: { fontFamily: MONO, fontSize: 12 },
  actions: { flexDirection: "row" },
  action: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { fontSize: 12 },
  composerWrap: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { flex: 1, fontSize: 15, maxHeight: 120, paddingVertical: 6 },
  send: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendGlyph: { fontSize: 17, fontWeight: "700" },
  stopGlyph: { width: 10, height: 10, borderRadius: 2 },
  pressed: { opacity: 0.7 },
});
