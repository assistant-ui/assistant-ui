import { CloudMessage } from "assistant-cloud";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import { auiV0Decode } from "./auiV0";
import { ThreadMessage } from "../../types";
import {
  AuiCodecMessage,
  decodeAuiMessage,
  encodeAuiMessage,
} from "./auiCodec";

type AuiV1Message = AuiCodecMessage;

export function auiV1Encode(message: ThreadMessage): AuiV1Message {
  return encodeAuiMessage(message, {
    allowComponent: true,
    formatLabel: "aui/v1",
  });
}

export function auiV1Decode(
  cloudMessage: CloudMessage & { format: "aui/v1" },
): ExportedMessageRepositoryItem {
  return decodeAuiMessage(cloudMessage);
}

export const decodeAuiV1OrV0Message = (
  cloudMessage: CloudMessage,
): ExportedMessageRepositoryItem | null => {
  if (cloudMessage.format === "aui/v1") {
    return auiV1Decode(cloudMessage as CloudMessage & { format: "aui/v1" });
  }
  if (cloudMessage.format === "aui/v0") {
    return auiV0Decode(cloudMessage as CloudMessage & { format: "aui/v0" });
  }
  return null;
};

export const decodeAuiV1OrV0Messages = (
  messages: readonly CloudMessage[],
): ExportedMessageRepositoryItem[] => {
  return messages
    .map(decodeAuiV1OrV0Message)
    .filter((message): message is ExportedMessageRepositoryItem => !!message);
};
