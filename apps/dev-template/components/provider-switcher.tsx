"use client";

import { useState, useEffect } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { providers, type ProviderType } from "@/lib/providers";
import { cn } from "@/lib/utils";

interface ProviderSwitcherProps {
  currentProvider: ProviderType;
  onProviderChange: (provider: ProviderType) => void;
}

export function ProviderSwitcher({
  currentProvider,
  onProviderChange,
}: ProviderSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [missingEnvVars, setMissingEnvVars] = useState<
    Record<ProviderType, string[]>
  >({} as Record<ProviderType, string[]>);

  useEffect(() => {
    // Check for missing env vars (this runs on client, so we can only check public vars)
    const missing: Record<ProviderType, string[]> = {} as Record<
      ProviderType,
      string[]
    >;

    providers.forEach((provider) => {
      const missingVars = provider.envVars.filter((varName) => {
        // Check specific known public env vars
        if (varName === "NEXT_PUBLIC_ASSISTANT_BASE_URL") {
          return !process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;
        }
        // For non-public vars, we can't check on client side
        // So we don't report them as missing
        return false;
      });
      if (missingVars.length > 0) {
        missing[provider.id] = missingVars;
      }
    });

    setMissingEnvVars(missing);
  }, []);

  const currentProviderConfig = providers.find((p) => p.id === currentProvider);

  return (
    <>
      {/* Floating toggle button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-background border border-border px-3 py-2 text-sm font-medium shadow-lg hover:bg-accent transition-colors"
        >
          Provider: {currentProviderConfig?.name}
        </button>
      </div>

      {/* Floating menu panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu panel */}
          <div className="fixed top-16 right-4 z-50 w-80 rounded-lg bg-background border border-border shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Select Provider</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto p-2">
              {providers.map((provider) => {
                const isSelected = provider.id === currentProvider;
                const hasMissingVars = missingEnvVars[provider.id]?.length > 0;

                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      onProviderChange(provider.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      isSelected && "bg-accent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isSelected && "text-primary"
                            )}
                          >
                            {provider.name}
                          </span>
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {provider.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                            {provider.apiRoute}
                          </span>
                          {hasMissingVars && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                              <span className="text-xs text-amber-500">
                                Missing: {missingEnvVars[provider.id].join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                        {provider.id === "langgraph" && (
                          <div className="mt-1 rounded bg-blue-50 dark:bg-blue-950/20 px-2 py-1">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              ⚠️ Requires server: <code className="font-mono text-[10px]">pnpm langgraph:dev</code>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="border-t px-4 py-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Configure environment variables in .env.local
              </p>
              {currentProvider === "langgraph" && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-2">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> LangGraph requires a running server.
                    <br />
                    Start it with: <code className="font-mono">pnpm langgraph:dev</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}