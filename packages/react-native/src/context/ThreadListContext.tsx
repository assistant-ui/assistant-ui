import { createContext, useContext, FC, PropsWithChildren } from "react";
import type { ThreadListRuntime, ThreadListItemState } from "../runtime/types";

// ============================================
// ThreadList Context
// ============================================

const ThreadListContext = createContext<ThreadListRuntime | null>(null);

export const useThreadListContext = (): ThreadListRuntime => {
  const context = useContext(ThreadListContext);
  if (!context) {
    throw new Error(
      "useThreadListContext must be used within a ThreadListProvider",
    );
  }
  return context;
};

export const useThreadListContextOptional = (): ThreadListRuntime | null => {
  return useContext(ThreadListContext);
};

export type ThreadListProviderProps = PropsWithChildren<{
  runtime: ThreadListRuntime;
}>;

export const ThreadListProvider: FC<ThreadListProviderProps> = ({
  runtime,
  children,
}) => {
  return (
    <ThreadListContext.Provider value={runtime}>
      {children}
    </ThreadListContext.Provider>
  );
};

// ============================================
// ThreadListItem Context
// ============================================

const ThreadListItemContext = createContext<ThreadListItemState | null>(null);

export const useThreadListItemContext = (): ThreadListItemState => {
  const context = useContext(ThreadListItemContext);
  if (!context) {
    throw new Error(
      "useThreadListItemContext must be used within a ThreadListItemProvider",
    );
  }
  return context;
};

export const useThreadListItemContextOptional =
  (): ThreadListItemState | null => {
    return useContext(ThreadListItemContext);
  };

export type ThreadListItemProviderProps = PropsWithChildren<{
  item: ThreadListItemState;
}>;

export const ThreadListItemProvider: FC<ThreadListItemProviderProps> = ({
  item,
  children,
}) => {
  return (
    <ThreadListItemContext.Provider value={item}>
      {children}
    </ThreadListItemContext.Provider>
  );
};
