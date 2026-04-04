import { useCallback, useSyncExternalStore } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { VoiceSessionState } from "../../runtime/interfaces/thread-runtime-core";

export const useVoiceState = (): VoiceSessionState | undefined => {
  return useAuiState((s) => s.thread.voice);
};

const getServerVolume = () => 0;

export const useVoiceVolume = (): number => {
  const aui = useAui();
  const thread = aui.thread();
  return useSyncExternalStore(
    thread.subscribeVoiceVolume,
    thread.getVoiceVolume,
    getServerVolume,
  );
};

export const useVoiceControls = () => {
  const aui = useAui();

  const connect = useCallback(() => {
    aui.thread().connectVoice();
  }, [aui]);

  const disconnect = useCallback(() => {
    aui.thread().disconnectVoice();
  }, [aui]);

  const mute = useCallback(() => {
    aui.thread().muteVoice();
  }, [aui]);

  const unmute = useCallback(() => {
    aui.thread().unmuteVoice();
  }, [aui]);

  return { connect, disconnect, mute, unmute };
};
