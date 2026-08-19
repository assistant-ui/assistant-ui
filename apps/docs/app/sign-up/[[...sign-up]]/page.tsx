import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    return (
      <main className="bg-background flex min-h-dvh items-center justify-center p-6 text-center">
        <p>Sign-up is not configured for this deployment.</p>
      </main>
    );
  }

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center p-6">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </main>
  );
}
