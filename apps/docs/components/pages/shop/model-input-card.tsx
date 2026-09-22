"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  CheckIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  OctagonAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  NoteField,
  SubmitRow,
  inputCardClassName,
  useInputActions,
} from "@/components/pages/shop/input-shared";
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

export function ModelInputCard({
  input,
  checkout,
  inSheet = false,
}: {
  input: Checkout.Input;
  checkout: CheckoutContextValue;
  inSheet?: boolean;
}) {
  const options = (input.options ?? []).filter((option) =>
    getModelProvider(option.id),
  );
  const [providerId, setProviderId] = useState(
    input.default ?? options[0]?.id ?? "",
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState<ReasoningEffort | "default">("default");
  const [note, setNote] = useState("");
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const providerIdRef = useRef(providerId);
  const apiKeyRef = useRef(apiKey);
  const { busy, answerWithSecret, dismiss } = useInputActions(input, checkout);
  const listId = useId();

  const provider = getModelProvider(providerId);
  const option = options.find((entry) => entry.id === providerId);
  const models = test.status === "ok" ? test.models : [];
  const chosenModel = model.trim() || provider?.defaultModel || "";
  const complete =
    provider !== undefined && apiKey.trim() !== "" && chosenModel !== "";

  const chooseProvider = (id: string | null) => {
    if (id === null || id === providerId) return;
    providerIdRef.current = id;
    apiKeyRef.current = "";
    setProviderId(id);
    setApiKey("");
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
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!complete) return;
    const payload: Checkout.ModelAnswer = {
      provider: provider.id,
      model: chosenModel,
      ...(effort !== "default" &&
        provider.reasoning && {
          reasoningEffort: effort,
        }),
    };
    void answerWithSecret(JSON.stringify(payload), apiKey.trim(), note);
  };

  const form = (
    <form onSubmit={submit} className={inputCardClassName}>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <legend className="max-w-full text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
          {input.prompt}
        </legend>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Provider</span>
          <Select
            value={providerId}
            onValueChange={chooseProvider}
            items={options.map((entry) => ({
              value: entry.id,
              label: entry.label,
            }))}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue>
                {option ? (
                  <>
                    {option.icon ? (
                      <ChoiceIcon icon={option.icon} className="size-4" />
                    ) : null}
                    {option.label}
                  </>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {options.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.icon ? (
                    <ChoiceIcon icon={entry.icon} className="size-4" />
                  ) : null}
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {provider ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor={`${listId}-key`} className="text-muted-foreground">
              API key
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="flex-1 font-mono"
              />
              <Button
                type="button"
                variant="outline"
                disabled={apiKey.trim() === "" || test.status === "testing"}
                onClick={runTest}
              >
                {test.status === "testing" ? (
                  <LoaderCircleIcon
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : null}
                Test
              </Button>
            </div>
            {test.status !== "idle" && test.status !== "testing" ? (
              <p
                role="status"
                className={cn(
                  "flex items-start gap-1.5 text-sm",
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
              <p className="text-muted-foreground text-sm">
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
          </div>
        ) : null}

        {provider ? (
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
                <datalist id={`${listId}-models`}>
                  {models.map((id) => (
                    <option key={id} value={id} />
                  ))}
                </datalist>
              ) : null}
              <p className="text-muted-foreground text-sm">
                {models.length > 0
                  ? `${models.length} models available on this key.`
                  : "Test the key to list its models."}
              </p>
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
        ) : null}

        <NoteField value={note} onChange={setNote} />
      </fieldset>

      {input.help ? <InputHelp help={input.help} /> : null}

      <SubmitRow
        input={input}
        busy={busy}
        disabled={!complete}
        onDismiss={dismiss}
      />
    </form>
  );
  if (!inSheet) return form;
  return (
    <Sheet>
      <div className="flex flex-col items-start gap-3 py-1">
        <p className="text-[0.9375rem] font-medium [overflow-wrap:anywhere]">
          {input.prompt}
        </p>
        <p className="text-muted-foreground text-sm">
          Choose a provider and model, then add your API key.
        </p>
        <SheetTrigger
          render={<Button variant="outline" />}
          disabled={checkout.degraded}
        >
          Configure model
        </SheetTrigger>
      </div>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:data-[side=right]:max-w-lg">
        <SheetHeader className="border-foreground/10 shrink-0 border-b p-5">
          <SheetTitle>Configure model</SheetTitle>
          <SheetDescription>
            Your selection is shared with your agent. Your API key is sent to
            this setup session, where the agent's CLI writes it to your env
            file. It never enters the chat.
          </SheetDescription>
        </SheetHeader>
        <fieldset
          disabled={checkout.degraded}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5"
        >
          {form}
        </fieldset>
      </SheetContent>
    </Sheet>
  );
}
