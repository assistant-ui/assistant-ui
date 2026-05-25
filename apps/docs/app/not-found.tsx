"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { useEffect, useState } from "react";

const TITLE = "404 - Page not found";
const MESSAGE =
  "I couldn't find the page you're looking for. It might have been moved or doesn't exist.";

export default function NotFound() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanGoBack(
      window.history.length > 1 &&
        document.referrer.startsWith(window.location.origin),
    );

    const assistantTimer = setTimeout(() => setShowAssistant(true), 600);

    return () => clearTimeout(assistantTimer);
  }, []);

  useEffect(() => {
    if (!showAssistant) return;

    let titleIndex = 0;
    const titleInterval = setInterval(() => {
      if (titleIndex <= TITLE.length) {
        setDisplayedTitle(TITLE.slice(0, titleIndex));
        titleIndex++;
      } else {
        clearInterval(titleInterval);

        let messageIndex = 0;
        const messageInterval = setInterval(() => {
          if (messageIndex <= MESSAGE.length) {
            setDisplayedMessage(MESSAGE.slice(0, messageIndex));
            messageIndex++;
          } else {
            clearInterval(messageInterval);
            setTimeout(() => setShowActions(true), 300);
          }
        }, 15);
      }
    }, 25);

    return () => clearInterval(titleInterval);
  }, [showAssistant]);

  return (
    <main className="flex h-dvh min-h-0 flex-col items-center justify-center overflow-hidden px-4">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex justify-end duration-500">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm">
              Take me to <code className="font-mono">{url}</code>
            </p>
          </div>
        </div>

        {showAssistant && (
          <div className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex items-start gap-3 duration-500">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Image
                src="/favicon/icon.svg"
                alt="assistant-ui"
                width={16}
                height={16}
                className="dark:hue-rotate-180 dark:invert"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                assistant-ui
              </span>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <p className="text-sm font-medium">
                  {displayedTitle}
                  {displayedTitle.length < TITLE.length && (
                    <span className="bg-foreground ml-0.5 inline-block h-4 w-0.5 animate-pulse" />
                  )}
                </p>
                {displayedTitle.length === TITLE.length && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {displayedMessage}
                    {displayedMessage.length < MESSAGE.length && (
                      <span className="bg-muted-foreground ml-0.5 inline-block h-3 w-0.5 animate-pulse" />
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {showActions && (
          <div className="fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex flex-col gap-2 pl-11 duration-500">
            {canGoBack && (
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-muted/30 hover:bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
              >
                <div className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md shadow-sm">
                  <ArrowLeft className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 text-left">
                  <span className="truncate text-sm font-medium">Go back</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Return to previous page
                  </span>
                </div>
              </button>
            )}
            <Link
              href="/"
              className="bg-muted/30 hover:bg-muted/50 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
            >
              <div className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md shadow-sm">
                <Home className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">Home</span>
                <span className="text-muted-foreground truncate text-xs">
                  Go to homepage
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
