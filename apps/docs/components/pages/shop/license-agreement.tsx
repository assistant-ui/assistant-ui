"use client";

import { useState } from "react";
import { useWizardNext } from "@/components/pages/shop/wizard-actions";
import { cn } from "@/lib/utils";

export const LICENSE_TEXT = `MIT License

Copyright (c) 2025 AgentbaseAI Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const optionClassName = (active: boolean) =>
  cn(
    "has-focus-visible:ring-ring flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors has-focus-visible:ring-2",
    active
      ? "border-foreground bg-foreground/[0.04]"
      : "border-foreground/10 hover:border-foreground/30",
  );

export function LicenseAgreement({
  accepted,
  onAccept,
}: {
  accepted: boolean;
  onAccept: () => void;
}) {
  const [choice, setChoice] = useState<"accept" | "decline" | undefined>(
    accepted ? "accept" : undefined,
  );
  useWizardNext({
    label: "Next",
    disabled: choice !== "accept",
    onClick: onAccept,
  });
  return (
    <div className="flex flex-col gap-4">
      <div
        role="region"
        aria-label="License agreement"
        tabIndex={0}
        className="border-foreground/15 bg-background focus-visible:ring-ring h-44 overflow-y-auto rounded-lg border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap focus-visible:ring-2 focus-visible:outline-none"
      >
        {LICENSE_TEXT}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">
          Do you accept the license agreement?
        </legend>
        <label className={optionClassName(choice === "accept")}>
          <input
            type="radio"
            name="license"
            value="accept"
            checked={choice === "accept"}
            onChange={() => setChoice("accept")}
            className="accent-foreground size-4"
          />
          I accept the terms of the license agreement
        </label>
        <label className={optionClassName(choice === "decline")}>
          <input
            type="radio"
            name="license"
            value="decline"
            checked={choice === "decline"}
            onChange={() => setChoice("decline")}
            className="accent-foreground size-4"
          />
          I do not accept the terms of the license agreement
        </label>
      </fieldset>
      {choice === "decline" ? (
        <p role="status" className="text-muted-foreground text-sm">
          Setup cannot continue without accepting the agreement. You can cancel
          the setup below.
        </p>
      ) : null}
    </div>
  );
}
