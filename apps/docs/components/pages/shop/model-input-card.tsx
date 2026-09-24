"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  LockIcon,
  OctagonAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChoiceIcon,
  InputHelp,
  InputLinks,
  NoteField,
  SubmitRow,
  inputCardClassName,
  inputLinkClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
import {
  useWizardFormId,
  useWizardNext,
} from "@/components/pages/shop/wizard-actions";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import type { Checkout } from "@/lib/checkout/protocol";
import {
  REASONING_EFFORTS,
  getModelProvider,
  testProviderKey,
  type KeyTest,
  type ReasoningEffort,
} from "@/lib/checkout/providers";
import { cn } from "@/lib/utils";

type TestState = { status: "idle" } | { status: "testing" } | KeyTest;

const TEST_COPY: Record<KeyTest["status"], string> = {
  ok: "The key works.",
  unauthorized: "The provider rejected this key.",
  unreachable:
    "Could not reach the provider from the browser. Your agent will check the key when it uses it.",
};

const FEATURED_PROVIDERS = ["openai", "anthropic"];

type Step = "provider" | "key" | "model";
const STEPS: readonly Step[] = ["provider", "key", "model"];

export function ModelInputCard({
  input,
  checkout,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
}) {
  const options = (input.options ?? []).filter((option) =>
    getModelProvider(option.id),
  );
  const featured = options.filter((option) =>
    FEATURED_PROVIDERS.includes(option.id),
  );
  const others = options.filter(
    (option) => !FEATURED_PROVIDERS.includes(option.id),
  );
  const [step, setStep] = useState<Step>("provider");
  const [providerId, setProviderId] = useState(
    input.default ?? options[0]?.id ?? "",
  );
  const [apiKey, setApiKey] = useState("");
  const [keySkipped, setKeySkipped] = useState(false);
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState<ReasoningEffort | "default">("default");
  const [note, setNote] = useState("");
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const providerIdRef = useRef(providerId);
  const apiKeyRef = useRef(apiKey);
  const { busy, answer, answerWithSecret, dismiss } = useInputActions(
    input,
    checkout,
  );
  const listId = useId();

  const provider = getModelProvider(providerId);
  const option = options.find((entry) => entry.id === providerId);
  const otherChosen = others.some((entry) => entry.id === providerId);
  const models = test.status === "ok" ? test.models : [];
  const chosenModel = model.trim() || provider?.defaultModel || "";
  const tested = test.status !== "idle" && test.status !== "testing";

  const chooseProvider = (id: string | null) => {
    if (id === null || id === providerId) return;
    providerIdRef.current = id;
    apiKeyRef.current = "";
    setProviderId(id);
    setApiKey("");
    setKeySkipped(false);
    setModel("");
    setTest({ status: "idle" });
  };

  const runTest = async () => {
    if (!provider || apiKey.trim() === "") return;
    const requestedProviderId = providerId;
    const requestedApiKey = apiKey;
    setTest({ status: "testing" });
    const result = await testProviderKey(provider, requestedApiKey.trim());
    if (
      providerIdRef.current !== requestedProviderId ||
      apiKeyRef.current !== requestedApiKey
    ) {
      return;
    }
    setTest(result);
    if (result.status === "ok") setStep("model");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === "provider") {
      if (provider) setStep("key");
      return;
    }
    if (step === "key") {
      void runTest();
      return;
    }
    if (!provider || chosenModel === "") return;
    const payload = JSON.stringify({
      provider: provider.id,
      model: chosenModel,
      ...(effort !== "default" &&
        provider.reasoning && {
          reasoningEffort: effort,
        }),
    } satisfies Checkout.ModelAnswer);
    if (keySkipped) void answer(payload, note);
    else void answerWithSecret(payload, apiKey.trim(), note);
  };

  const testing = test.status === "testing";
  const wizard = useWizardNext(
    step === "provider"
      ? { label: "Next", disabled: busy || !provider, submit: true }
      : step === "key"
        ? {
            label: "Test key",
            disabled: busy || apiKey.trim() === "" || testing,
            submit: true,
            back: () => {
              if (!busy) setStep("provider");
            },
          }
        : {
            label: "Next",
            disabled: busy || chosenModel === "",
            submit: true,
            back: () => {
              if (!busy) setStep("key");
            },
          },
  );

  const tileClassName = (active: boolean) =>
    cn(
      "has-focus-visible:ring-ring flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors has-focus-visible:ring-2",
      active
        ? "border-foreground bg-foreground/[0.04]"
        : "border-foreground/10 hover:border-foreground/30",
    );

  return (
    <form
      id={useWizardFormId()}
      onSubmit={submit}
      className={inputCardClassName}
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <legend className="max-w-full text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
          {input.prompt}
        </legend>
        <p className="text-muted-foreground text-sm tabular-nums">
          Step {STEPS.indexOf(step) + 1} of {STEPS.length}
          {step !== "provider" && option ? ` · ${option.label}` : ""}
          {step === "model"
            ? keySkipped
              ? " · no key"
              : test.status === "ok"
                ? " · key tested"
                : " · key not verified"
            : ""}
        </p>

        {step === "provider" ? (
          <div className="flex flex-col gap-3">
            <div
              role="radiogroup"
              aria-label="Provider"
              className="grid grid-cols-3 gap-2"
            >
              {featured.map((entry) => (
                <label
                  key={entry.id}
                  className={tileClassName(entry.id === providerId)}
                >
                  <input
                    type="radio"
                    name={`${listId}-provider`}
                    checked={entry.id === providerId}
                    onChange={() => chooseProvider(entry.id)}
                    className="sr-only"
                  />
                  {entry.icon ? (
                    <ChoiceIcon icon={entry.icon} className="size-4 shrink-0" />
                  ) : null}
                  {entry.label}
                </label>
              ))}
              {others.length > 0 ? (
                <label className={tileClassName(otherChosen)}>
                  <input
                    type="radio"
                    name={`${listId}-provider`}
                    checked={otherChosen}
                    onChange={() => chooseProvider(others[0]!.id)}
                    className="sr-only"
                  />
                  Other
                </label>
              ) : null}
            </div>
            {otherChosen ? (
              <Select
                value={providerId}
                onValueChange={chooseProvider}
                items={others.map((entry) => ({
                  value: entry.id,
                  label: entry.label,
                }))}
              >
                <SelectTrigger aria-label="Other provider" className="w-full">
                  <SelectValue>
                    {option?.icon ? (
                      <ChoiceIcon icon={option.icon} className="size-4" />
                    ) : null}
                    {option?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  {others.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.icon ? (
                        <ChoiceIcon icon={entry.icon} className="size-4" />
                      ) : null}
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

        {step === "key" && provider ? (
          <div className="flex flex-col gap-2 text-sm">
            <label htmlFor={`${listId}-key`} className="text-muted-foreground">
              API key
            </label>
            <Input
              id={`${listId}-key`}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => {
                apiKeyRef.current = event.target.value;
                setApiKey(event.target.value);
                if (test.status !== "idle") setTest({ status: "idle" });
              }}
              placeholder={provider.envKey}
              className="font-mono"
            />
            {tested ? (
              <p
                role="status"
                className={cn(
                  "flex items-start gap-1.5",
                  test.status === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : test.status === "unauthorized"
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {test.status === "ok" ? (
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <OctagonAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                )}
                {TEST_COPY[test.status]}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {provider.keys.hint}{" "}
                <a
                  href={provider.keys.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground inline-flex items-center gap-1 underline underline-offset-4"
                >
                  Get a key
                  <ExternalLinkIcon className="size-3" />
                </a>
              </p>
            )}
            <p className="text-muted-foreground flex items-start gap-1.5">
              <LockIcon
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
              />
              Never sent in plaintext or shown in the chat. Your agent gets a
              one-time secure token to write {provider.envKey} to its env file.
            </p>
          </div>
        ) : null}

        {step === "model" && provider ? (
          <>
            <div
              className={cn(
                "grid gap-4",
                provider.reasoning && "sm:grid-cols-[minmax(0,1fr)_10rem]",
              )}
            >
              <div className="flex flex-col gap-1.5 text-sm">
                <label
                  htmlFor={`${listId}-model`}
                  className="text-muted-foreground"
                >
                  Model
                </label>
                <Input
                  id={`${listId}-model`}
                  list={models.length > 0 ? `${listId}-models` : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder={
                    provider.defaultModel ??
                    (models.length > 0
                      ? "Pick or type a model"
                      : "Type a model id")
                  }
                  className="font-mono"
                />
                {models.length > 0 ? (
                  <>
                    <datalist id={`${listId}-models`}>
                      {models.map((id) => (
                        <option key={id} value={id} />
                      ))}
                    </datalist>
                    <p className="text-muted-foreground text-sm">
                      {models.length} models available on this key.
                    </p>
                  </>
                ) : null}
              </div>
              {provider.reasoning ? (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted-foreground">Reasoning</span>
                  <Select
                    value={effort}
                    onValueChange={(value) => {
                      if (value !== null) setEffort(value);
                    }}
                    items={REASONING_EFFORTS.map((entry) => ({
                      value: entry.id,
                      label: entry.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {REASONING_EFFORTS.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              ) : null}
            </div>
            <NoteField value={note} onChange={setNote} />
          </>
        ) : null}
      </fieldset>

      {step === "provider" && input.help ? (
        <InputHelp help={input.help} />
      ) : null}

      {wizard ? (
        step === "key" ? (
          <InputLinks input={input} busy={busy} onDismiss={dismiss}>
            {tested && test.status !== "ok" ? (
              <button
                type="button"
                onClick={() => setStep("model")}
                className={inputLinkClassName}
              >
                Continue anyway
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setKeySkipped(true);
                setStep("model");
              }}
              className={inputLinkClassName}
            >
              Skip, I’ll add it myself
            </button>
          </InputLinks>
        ) : step === "model" ? (
          <InputLinks input={input} busy={busy} onDismiss={dismiss} />
        ) : null
      ) : step === "model" ? (
        <div className="flex items-end gap-2">
          <SubmitRow
            input={input}
            busy={busy}
            disabled={chosenModel === ""}
            onDismiss={dismiss}
          />
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setStep("key")}
          >
            Back
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {step === "provider" ? (
            <Button type="submit" disabled={!provider}>
              Continue
            </Button>
          ) : (
            <>
              <Button type="submit" disabled={apiKey.trim() === "" || testing}>
                {testing ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                Test key
              </Button>
              {tested && test.status !== "ok" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("model")}
                >
                  Continue anyway
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setKeySkipped(true);
                  setStep("model");
                }}
              >
                Skip, I’ll add it myself
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("provider")}
              >
                Back
              </Button>
            </>
          )}
        </div>
      )}
    </form>
  );
}
