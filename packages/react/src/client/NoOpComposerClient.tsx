"use client";
import { resource, tapMemo } from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import { ComposerState } from "../types/scopes";

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
      };
    }, [type]);

    return {
      state,
      methods: {
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
      },
    };
  },
);
