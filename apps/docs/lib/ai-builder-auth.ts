export function isAiBuilderServerAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.CLERK_SECRET_KEY?.trim(),
  );
}

function isClerkConfigurationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("(code=auth_signature_invalid)") ||
      error.message.includes("Clerk middleware context"))
  );
}

export async function requireAiBuilderUser(): Promise<
  { userId: string } | Response
> {
  if (!isAiBuilderServerAuthConfigured()) {
    return Response.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "AI Builder authentication is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY."
            : "AI Builder authentication is not configured.",
      },
      { status: 503 },
    );
  }

  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
    return { userId };
  } catch (error) {
    const configurationError = isClerkConfigurationError(error);
    console.error(
      configurationError
        ? "[ai-builder-auth] Clerk middleware is not configured for this route"
        : "[ai-builder-auth] Failed to verify the user session",
      error,
    );
    return Response.json(
      configurationError
        ? {
            code: "AUTH_CONFIGURATION_ERROR",
            error: "Authentication is not configured correctly.",
          }
        : {
            code: "AUTH_SERVICE_UNAVAILABLE",
            error: "Authentication is temporarily unavailable.",
          },
      { status: configurationError ? 500 : 503 },
    );
  }
}
