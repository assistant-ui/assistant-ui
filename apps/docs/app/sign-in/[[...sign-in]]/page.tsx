import { SignIn } from "@clerk/nextjs";
import { AI_BUILDER_RETURN_PATH } from "@/lib/ai-builder-routes";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6 text-center">
        <p>Sign-in is not configured for this deployment.</p>
      </main>
    );
  }

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
