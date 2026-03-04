"use client";

import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <MessagesSquare className="size-4" />
          </div>
          <span className="font-semibold">assistant-ui</span>
        </div>

        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton>
              <Button variant="ghost" size="sm" aria-label="Sign in">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button variant="outline" size="sm" aria-label="Sign up">
                Sign up
              </Button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            Assistant UI + Clerk Starter
          </h1>

          <p className="max-w-prose text-muted-foreground">
            A starter template for assistant-ui + assistant-cloud with Clerk for
            auth.
          </p>

          <div className="mt-2">
            <Link href="/chat" aria-label="Go to chat">
              <Button>Go to Chat</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
