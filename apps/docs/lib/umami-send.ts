const UMAMI_SEND = "https://assistant-ui-umami.vercel.app/api/send";

// Crawlers still probe the retired GET endpoint; only the tracker's POST reaches Umami.
export const GET = () => new Response(null, { status: 204 });
export const HEAD = GET;

export const POST = async (request: Request) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  return fetch(UMAMI_SEND, {
    method: "POST",
    headers,
    body: await request.arrayBuffer(),
  });
};
