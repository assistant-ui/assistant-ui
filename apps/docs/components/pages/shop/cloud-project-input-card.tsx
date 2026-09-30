"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircleIcon, LogInIcon, PencilLineIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NoteField,
  SubmitRow,
  fieldClassName,
  getHttpsUrl,
  inputCardClassName,
  tileClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
import { useWizardFormId } from "@/components/pages/shop/wizard-actions";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import { useCloudProjects } from "@/lib/cloud-projects-client";
import { inputPrompt, type Checkout } from "@/lib/checkout/protocol";
import { CLOUD_URL } from "@/lib/constants";
import { useSession } from "@/lib/session";

const OWN = "\0own";

/** A text question asking which Assistant Cloud project an app should use, answered with its Frontend API URL, which the browser can pick from the visitor's account. A match replaces the free-text field with one that takes only an https URL, so the pattern names the project or its URL, never Assistant Cloud alone. */
export const asksForCloudProject = (input: Checkout.Input) =>
  input.kind === "text" &&
  /assistant cloud project|frontend api url|assistant-api\.com/i.test(
    `${input.prompt} ${input.placeholder ?? ""}`,
  );

/** The origin a pasted Frontend API URL names, or `undefined` unless it is an https URL. */
export const frontendUrlOf = (text: string) => getHttpsUrl(text.trim())?.origin;

export function CloudProjectInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const session = useSession();
  const pathname = usePathname() ?? "/";
  const listing = useCloudProjects(session.status === "signed-in");
  const projects = listing.status === "ready" ? listing.projects : [];
  const organizations = new Set(
    projects.map((project) => project.organization),
  );
  const [picked, setPicked] = useState<string | undefined>(
    input.default ? OWN : undefined,
  );
  const [url, setUrl] = useState(input.default ?? "");
  const [note, setNote] = useState("");
  const { busy, answer, dismiss } = useInputActions(input, checkout);
  const chosen = projects.find((project) => project.id === picked);
  const loading = session.status === "loading" || listing.status === "loading";
  const typing = !loading && (projects.length === 0 || picked === OWN);
  const value =
    chosen?.frontendUrl ?? (typing ? frontendUrlOf(url) : undefined);
  const signingIn = session.status === "anonymous";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value === undefined) return;
    void answer(value, note);
  };
  return (
    <form
      id={useWizardFormId()}
      onSubmit={submit}
      className={inputCardClassName}
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-3">
        <legend className="sr-only">{inputPrompt(input)}</legend>
        {signingIn ? (
          <div className="bg-muted flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
            <p className="text-sm">Sign in to pick one of your projects.</p>
            <a
              href={`/api/auth/login?redirect=${encodeURIComponent(pathname)}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <LogInIcon data-icon="inline-start" />
              Sign in
            </a>
          </div>
        ) : null}
        {loading ? (
          <p
            role="status"
            className="text-muted-foreground flex items-center gap-2 text-sm"
          >
            <LoaderCircleIcon
              aria-hidden="true"
              className="size-4 shrink-0 motion-safe:animate-spin"
            />
            Looking for your projects…
          </p>
        ) : null}
        {projects.length > 0 ? (
          <div className="flex flex-col gap-2">
            {projects.map((project) => {
              const active = picked === project.id;
              return (
                <label key={project.id} className={tileClassName(active)}>
                  <input
                    type="radio"
                    name={input.id}
                    value={project.id}
                    checked={active}
                    onChange={() => setPicked(project.id)}
                    className="sr-only"
                  />
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block text-sm font-medium">
                      {project.name}
                      {organizations.size > 1 ? (
                        <span className="text-muted-foreground font-normal">
                          {" · "}
                          {project.organization}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block font-mono text-xs leading-snug">
                      {project.frontendUrl}
                    </span>
                  </span>
                </label>
              );
            })}
            <label className={tileClassName(picked === OWN)}>
              <input
                type="radio"
                name={input.id}
                value={OWN}
                checked={picked === OWN}
                onChange={() => setPicked(OWN)}
                className="sr-only"
              />
              <PencilLineIcon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Another project
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                  Paste its Frontend API URL
                </span>
              </span>
            </label>
          </div>
        ) : null}
        {typing ? (
          <div className={fieldClassName}>
            <Input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={
                input.placeholder ?? "https://proj-<id>.assistant-api.com"
              }
              aria-label="Frontend API URL"
              autoFocus={!signingIn && projects.length === 0}
            />
            {projects.length === 0 ? (
              <p className="text-muted-foreground">
                {listing.status === "ready"
                  ? "Your account has no projects yet. "
                  : null}
                Copy it from{" "}
                <a
                  href={CLOUD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  cloud.assistant-ui.com
                </a>{" "}
                under Settings › General.
              </p>
            ) : null}
          </div>
        ) : null}
        {loading ? null : <NoteField value={note} onChange={setNote} />}
      </fieldset>
      <SubmitRow
        input={input}
        busy={busy}
        disabled={value === undefined}
        onDismiss={dismiss}
      />
    </form>
  );
}
