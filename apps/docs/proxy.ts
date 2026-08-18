import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import {
  ANONYMOUS_SESSION_COOKIE,
  ANONYMOUS_SESSION_TTL_SECONDS,
  createAnonymousSessionToken,
  getAnonymousSession,
  getAnonymousSessionSecret,
} from "@/lib/anonymous-session";
import { isAiBuilderServerAuthConfigured } from "@/lib/ai-builder-auth";
import { createSignInUrl } from "@/lib/ai-builder-routes";

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
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

function addAnonymousSession(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (
    (request.method !== "GET" && request.method !== "HEAD") ||
    request.nextUrl.pathname.startsWith("/api/") ||
    getAnonymousSession(request)
  ) {
    return response;
  }

  const secret = getAnonymousSessionSecret();
  if (!secret) return response;
  response.cookies.set(
    ANONYMOUS_SESSION_COOKIE,
    createAnonymousSessionToken({ secret }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ANONYMOUS_SESSION_TTL_SECONDS,
    },
  );
  return response;
}

function publicResponse(request: NextRequest): NextResponse {
  if (isUmamiRead(request)) {
    return new NextResponse(null, { status: 204 });
  }
  return addAnonymousSession(request, NextResponse.next());
}

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  if (isUmamiRead(request)) {
    return new NextResponse(null, { status: 204 });
  }

  if (isProtectedAiBuilderPage(request)) {
    const { userId } = await auth();
    if (!userId) {
      return addAnonymousSession(
        request,
        NextResponse.redirect(createSignInUrl(request.url)),
      );
    }
  }

  return addAnonymousSession(request, NextResponse.next());
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
    return NextResponse.json(
      { error: "AI Builder authentication is not configured." },
      { status: 503 },
    );
  }

  return publicResponse(request);
}
