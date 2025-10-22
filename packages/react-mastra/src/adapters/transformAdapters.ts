import type {
  AttachmentAdapter,
  FeedbackAdapter,
  SpeechSynthesisAdapter,
} from "@assistant-ui/react";
import type { MastraRuntimeConfig } from "../types";
import { v4 as uuidv4 } from "uuid";

/**
 * Helper to convert a File to a data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Transform simplified attachment config into full AttachmentAdapter
 */
export const createAttachmentAdapter = (
  config: NonNullable<MastraRuntimeConfig["adapters"]>["attachments"],
): AttachmentAdapter | undefined => {
  if (!config) return undefined;

  return {
    accept: config.accept ?? "*/*",

    async add({ file }) {
      // Create a pending attachment with proper status
      return {
        id: uuidv4(),
        type: "file" as const,
        name: file.name,
        contentType: file.type,
        file,
        status: {
          type: "running" as const,
          reason: "uploading" as const,
          progress: 0,
        },
      };
    },

    async remove() {
      // No cleanup needed for simple config
      // User can implement their own cleanup if needed
    },

    async send(attachment) {
      // If user provided upload handler, use it
      if (config.onUpload && attachment.file) {
        const url = await config.onUpload(attachment.file);
        return {
          ...attachment,
          content: [
            {
              type: "file" as const,
              filename: attachment.name,
              data: url,
              mimeType: attachment.contentType,
            },
          ],
          status: { type: "complete" as const },
        };
      }

      // Otherwise, convert file to data URL
      const dataUrl = await fileToDataUrl(attachment.file);
      return {
        ...attachment,
        content: [
          {
            type: "file" as const,
            filename: attachment.name,
            data: dataUrl,
            mimeType: attachment.contentType,
          },
        ],
        status: { type: "complete" as const },
      };
    },
  };
};

/**
 * Transform simplified feedback config into full FeedbackAdapter
 */
export const createFeedbackAdapter = (
  config: NonNullable<MastraRuntimeConfig["adapters"]>["feedback"],
): FeedbackAdapter | undefined => {
  if (!config) return undefined;

  return {
    submit({ message, type }) {
      if (type === "positive" && config.onPositive) {
        config.onPositive(message.id);
      } else if (type === "negative" && config.onNegative) {
        config.onNegative(message.id);
      }
    },
  };
};

/**
 * Transform simplified speech config into full SpeechSynthesisAdapter
 */
export const createSpeechAdapter = (
  config: NonNullable<MastraRuntimeConfig["adapters"]>["speech"],
): SpeechSynthesisAdapter | undefined => {
  if (!config) return undefined;

  return {
    speak(text) {
      let currentStatus: SpeechSynthesisAdapter.Status = { type: "starting" };
      const listeners = new Set<() => void>();

      // Start speech
      config.onStart?.();

      // Simulate speech completion (in real implementation, this would use Web Speech API)
      setTimeout(() => {
        currentStatus = { type: "ended", reason: "finished" };
        listeners.forEach((listener) => listener());
        config.onStop?.();
      }, text.length * 50); // Rough estimate based on text length

      return {
        get status() {
          return currentStatus;
        },
        cancel() {
          if (currentStatus.type !== "ended") {
            currentStatus = { type: "ended", reason: "cancelled" };
            listeners.forEach((listener) => listener());
            config.onStop?.();
          }
        },
        subscribe(callback) {
          listeners.add(callback);
          return () => {
            listeners.delete(callback);
          };
        },
      };
    },
  };
};
