import { z } from "zod";
import { messages, threads } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const StoredMessage = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  format: z.string(),
  content: z.record(z.string(), z.unknown()),
});

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  if (!threads.get(id)) return new Response(null, { status: 404 });
  return Response.json(messages.list(id));
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  if (!threads.get(id)) return new Response(null, { status: 404 });
  const message = StoredMessage.safeParse(await req.json().catch(() => null));
  if (!message.success) return new Response(null, { status: 400 });
  messages.save(id, message.data);
  return new Response(null, { status: 204 });
}
