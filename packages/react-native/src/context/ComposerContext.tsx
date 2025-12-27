import { createContext, useContext, FC, PropsWithChildren } from "react";
import type { Unsubscribe, Attachment } from "@assistant-ui/core";

export type ComposerRuntimeState = {
  text: string;
  attachments: readonly Attachment[];
  canSend: boolean;
  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;
  type: "thread" | "edit";
};

export type ComposerRuntime = {
  getState: () => ComposerRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
  setText: (text: string) => void;
  send: () => void;
  cancel: () => void;
  reset: () => void;
  addAttachment: (file: {
    uri: string;
    type: string;
    name: string;
  }) => Promise<void>;
  removeAttachment: (attachmentId: string) => Promise<void>;
};

const ComposerContext = createContext<ComposerRuntime | null>(null);

export const useComposerContext = (): ComposerRuntime => {
  const context = useContext(ComposerContext);
  if (!context) {
    throw new Error(
      "useComposerContext must be used within a ComposerProvider",
    );
  }
  return context;
};

export const useComposerContextOptional = (): ComposerRuntime | null => {
  return useContext(ComposerContext);
};

export type ComposerProviderProps = PropsWithChildren<{
  runtime: ComposerRuntime;
}>;

export const ComposerProvider: FC<ComposerProviderProps> = ({
  runtime,
  children,
}) => {
  return (
    <ComposerContext.Provider value={runtime}>
      {children}
    </ComposerContext.Provider>
  );
};
