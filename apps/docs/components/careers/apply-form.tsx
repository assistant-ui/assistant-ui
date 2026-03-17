"use client";

import { FormEvent, useCallback, useState } from "react";

interface ApplyFormProps {
  roleTitle: string;
}

export const ApplyForm = ({ roleTitle }: ApplyFormProps) => {
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [mailtoHref, setMailtoHref] = useState("");
  const [composedBody, setComposedBody] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);

      const fullName = (formData.get("full_name") as string)?.trim() ?? "";
      const urlsRaw = (formData.get("urls") as string)?.trim() ?? "";
      const notes = (formData.get("notes") as string)?.trim() ?? "";

      const urlLines = urlsRaw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`);

      const bodyLines = [
        "Hello,",
        "",
        `I am applying for the ${roleTitle} role.`,
        "",
        "Here are a few interesting links to showcase my profile:",
        urlLines.length ? urlLines.join("\n") : "-",
      ];

      if (notes) {
        bodyLines.push("", notes);
      }

      bodyLines.push("", "Best,", fullName || "");

      const body = bodyLines.join("\n");

      const mailto = `mailto:careers@assistant-ui.com?subject=${encodeURIComponent(
        `Application: ${roleTitle}`,
      )}&body=${encodeURIComponent(body)}`;

      // Attempt to open the user's default mail client.
      // If it doesn't open (no handler configured), reveal fallbacks.
      setComposedBody(body);
      setMailtoHref(mailto);
      setFallbackVisible(true);
      try {
        window.location.href = mailto;
      } catch {
        // No-op: rely on the fallback UI
      }
    },
    [roleTitle],
  );

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-foreground">Full Name</span>
        <input
          type="text"
          name="full_name"
          required
          autoComplete="name"
          className="rounded-lg border border-border bg-background px-3 py-2 text-base shadow-sm outline-none ring-0 transition focus:border-primary"
          placeholder="Ada Lovelace"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-foreground">
          URLs that best describe you
        </span>
        <textarea
          name="urls"
          required
          rows={3}
          className="rounded-lg border border-border bg-background px-3 py-2 text-base shadow-sm outline-none ring-0 transition focus:border-primary"
          placeholder="Portfolio, GitHub, LinkedIn, blog – one per line"
        ></textarea>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-foreground">
          Anything else?{" "}
          <span className="text-muted-foreground">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-base shadow-sm outline-none ring-0 transition focus:border-primary"
          placeholder="Tell us about goals, timelines, or anything you'd like us to know."
        ></textarea>
      </label>

      <button
        type="submit"
        className="inline-flex w-fit items-center justify-center rounded-full border border-border px-5 py-2 font-medium text-foreground text-sm transition hover:border-primary hover:bg-primary/5 hover:text-primary"
      >
        Apply now
      </button>

      {fallbackVisible ? (
        <div className="mt-2 grid gap-2 rounded-lg border border-border/70 border-dashed bg-background/50 p-3">
          <p className="text-muted-foreground text-xs">
            If your email client didn&apos;t open, use the options below.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mailtoHref}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-1.5 font-medium text-foreground text-xs transition hover:border-primary hover:bg-primary/5 hover:text-primary"
            >
              Open email client
            </a>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-1.5 font-medium text-foreground text-xs transition hover:border-primary hover:bg-primary/5 hover:text-primary"
              onClick={async () => {
                try {
                  const text = `To: careers@assistant-ui.com
Subject: Application: ${roleTitle}

${composedBody}`;
                  await navigator.clipboard.writeText(text);
                  setCopyStatus("success");
                  setTimeout(() => setCopyStatus("idle"), 2000);
                } catch {
                  setCopyStatus("error");
                  setTimeout(() => setCopyStatus("idle"), 2000);
                }
              }}
            >
              Copy email text
            </button>
            <span className="text-muted-foreground text-xs">
              {copyStatus === "success"
                ? "Copied!"
                : copyStatus === "error"
                  ? "Copy failed"
                  : ""}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Or email{" "}
            <span className="font-medium text-foreground">
              careers@assistant-ui.com
            </span>{" "}
            with the subject &quot;Application: {roleTitle}&quot;.
          </p>
        </div>
      ) : null}
    </form>
  );
};
