export const POST = async (req: Request) => {
  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  // remove the most recent user question
  const { content: question, role } = messages.pop()!;
  if (role !== "user" || !question) throw new Error("No question provided");

  return fetch(process.env["ENTELLIGENCE_API_URL"]!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      history: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      question,
      vectorDBUrl: "Yonom&assistant-ui",
      advancedAgent: false,
    }),
  });
};
