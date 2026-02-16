// Re-export from @assistant-ui/core
export type { AttachmentAdapter } from "@assistant-ui/core";
export {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  CompositeAttachmentAdapter,
} from "@assistant-ui/core";

// React-specific (depends on assistant-cloud)
export { CloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";
