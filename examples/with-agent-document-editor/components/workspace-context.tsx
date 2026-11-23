"use client";

import { unstable_useInteractableState } from "@assistant-ui/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import {
  COMMENTS_ID,
  DOCUMENT_ID,
  initialComments,
  initialDocument,
  type CommentsState,
  type DocumentState,
} from "@/lib/document-state";

export type PanelId = "chat" | "comments" | "history";

const NARROW = "(max-width: 639px)";

const subscribeToWidth = (onChange: () => void) => {
  const query = window.matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Whether the screen is too narrow to hold a panel beside the document. */
export const useIsNarrow = () =>
  useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );

type WorkspaceValue = {
  panel: PanelId | null;
  setPanel: (panel: PanelId | null) => void;
  activeCommentId: string | null;
  showComment: (id: string | null) => void;
  /** Tool call whose version the history panel should open on. */
  focusedVersion: string | null;
  showVersion: (toolCallId: string | null) => void;
  /** Shows the chat panel and puts the caret in its composer. */
  openChat: () => void;
  /** Changes each time the composer should take focus. */
  chatFocusRequest: number;
  /** The last focus request the composer acted on. */
  chatFocusHandled: RefObject<number>;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const isNarrow = useIsNarrow();
  // Until a panel is opened or closed by hand, the chat is open wherever
  // there is room for it beside the document.
  const [chosenPanel, setPanel] = useState<PanelId | null>();
  const panel =
    chosenPanel === undefined ? (isNarrow ? null : "chat") : chosenPanel;
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [focusedVersion, setFocusedVersion] = useState<string | null>(null);
  const [chatFocusRequest, setChatFocusRequest] = useState(0);
  const chatFocusHandled = useRef(0);

  const showComment = useCallback((id: string | null) => {
    setActiveCommentId(id);
    if (id) setPanel("comments");
  }, []);

  const showVersion = useCallback((toolCallId: string | null) => {
    setFocusedVersion(toolCallId);
    if (toolCallId) setPanel("history");
  }, []);

  const openChat = useCallback(() => {
    setPanel("chat");
    setChatFocusRequest((request) => request + 1);
  }, []);

  const value = useMemo<WorkspaceValue>(
    () => ({
      panel,
      setPanel,
      activeCommentId,
      showComment,
      focusedVersion,
      showVersion,
      openChat,
      chatFocusRequest,
      chatFocusHandled,
    }),
    [
      panel,
      activeCommentId,
      showComment,
      focusedVersion,
      showVersion,
      openChat,
      chatFocusRequest,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return value;
}

export function useDocumentState() {
  const [state, methods] =
    unstable_useInteractableState<DocumentState>(DOCUMENT_ID);
  return [state ?? initialDocument, methods] as const;
}

export function useCommentsState() {
  const [state, methods] =
    unstable_useInteractableState<CommentsState>(COMMENTS_ID);
  return [state ?? initialComments, methods] as const;
}
