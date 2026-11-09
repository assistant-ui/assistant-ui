"use client";

import type { ReactNode } from "react";
import {
  ToolFallbackApproval,
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from "@/components/assistant-ui/elements/tool-fallback.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

const noop = () => {};

function Frame({ children }: { children: ReactNode }) {
  return (
    <SampleRuntimeProvider>
      <div className="w-full max-w-lg">{children}</div>
    </SampleRuntimeProvider>
  );
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Running",
    note: "The arguments are still streaming and there is no result yet.",
    Component: () => (
      <Frame>
        <ToolFallbackRoot open onOpenChange={noop}>
          <ToolFallbackTrigger
            toolName="get_weather"
            status={{ type: "running" }}
          />
          <ToolFallbackContent>
            <ToolFallbackArgs argsText={'{\n  "location": "San Fra'} />
          </ToolFallbackContent>
        </ToolFallbackRoot>
      </Frame>
    ),
  },
  {
    key: "requires-action",
    label: "Needs approval",
    note: "The tool waits for the user to allow or deny it before running.",
    Component: () => (
      <Frame>
        <ToolFallbackRoot open onOpenChange={noop}>
          <ToolFallbackTrigger
            toolName="delete_branch"
            status={{ type: "requires-action", reason: "tool-calls" }}
          />
          <ToolFallbackContent>
            <ToolFallbackArgs
              argsText={json({ repo: "acme/web", branch: "feat/old-checkout" })}
            />
            <ToolFallbackApproval
              approval={{
                id: "approve-delete-branch",
                prompt: "Delete feat/old-checkout from acme/web?",
              }}
              status={{ type: "requires-action", reason: "tool-calls" }}
              respondToApproval={async () => {}}
            />
          </ToolFallbackContent>
        </ToolFallbackRoot>
      </Frame>
    ),
  },
  {
    key: "denied",
    label: "Denied",
    note: "The user refused the call, so the receipt records the decision.",
    Component: () => (
      <Frame>
        <ToolFallbackRoot open onOpenChange={noop}>
          <ToolFallbackTrigger
            toolName="send_email"
            status={{ type: "complete" }}
          />
          <ToolFallbackContent>
            <ToolFallbackArgs
              argsText={json({
                to: "all-staff@acme.dev",
                subject: "Office closed Friday",
              })}
            />
            <ToolFallbackApproval
              approval={{
                id: "approve-send-email",
                prompt: "Send this email to all-staff@acme.dev?",
                approved: false,
              }}
              status={{ type: "complete" }}
            />
          </ToolFallbackContent>
        </ToolFallbackRoot>
      </Frame>
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "The tool threw, so the error message shows above the arguments.",
    Component: () => {
      const status = {
        type: "incomplete",
        reason: "error",
        error:
          "ECONNREFUSED 10.0.4.12:5432: database is not accepting connections",
      } as const;
      return (
        <Frame>
          <ToolFallbackRoot open onOpenChange={noop}>
            <ToolFallbackTrigger toolName="run_sql" status={status} />
            <ToolFallbackContent>
              <ToolFallbackError status={status} />
              <ToolFallbackArgs
                argsText={json({
                  query: "SELECT count(*) FROM orders WHERE status = 'open'",
                })}
              />
            </ToolFallbackContent>
          </ToolFallbackRoot>
        </Frame>
      );
    },
  },
  {
    key: "cancelled",
    label: "Cancelled",
    note: "The run stopped before the tool finished, so the call is struck through.",
    Component: () => {
      const status = {
        type: "incomplete",
        reason: "cancelled",
        error: "Stopped by the user",
      } as const;
      return (
        <Frame>
          <ToolFallbackRoot open onOpenChange={noop}>
            <ToolFallbackTrigger toolName="crawl_site" status={status} />
            <ToolFallbackContent>
              <ToolFallbackError status={status} />
              <ToolFallbackArgs
                className="opacity-60"
                argsText={json({ url: "https://docs.acme.dev", maxPages: 500 })}
              />
            </ToolFallbackContent>
          </ToolFallbackRoot>
        </Frame>
      );
    },
  },
  {
    key: "long-content",
    label: "Long result",
    note: "A large JSON result wraps inside the panel.",
    Component: () => (
      <Frame>
        <ToolFallbackRoot open onOpenChange={noop}>
          <ToolFallbackTrigger
            toolName="list_deployments"
            status={{ type: "complete" }}
          />
          <ToolFallbackContent>
            <ToolFallbackArgs
              argsText={json({ project: "web", status: "ready", limit: 3 })}
            />
            <ToolFallbackResult
              result={{
                deployments: [
                  {
                    id: "dpl_8f2kQw1",
                    url: "https://web-8f2kqw1-acme.vercel.app",
                    commit: "fix: debounce search input on the pricing page",
                    createdAt: "2026-11-03T16:42:10Z",
                  },
                  {
                    id: "dpl_7c1mZx9",
                    url: "https://web-7c1mzx9-acme.vercel.app",
                    commit: "feat: add annual billing toggle",
                    createdAt: "2026-11-02T21:05:44Z",
                  },
                  {
                    id: "dpl_6b0nYv3",
                    url: "https://web-6b0nyv3-acme.vercel.app",
                    commit: "chore: bump next to 16.0.1",
                    createdAt: "2026-11-01T09:18:27Z",
                  },
                ],
                hasMore: true,
              }}
            />
          </ToolFallbackContent>
        </ToolFallbackRoot>
      </Frame>
    ),
  },
]);
