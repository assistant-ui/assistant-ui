import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { isAiBuilderServerAuthConfigured } from "@/lib/ai-builder-auth";
import { createSignInUrl } from "@/lib/ai-builder-routes";

export const config = {
  matcher: [
    "/umami/api/send",
    "/playground",
    "/learn/:path*",
    "/api/xulux/:path*",
  ],
};

function isUmamiRead(request: NextRequest): boolean {
  return (
    request.nextUrl.pathname === "/umami/api/send" &&
    (request.method === "GET" || request.method === "HEAD")
  );
}

function isProtectedAiBuilderPage(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl;
  return (
    pathname === "/learn" ||
    pathname.startsWith("/learn/") ||
    (pathname === "/playground" && searchParams.get("mode") === "agent")
  );
}

function publicResponse(request: NextRequest): NextResponse {
  if (isUmamiRead(request)) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.next();
}

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  if (isUmamiRead(request)) {
    return new NextResponse(null, { status: 204 });
  }

  if (isProtectedAiBuilderPage(request)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(createSignInUrl(request.url));
    }
  }

  return NextResponse.next();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isAiBuilderServerAuthConfigured()) {
    return authenticatedProxy(request, event);
  }

  if (isProtectedAiBuilderPage(request)) {
    if (request.nextUrl.pathname === "/playground") {
      return NextResponse.redirect(
        new URL("/playground?mode=builder", request.url),
      );
    }
    return NextResponse.rewrite(new URL("/_not-found", request.url), {
      status: 404,
    });
  }

  return publicResponse(request);
}
