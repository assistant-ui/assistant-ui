"use client";
import { resource, tapMemo } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { ComposerState } from "../types/scopes";

export const NoOpComposerClient = resource(
  ({ type }: { type: "edit" | "thread" }): ClientOutput<"composer"> => {
    const state = tapMemo<ComposerState>(() => {
      return {
        isEditing: false,
        isEmpty: true,
        text: "",
        attachmentAccept: "*",
        attachments: [],
        role: "user",
        runConfig: {},
        canCancel: false,
        type: type,
        dictation: undefined,
        quote: undefined,
      };
    }, [type]);

    return {
      getState: () => state,
      setText: () => {
        throw new Error("Not supported");
      },
      setRole: () => {
        throw new Error("Not supported");
      },
      setRunConfig: () => {
        throw new Error("Not supported");
      },
      addAttachment: () => {
        throw new Error("Not supported");
      },
      clearAttachments: () => {
        throw new Error("Not supported");
      },
      attachment: () => {
        throw new Error("Not supported");
      },
      reset: () => {
        throw new Error("Not supported");
      },
      send: () => {
        throw new Error("Not supported");
      },
      cancel: () => {
        throw new Error("Not supported");
      },
      startDictation: () => {
        throw new Error("Not supported");
      },
      stopDictation: () => {
        throw new Error("Not supported");
      },
      beginEdit: () => {
        throw new Error("Not supported");
      },
      setQuote: () => {
        throw new Error("Not supported");
      },
    };
  },
);
