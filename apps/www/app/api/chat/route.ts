import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env["MDB_API_KEY"],
  baseURL: "https://llm.mdb.ai/",
});

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      ...messages,
    ],
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
