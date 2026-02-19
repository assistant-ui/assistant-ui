import { CloudMessage } from "assistant-cloud";
import { ExportedMessageRepositoryItem } from "../runtime-cores/utils/MessageRepository";
import { ThreadMessage } from "../../types";
import {
  AuiCodecMessage,
  decodeAuiMessage,
  encodeAuiMessage,
} from "./auiCodec";

type AuiV0Message = AuiCodecMessage;

export function auiV0Encode(message: ThreadMessage): AuiV0Message {
  // TODO attachments are currently intentionally ignored
  // info: ID and createdAt are ignored (we use the server value instead)
  return encodeAuiMessage(message, {
    allowComponent: false,
    formatLabel: "aui/v0",
  });
}

export function auiV0Decode(
  cloudMessage: CloudMessage & { format: "aui/v0" },
): ExportedMessageRepositoryItem {
  return decodeAuiMessage(cloudMessage);
}
