import { z } from "zod";
import { threads } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const ThreadPatch = z.object({
  title: z.string().optional(),
  status: z.enum(["regular", "archived"]).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const thread = threads.get((await params).id);
  if (!thread) return new Response(null, { status: 404 });
  return Response.json(thread);
}

export async function PATCH(req: Request, { params }: Params) {
  threads.update((await params).id, ThreadPatch.parse(await req.json()));
  return new Response(null, { status: 204 });
}

export async function DELETE(_req: Request, { params }: Params) {
  threads.delete((await params).id);
  return new Response(null, { status: 204 });
}
