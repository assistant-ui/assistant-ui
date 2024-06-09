import type { ThreadMessage } from "../../utils/AssistantTypes";

export type ContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part: ThreadMessage["content"][number];
}>;
