import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: Request) {
  const formData = await req.formData();
  const audioFile = formData.get("audio") as File;

  if (!audioFile) {
    return new Response("No audio file provided", { status: 400 });
  }

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "text",
  });

  return Response.json({ text: transcription });
}
