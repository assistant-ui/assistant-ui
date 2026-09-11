import { createXuluxChatHandler } from "../../../../chat/handler";
import { learnPreviewAgent } from "../../../preview-agent";

export const maxDuration = 30;
export const POST = createXuluxChatHandler(learnPreviewAgent);
