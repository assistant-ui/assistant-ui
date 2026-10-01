import { Activity, useEffect, useRef, useState, type ReactNode } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { TextInput, useAui, useAuiState } from "@assistant-ui/react-ink";

type Mode = "chat" | "threads" | "search" | "rename" | "delete" | "help";

export function ThreadShell({
  children,
}: {
  children: (options: { isComposing: boolean; width: number }) => ReactNode;
}) {
  const aui = useAui();
  const state = useAuiState((s) => s.threads);
  const { stdout } = useStdout();
  const [{ columns, rows }, setDimensions] = useState(() => ({
    columns: stdout.columns ?? 80,
    rows: stdout.rows ?? 24,
  }));
  const [mode, setMode] = useState<Mode>("chat");
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [editing, setEditing] = useState<{ id: string; title: string }>();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    const resize = () =>
      setDimensions({
        columns: stdout.columns ?? 80,
        rows: stdout.rows ?? 24,
      });
    stdout.on("resize", resize);
    return () => {
      stdout.off("resize", resize);
    };
  }, [stdout]);

  const ids = archived ? state.archivedThreadIds : state.threadIds;
  const orderedItems = [...state.threadItems].sort(
    (a, b) =>
      Number(b.custom?.pinned === "true") - Number(a.custom?.pinned === "true"),
  );
  const orderedThreadIds = orderedItems
    .filter((item) => state.threadIds.includes(item.id))
    .map((item) => item.id);
  const items = orderedItems.filter(
    (item) =>
      ids.includes(item.id) &&
      (item.title ?? "New chat")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const selectedIndex =
    selectedId === undefined
      ? 0
      : items.findIndex((item) => item.id === selectedId);
  const selected = items[selectedIndex];
  const wide = columns >= 88;
  const showSidebar = wide || mode !== "chat";
  const width = Math.max(20, columns - 2 - (wide ? 30 : 0));
  const pageSize = Math.max(3, rows - 14);
  const offset = Math.max(
    0,
    Math.min(selectedIndex - pageSize + 1, items.length - pageSize),
  );

  const run = async (action: () => unknown, done?: () => void) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      done?.();
    } catch {
      setError("Could not complete the action. Please try again.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const rename = (item: { id: string; title?: string | undefined }) => {
    setEditing({ id: item.id, title: item.title ?? "" });
    setName(item.title ?? "");
    setMode("rename");
    setError("");
  };

  const switchRelative = (direction: number) => {
    const index = orderedThreadIds.indexOf(state.mainThreadId);
    const next =
      index < 0
        ? direction > 0
          ? 0
          : orderedThreadIds.length - 1
        : index + direction;
    const id = orderedThreadIds[next];
    if (id)
      void run(
        () => aui.threads.switchToThread(id),
        () => {
          setSelectedId(id);
          setMode("chat");
        },
      );
  };

  useInput((input, key) => {
    if (pendingRef.current) return;
    if (key.ctrl && input === "g" && mode !== "rename" && mode !== "delete") {
      setMode(mode === "chat" ? "threads" : "chat");
      setSelectedId(
        items.some((item) => item.id === state.mainThreadId)
          ? state.mainThreadId
          : undefined,
      );
      return;
    }
    if (key.escape) {
      setError("");
      setMode(
        mode === "chat" ? "threads" : mode === "threads" ? "chat" : "threads",
      );
      return;
    }
    if (mode === "rename" || mode === "search") return;
    if (mode === "delete") {
      if (input.toLowerCase() === "y" && editing) {
        void run(
          () => aui.threads.item({ id: editing.id }).delete(),
          () => setMode("threads"),
        );
      } else if (input.toLowerCase() === "n") setMode("threads");
      return;
    }
    if (mode === "help") {
      if (input === "?") setMode("threads");
      return;
    }
    if (key.meta && (key.upArrow || key.downArrow)) {
      switchRelative(key.upArrow ? -1 : 1);
      return;
    }
    if ((key.ctrl && input === "n") || (mode === "threads" && input === "n")) {
      void run(
        () => aui.threads.switchToNewThread(),
        () => {
          setArchived(false);
          setQuery("");
          setMode("chat");
        },
      );
      return;
    }
    if (key.ctrl && input === "r") {
      const main = state.threadItems.find(
        (item) => item.id === state.mainThreadId && item.status !== "new",
      );
      if (main) rename(main);
      return;
    }
    if (mode !== "threads") return;
    if (key.upArrow || key.downArrow) {
      const next = Math.max(
        0,
        Math.min(items.length - 1, selectedIndex + (key.upArrow ? -1 : 1)),
      );
      setSelectedId(items[next]?.id);
    } else if (key.return && selected) {
      void run(
        () => aui.threads.switchToThread(selected.id, { unarchive: false }),
        () => setMode("chat"),
      );
    } else if (input === "/") {
      setMode("search");
    } else if (input === "x") {
      setArchived(!archived);
      setQuery("");
      setSelectedId(undefined);
    } else if (input === "?") {
      setMode("help");
    } else if (input === "l" && state.hasMore) {
      void run(() => aui.threads.loadMore());
    } else if (input === "l" && state.loadError) {
      void run(() => aui.threads.reload());
    } else if (selected) {
      const item = aui.threads.item({ id: selected.id });
      if (input === "r") rename(selected);
      if (input === "a")
        void run(() => (archived ? item.unarchive() : item.archive()));
      if (input === "p" && !archived) {
        const { pinned, ...custom } = selected.custom ?? {};
        void run(() =>
          item.updateCustom(
            pinned === "true" ? custom : { ...custom, pinned: "true" },
          ),
        );
      }
      if (input === "d") {
        setEditing({ id: selected.id, title: selected.title ?? "New chat" });
        setMode("delete");
      }
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="row" alignItems="flex-start">
        {showSidebar ? (
          <Box
            width={wide ? 29 : undefined}
            flexGrow={wide ? 0 : 1}
            flexShrink={0}
            flexDirection="column"
            borderStyle="single"
            borderColor={mode === "chat" ? "gray" : "cyan"}
            paddingX={1}
            marginRight={wide ? 1 : 0}
          >
            <Text bold color="cyan">
              {archived ? "Archived" : "Threads"}{" "}
              <Text dimColor>({items.length})</Text>
            </Text>
            <Text dimColor>
              n New · / Search · x {archived ? "Threads" : "Archived"}
            </Text>
            {mode === "search" ? (
              <TextInput
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setSelectedId(undefined);
                }}
                submitOnEnter
                onSubmit={() => setMode("threads")}
                placeholder="Search threads…"
              />
            ) : query ? (
              <Text dimColor>Search: {query}</Text>
            ) : null}
            <Box flexDirection="column" marginY={1}>
              {state.isLoading ? (
                <Text dimColor>Loading threads…</Text>
              ) : state.loadError ? (
                <Text color="red">Could not load. l Retry</Text>
              ) : null}
              {!state.isLoading && items.length === 0 ? (
                <Text dimColor>
                  {query
                    ? "No matching threads"
                    : archived
                      ? "No archived threads"
                      : "Your threads appear here"}
                </Text>
              ) : null}
              {offset > 0 ? <Text dimColor>↑ {offset} more</Text> : null}
              {items.slice(offset, offset + pageSize).map((item) => (
                <Text
                  key={item.id}
                  wrap="truncate-end"
                  inverse={mode !== "chat" && item.id === selected?.id}
                  bold={item.id === state.mainThreadId}
                >
                  {item.id === state.mainThreadId ? "● " : "  "}
                  {item.custom?.pinned === "true" ? "◆ " : ""}
                  {item.title ?? "New chat"}
                  {item.isRunning ? " …" : ""}
                </Text>
              ))}
              {items.length > offset + pageSize ? (
                <Text dimColor>↓ {items.length - offset - pageSize} more</Text>
              ) : null}
            </Box>
            {mode === "rename" && editing ? (
              <Box flexDirection="column">
                <Text bold>Rename thread</Text>
                {pending ? (
                  <Text dimColor>Saving…</Text>
                ) : (
                  <Box borderStyle="round" borderColor="cyan" paddingX={1}>
                    <TextInput
                      value={name}
                      onChange={setName}
                      submitOnEnter
                      onSubmit={(value) => {
                        const next = value.trim();
                        if (!next) {
                          setError("Enter a thread name.");
                          return;
                        }
                        void run(
                          () =>
                            aui.threads.item({ id: editing.id }).rename(next),
                          () => setMode("threads"),
                        );
                      }}
                    />
                  </Box>
                )}
                <Text dimColor>Enter Save · Esc Cancel</Text>
              </Box>
            ) : mode === "delete" ? (
              <Box flexDirection="column">
                <Text color="red">Delete “{editing?.title}”?</Text>
                <Text>This cannot be undone.</Text>
                <Text>y Delete · n Cancel</Text>
              </Box>
            ) : mode === "help" ? (
              <Box flexDirection="column">
                <Text>↑/↓ Select · Enter Open</Text>
                <Text>r Rename · p Pin/unpin</Text>
                <Text>a Archive/restore</Text>
                <Text>d Delete · l Load/retry</Text>
                <Text>Alt+↑/↓ Switch threads</Text>
                <Text>Ctrl+N New · Ctrl+R Rename</Text>
                <Text>Ctrl+G Threads/composer</Text>
                <Text>Esc Back · ? Close help</Text>
              </Box>
            ) : (
              <Text dimColor>
                ↑↓ Select · Enter Open{"\n"}r Rename · a{" "}
                {archived ? "Restore" : "Archive"}
                {"\n"}? All shortcuts
              </Text>
            )}
            {state.hasMore ? <Text dimColor>l Load more</Text> : null}
            {pending && mode !== "rename" ? (
              <Text dimColor>Working…</Text>
            ) : null}
          </Box>
        ) : null}
        <Activity mode={wide || mode === "chat" ? "visible" : "hidden"}>
          <Box width={width} flexDirection="column" flexGrow={1}>
            {children({ isComposing: mode === "chat", width })}
          </Box>
        </Activity>
      </Box>
      {error ? <Text color="red">{error}</Text> : null}
      <Box marginTop={1}>
        <Text dimColor>
          Ctrl+G Threads · Alt+↑/↓ Switch · Ctrl+N New · Ctrl+R Rename
        </Text>
      </Box>
    </Box>
  );
}
