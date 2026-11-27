import { threads } from "@/lib/db";

export async function GET() {
  return Response.json(threads.list());
}

export async function POST() {
  const id = crypto.randomUUID();
  threads.create(id);
  return Response.json({ id });
}
