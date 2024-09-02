import { create } from "zustand";
import { SpeechSynthesisAdapter } from "../../runtimes/speech/SpeechAdapterTypes";

export type MessageUtilsState = Readonly<{
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  isHovering: boolean;
  setIsHovering: (value: boolean) => void;

  isSpeaking: boolean;
  stopSpeaking: () => void;
  addUtterance: (utterance: SpeechSynthesisAdapter.Utterance) => void;
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
        utterance?.stop();
      },
      addUtterance: (utt) => {
        utterance = utt;
        set({ isSpeaking: true });
        utt.onEnd(() => {
          set({ isSpeaking: false });
        });
      },
    };
  });
