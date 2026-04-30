"use client";

import type { MessagePartState, VideoMessagePart } from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";

export const useMessagePartVideo = () => {
  const video = useAuiState((s) => {
    if (s.part.type !== "video")
      throw new Error(
        "MessagePartVideo can only be used inside video message parts.",
      );

    return s.part as MessagePartState & VideoMessagePart;
  });

  return video;
};
