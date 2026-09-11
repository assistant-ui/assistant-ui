import { appBuilderAgent } from "./agents";
import { createXuluxChatHandler } from "./handler";

export const maxDuration = 800;
export const POST = createXuluxChatHandler(appBuilderAgent);
