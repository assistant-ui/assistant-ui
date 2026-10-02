import { CheckoutHost } from "setup-agent/host";
import {
  StatewireDurableObject,
  routeStatewireRequest,
} from "@statewire/cloudflare";

type Env = { CHECKOUT: StatewireDurableObject.Namespace };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Statewire-Client-Id, Statewire-Lease",
  "Access-Control-Expose-Headers": "Statewire-Lease",
};

const withCors = (response: Response) => {
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
};

const SECRET_PATH = /\/secret\/([^/]+)$/;

// Secrets never enter the statewire state the agent reads. The browser puts a
// key here and the CLI's "env" command takes it once and writes it to a file.
export class CheckoutDO extends StatewireDurableObject<Env>((restored) =>
  CheckoutHost(restored),
) {
  override async onRequest(request: Request): Promise<Response> {
    const match = SECRET_PATH.exec(new URL(request.url).pathname);
    if (match === null) return super.onRequest(request);
    const key = `secret:${decodeURIComponent(match[1]!)}`;
    if (request.method === "PUT") {
      const value = await request.text();
      if (value === "") return new Response("empty secret", { status: 400 });
      await this.ctx.storage.put(key, value);
      return new Response(null, { status: 204 });
    }
    if (request.method === "GET") {
      const value = await this.ctx.storage.get<string>(key);
      if (value === undefined)
        return new Response("no secret", { status: 404 });
      await this.ctx.storage.delete(key);
      return new Response(value, { headers: { "content-type": "text/plain" } });
    }
    return new Response(null, { status: 405, headers: { Allow: "GET, PUT" } });
  }
}

export default {
  fetch: async (request: Request, env: Env) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    url.pathname = `/checkout${url.pathname}`;
    const response = await routeStatewireRequest(
      new Request(url, request),
      env,
    );
    return withCors(response ?? new Response("Not found", { status: 404 }));
  },
};
