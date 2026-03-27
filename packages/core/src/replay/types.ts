import type { SerializedThreadMessage } from "../share/types";

export type ThreadRecording = {
  version: 1;
  metadata: {
    createdAt: string;
    duration: number;
    messageCount: number;
    title?: string;
  };
  events: ThreadRecordingEvent[];
};

export type ThreadRecordingEvent =
  | {
      type: "snapshot";
      timestamp: number;
      messages: SerializedThreadMessage[];
    }
  | { type: "run-start"; timestamp: number }
  | { type: "run-end"; timestamp: number }
  | {
      type: "message-update";
      timestamp: number;
      messageId: string;
      message: SerializedThreadMessage;
    };
