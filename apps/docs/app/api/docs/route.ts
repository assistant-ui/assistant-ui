import { NextResponse } from "next/server";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  const query = new URL(request.url).searchParams;
  if (query.get("format") !== "markdown")
    return new Response(null, { status: 400 });
  const slug = (query.get("path") ?? "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return NextResponse.redirect(
    new URL(`/docs${slug ? `/${slug}` : ""}.md`, request.url),
  );
}
