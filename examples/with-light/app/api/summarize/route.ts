import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

type SummaryMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const { messages }: { messages: SummaryMessage[] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "messages 参数错误" }, { status: 400 });
    }

    const conversationText = messages
      .map((message) => `${message.role}: ${message.content}`)
      .join("\n");

    const response = await generateText({
      model: openai("gpt-4.1-mini"),
      system:
        "Please summarize the following dialogue in no more than 100 words, focusing only on what the user truly wants to do, without providing unnecessary explanations.",
      prompt: conversationText,
    });

    return Response.json({
      summary: response.text,
    });
  } catch (error) {
    console.error(error);

    return Response.json({ error: "AI 总结失败" }, { status: 500 });
  }
}
