import { useEffect, useMemo, useRef, useState } from "react";
import { MessageDetailBody, messageDetailHeader } from "../../views/message";
import {
  ConversationList,
  Transcript,
  TranscriptHeader,
  conversationListHeader,
  messageNodeId,
  parseThreadListPreview,
  resolveSingleThread,
  resolveThreadForId,
} from "../../views/thread";
import type { ThreadPreview } from "../../views/thread";
import { CenteredMessage, ControlButton, EmptyState } from "../../views/ui";
import { SplitLayout } from "../SplitLayout";
import type { DevToolsTabContext } from "../registry";

const TWO_COL = "clamp(16rem,32%,22rem)_minmax(0,1fr)";
const THREE_COL = "clamp(12rem,26%,15rem)_clamp(14rem,32%,20rem)_minmax(0,1fr)";

const useSelectedMessage = (
  thread: ThreadPreview | null,
  selection: string | null,
  setSelection: (nodeId: string | null) => void,
) => {
  const selectedMessage = useMemo(() => {
    if (!thread || thread.messages.length === 0) return null;
    const match = thread.messages.find(
      (message) => messageNodeId(message.id) === selection,
    );
    return match ?? thread.messages[thread.messages.length - 1]!;
  }, [thread, selection]);

  useEffect(() => {
    if (!thread || thread.messages.length === 0 || selection !== null) return;
    const last = thread.messages[thread.messages.length - 1]!;
    setSelection(messageNodeId(last.id));
  }, [thread, selection, setSelection]);

  return selectedMessage;
};

const UnloadedConversation = ({
  switchToThread,
  threadId,
}: {
  switchToThread?: ((threadId: string) => void | Promise<void>) | undefined;
  threadId: string;
}) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
    <EmptyState>
      This conversation has not been opened in the app yet, so its messages are
      not cached in DevTools.
    </EmptyState>
    {switchToThread ? (
      <ControlButton onClick={() => switchToThread(threadId)}>
        Load conversation
      </ControlButton>
    ) : null}
  </div>
);

export const ThreadTab = ({
  data,
  selection,
  setSelection,
  switchToThread,
}: DevToolsTabContext) => {
  const threadList = useMemo(
    () => parseThreadListPreview(data.state.threads),
    [data.state.threads],
  );
  const snapshots = data.threadSnapshots;

  const hasConversationList =
    threadList !== null && threadList.threadIds.length > 0;

  const [activeThreadId, setActiveThreadId] = useState<string>(
    () => threadList?.mainThreadId ?? threadList?.threadIds[0] ?? "",
  );

  useEffect(() => {
    if (!hasConversationList || !threadList) return;
    const ids = [...threadList.threadIds, ...threadList.archivedThreadIds];
    if (ids.includes(activeThreadId)) return;
    setActiveThreadId(threadList.mainThreadId ?? threadList.threadIds[0] ?? "");
  }, [hasConversationList, threadList, activeThreadId]);

  const prevThreadIdRef = useRef(activeThreadId);
  useEffect(() => {
    if (prevThreadIdRef.current === activeThreadId) return;
    prevThreadIdRef.current = activeThreadId;
    setSelection(null);
  }, [activeThreadId, setSelection]);

  const activeThread = useMemo(() => {
    if (!hasConversationList) {
      return resolveSingleThread(data.state);
    }
    return resolveThreadForId(
      data.state,
      snapshots,
      activeThreadId,
      threadList,
    );
  }, [hasConversationList, data.state, snapshots, activeThreadId, threadList]);

  const selectedMessage = useSelectedMessage(
    activeThread,
    selection,
    setSelection,
  );

  if (!hasConversationList) {
    if (!activeThread || activeThread.messages.length === 0) {
      return (
        <CenteredMessage>
          No thread messages for this assistant instance.
        </CenteredMessage>
      );
    }

    const activeNodeId = messageNodeId(selectedMessage!.id);

    return (
      <SplitLayout
        sizes={TWO_COL}
        columns={[
          {
            key: "transcript",
            header: <TranscriptHeader thread={activeThread} />,
            children: (
              <Transcript
                thread={activeThread}
                selection={activeNodeId}
                onSelect={setSelection}
              />
            ),
          },
          {
            key: "detail",
            header: messageDetailHeader(selectedMessage!),
            children: <MessageDetailBody message={selectedMessage!} />,
          },
        ]}
      />
    );
  }

  const loaded = activeThread !== null && activeThread.messages.length > 0;

  if (!loaded) {
    return (
      <SplitLayout
        sizes="clamp(12rem,26%,15rem)_minmax(0,1fr)"
        columns={[
          {
            key: "conversations",
            header: conversationListHeader(threadList!),
            children: (
              <ConversationList
                threadList={threadList!}
                snapshots={snapshots}
                selectedId={activeThreadId}
                onSelect={setActiveThreadId}
              />
            ),
          },
          {
            key: "empty",
            children: (
              <UnloadedConversation
                threadId={activeThreadId}
                switchToThread={switchToThread}
              />
            ),
          },
        ]}
      />
    );
  }

  const activeNodeId = messageNodeId(selectedMessage!.id);

  return (
    <SplitLayout
      sizes={THREE_COL}
      columns={[
        {
          key: "conversations",
          header: conversationListHeader(threadList!),
          children: (
            <ConversationList
              threadList={threadList!}
              snapshots={snapshots}
              selectedId={activeThreadId}
              onSelect={setActiveThreadId}
            />
          ),
        },
        {
          key: "transcript",
          header: <TranscriptHeader thread={activeThread!} />,
          children: (
            <Transcript
              thread={activeThread!}
              selection={activeNodeId}
              onSelect={setSelection}
            />
          ),
        },
        {
          key: "detail",
          header: messageDetailHeader(selectedMessage!),
          children: <MessageDetailBody message={selectedMessage!} />,
        },
      ]}
    />
  );
};
