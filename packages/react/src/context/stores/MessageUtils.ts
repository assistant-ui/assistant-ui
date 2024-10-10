import { create } from "zustand";

export type MessageUtilsState = Readonly<{
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;

  isHovering: boolean;
  setIsHovering: (value: boolean) => void;

  /** @deprecated This will be moved to `useMessage().submittedFeedback`. This will be removed in 0.6.0. */
  submittedFeedback: "positive" | "negative" | null;
  /** @deprecated This will be moved to `useMessageRuntime().submitFeedback()` instead. This will be removed in 0.6.0. */
  setSubmittedFeedback: (feedback: "positive" | "negative" | null) => void;
}>;

export const makeMessageUtilsStore = () =>
  create<MessageUtilsState>((set) => {
    return {
      isCopied: false,
      setIsCopied: (value) => {
        set({ isCopied: value });
      },
      isHovering: false,
      setIsHovering: (value) => {
        set({ isHovering: value });
      },
      submittedFeedback: null,
      setSubmittedFeedback: (feedback) => {
        set({ submittedFeedback: feedback });
      },
    };
  });
