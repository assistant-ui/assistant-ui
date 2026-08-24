import { learnAgent } from "../../chat/agents";
import { createXuluxChatHandler } from "../../chat/handler";

export const maxDuration = 800;
export const POST = createXuluxChatHandler(learnAgent);
