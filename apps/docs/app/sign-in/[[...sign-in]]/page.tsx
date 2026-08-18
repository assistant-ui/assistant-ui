"use client";

import { SignIn } from "@clerk/nextjs";
import { AI_BUILDER_RETURN_PATH } from "@/lib/ai-builder-routes";

export default function SignInPage() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-6">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={AI_BUILDER_RETURN_PATH}
      />
    </main>
  );
}
