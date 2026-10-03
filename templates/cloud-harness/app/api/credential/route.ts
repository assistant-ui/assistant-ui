import { AssistantCloud } from "assistant-cloud";

export const GET = async () => {
  const cloud = new AssistantCloud({
    baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
    apiKey: process.env.ASSISTANT_API_KEY!,
    workspaceId: process.env.NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID!,
    userId: "hackathon",
  });
  const credential = await cloud.auth.tokens.create();
  return Response.json(credential, {
    headers: { "Cache-Control": "no-store" },
  });
};
