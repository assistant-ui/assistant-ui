export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  // remove the most recent user question
  const { content: question, role } = messages.pop()!;
  if (role !== "user" || !question) throw new Error("No question provided");

  const history = messages.reduce(
    (pairs, msg, i, arr) => {
      const next = arr[i + 1];
      if (msg.role === "user" && next?.role === "assistant") {
        pairs.push([msg.content, next.content]);
      }
      return pairs;
    },
    [] as [string, string][],
  );

  return fetch(process.env["ENTELLIGENCE_API_URL"]!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env["ENTELLIGENCE_API_KEY"]}`,
    },
    body: JSON.stringify({
      history,
      question,
      vectorDBUrl: "Yonom&assistant-ui",
      advancedAgent: false,
      githubUsername: "Yonom",
    }),
  });
};
