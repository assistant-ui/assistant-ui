import { create } from "zustand";
import { SpeechSynthesisAdapter } from "../../runtimes/speech/SpeechAdapterTypes";

export type MessageUtilsState = Readonly<{
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;

  isHovering: boolean;
  setIsHovering: (value: boolean) => void;

  /** @deprecated This will be moved to `useMessage().isSpeaking` instead. This will be removed in 0.6.0. */
  isSpeaking: boolean;
  /** @deprecated This will be moved to `useMessageRuntime().stopSpeaking()` instead. This will be removed in 0.6.0. */
  stopSpeaking: () => void;
  /** @deprecated This will be moved to `useMessageRuntime().speak()` instead. This will be removed in 0.6.0. */
  addUtterance: (utterance: SpeechSynthesisAdapter.Utterance) => void;

  /** @deprecated This will be moved to `useMessage().submittedFeedback`. This will be removed in 0.6.0. */
  submittedFeedback: "positive" | "negative" | null;
  /** @deprecated This will be moved to `useMessageRuntime().submitFeedback()` instead. This will be removed in 0.6.0. */
  setSubmittedFeedback: (feedback: "positive" | "negative" | null) => void;
}>;

export const makeMessageUtilsStore = () =>
  create<MessageUtilsState>((set) => {
    let utterance: SpeechSynthesisAdapter.Utterance | null = null;
    return {
      isCopied: false,
      setIsCopied: (value) => {
        set({ isCopied: value });
      },
      isHovering: false,
      setIsHovering: (value) => {
        set({ isHovering: value });
      },
      isSpeaking: false,
      stopSpeaking: () => {
        utterance?.cancel();
      },
      addUtterance: (utt) => {
        utterance = utt;
        set({ isSpeaking: true });
        utt.onEnd(() => {
          set({ isSpeaking: false });
        });
      },
      submittedFeedback: null,
      setSubmittedFeedback: (feedback) => {
        set({ submittedFeedback: feedback });
      },
    };
  });
