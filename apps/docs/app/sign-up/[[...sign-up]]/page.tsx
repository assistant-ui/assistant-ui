"use client";

import { SignUp } from "@clerk/nextjs";
import { AI_BUILDER_RETURN_PATH } from "@/lib/ai-builder-routes";

export default function SignUpPage() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-6">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl={AI_BUILDER_RETURN_PATH}
      />
    </main>
  );
}
