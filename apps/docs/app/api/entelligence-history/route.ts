export const POST = async (req: Request) => {
  await fetch(process.env["ENTELLIGENCE_HISTORY_API_URL"]!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: await req.text(),
  });

  return new Response("OK");
};
