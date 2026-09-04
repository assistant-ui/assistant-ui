import Link from "next/link";
import type { ReactNode } from "react";
import { typeEyebrow, typeSection } from "@/components/shared/type";

const REASONS: Record<string, string> = {
  access_denied: "That account is not allowed to sign in here.",
  accounts_unavailable: "The accounts service did not respond. Try again.",
  session_store_error: "The session could not be stored. Try again.",
  invalid_state: "The sign-in link expired. Start again.",
  invalid_request: "The sign-in request was incomplete. Start again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; description?: string }>;
}): Promise<ReactNode> {
  const { reason, description } = await searchParams;
  const message =
    (reason ? REASONS[reason] : undefined) ??
    description ??
    "Sign-in did not complete.";

  return (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-[36rem] flex-col justify-center gap-3 px-6">
      <p className={typeEyebrow}>Sign-in</p>
      <h1 className={typeSection}>{message}</h1>
      {reason ? (
        <p className="text-muted-foreground font-mono text-[12px] [font-variant-ligatures:none]">
          {reason}
        </p>
      ) : null}
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mt-3 w-fit text-[13px] transition-colors"
      >
        Back to assistant-ui
      </Link>
    </main>
  );
}
