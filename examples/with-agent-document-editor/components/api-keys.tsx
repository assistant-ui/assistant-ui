"use client";

import { KeyRoundIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  setApiKeys,
  useApiKeys,
  useServerProviders,
  type ApiKeys as SavedKeys,
} from "@/lib/api-keys";
import { PROVIDERS } from "@/lib/models";

function ApiKeysForm({ onDone }: { onDone: () => void }) {
  const saved = useApiKeys();
  const serverProviders = useServerProviders();
  const [draft, setDraft] = useState<SavedKeys>(saved);

  const save = (event: FormEvent) => {
    event.preventDefault();
    setApiKeys(draft);
    onDone();
  };

  const removeAll = () => {
    setApiKeys({});
    setDraft({});
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      {PROVIDERS.map((provider) => {
        const status = saved[provider.id]
          ? "Saved in this browser"
          : serverProviders?.includes(provider.id)
            ? "Set on the server"
            : "Not set";
        return (
          <div key={provider.id} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor={`api-key-${provider.id}`}>{provider.name}</Label>
              <span className="text-muted-foreground text-xs">{status}</span>
            </div>
            <Input
              id={`api-key-${provider.id}`}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.placeholder}
              value={draft[provider.id] ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, [provider.id]: event.target.value })
              }
              className="font-mono text-xs"
            />
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={Object.keys(saved).length === 0}
          onClick={removeAll}
        >
          Remove all
        </Button>
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}

export function ApiKeys() {
  const saved = useApiKeys();
  const [open, setOpen] = useState(false);
  const hasKeys = Object.keys(saved).length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={hasKeys ? "API keys, saved" : "API keys"}
            className="relative rounded-full"
          />
        }
      >
        <KeyRoundIcon />
        {hasKeys && (
          <span
            aria-hidden
            className="ring-background absolute end-0 top-0 size-2 rounded-full bg-emerald-500 ring-2"
          />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 gap-3 p-4">
        <PopoverHeader>
          <PopoverTitle>API keys</PopoverTitle>
          <PopoverDescription>
            Kept in this browser. Sent only to this app's own server, with each
            message.
          </PopoverDescription>
        </PopoverHeader>
        <ApiKeysForm onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
