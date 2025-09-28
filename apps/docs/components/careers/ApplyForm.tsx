"use client";

import { FormEvent, useCallback } from "react";

interface ApplyFormProps {
  roleTitle: string;
}

export const ApplyForm = ({ roleTitle }: ApplyFormProps) => {
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

      window.location.href = mailto;
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
          className="rounded-lg border border-border bg-background px-3 py-2 text-base shadow-sm ring-0 transition outline-none focus:border-primary"
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
          className="rounded-lg border border-border bg-background px-3 py-2 text-base shadow-sm ring-0 transition outline-none focus:border-primary"
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
          className="rounded-lg border border-border bg-background px-3 py-2 text-base shadow-sm ring-0 transition outline-none focus:border-primary"
          placeholder="Tell us about goals, timelines, or anything you'd like us to know."
        ></textarea>
      </label>

      <button
        type="submit"
        className="inline-flex w-fit items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary/5 hover:text-primary"
      >
        Apply now
      </button>
    </form>
  );
};
