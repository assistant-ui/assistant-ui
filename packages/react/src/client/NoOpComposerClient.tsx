"use client";
import { resource, tapMemo } from "@assistant-ui/tap";
import { ComposerClientState, ComposerClientApi } from "./types/Composer";
import { tapApi } from "../utils/tap-store";

export const NoOpComposerClient = resource(
  ({ type }: { type: "edit" | "thread" }) => {
    const state = tapMemo<ComposerClientState>(() => {
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
      };
    }, [type]);

    return tapApi<ComposerClientApi>({
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
      beginEdit: () => {
        throw new Error("Not supported");
      },
    });
  },
);
