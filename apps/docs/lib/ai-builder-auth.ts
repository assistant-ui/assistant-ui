export function isAiBuilderServerAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.CLERK_SECRET_KEY?.trim(),
  );
}

export async function requireAiBuilderUser(): Promise<
  { userId: string } | Response
> {
  if (!isAiBuilderServerAuthConfigured()) {
    return Response.json(
      { error: "AI Builder authentication is not configured." },
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
    console.error("[ai-builder-auth] Failed to verify the user session", error);
    return Response.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 },
    );
  }
}
