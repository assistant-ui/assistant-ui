"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { SampleFrame } from "./sample-frame";

function ChainOfThoughtDemo() {
  const [collapsed, setCollapsed] = useState(true);
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const [actionOpen, setActionOpen] = useState(true);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-2">
      {/* User message */}
      <div className="flex justify-end py-3">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
          What&apos;s 2^16? Show your work step by step.
        </div>
      </div>

      {/* Assistant message with chain of thought */}
      <div className="flex flex-col gap-2 py-3 leading-relaxed">
        {/* Chain of thought accordion */}
        <div className="my-2 rounded-lg border">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 font-medium text-sm hover:bg-muted/50"
          >
            {collapsed ? (
              <ChevronRightIcon className="size-4 shrink-0" />
            ) : (
              <ChevronDownIcon className="size-4 shrink-0" />
            )}
            Thinking
          </button>

          {!collapsed && (
            <>
              {/* Reasoning part */}
              <div className="border-t">
                <button
                  type="button"
                  onClick={() => setThinkingOpen((o) => !o)}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-1.5 text-muted-foreground text-xs hover:bg-muted/50"
                >
                  {thinkingOpen ? (
                    <ChevronDownIcon className="size-3" />
                  ) : (
                    <ChevronRightIcon className="size-3" />
                  )}
                  Thinking
                </button>
                {thinkingOpen && (
                  <p className="whitespace-pre-wrap px-4 py-2 text-muted-foreground text-sm italic">
                    {`2^16 means 2 multiplied by itself 16 times. I can calculate this using JavaScript to verify:
2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2`}
                  </p>
                )}
              </div>

              {/* Tool call part */}
              <div className="border-t">
                <button
                  type="button"
                  onClick={() => setActionOpen((o) => !o)}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-1.5 text-muted-foreground text-xs hover:bg-muted/50"
                >
                  {actionOpen ? (
                    <ChevronDownIcon className="size-3" />
                  ) : (
                    <ChevronRightIcon className="size-3" />
                  )}
                  Taking action
                </button>
                {actionOpen && (
                  <div className="my-2 rounded-lg border bg-muted/30 p-4 text-sm">
                    <p className="mb-1 font-semibold">execute_js</p>
                    <pre className="whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs">
                      {`Math.pow(2, 16)`}
                    </pre>
                    <div className="mt-2 border-t pt-2">
                      <p className="font-semibold text-muted-foreground">
                        Result:
                      </p>
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        65536
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Final answer */}
        <p>
          <strong>2^16 = 65,536</strong>
          <br />
          <br />
          The calculation confirms that 2 to the power of 16 equals 65,536.
        </p>
      </div>
    </div>
  );
}

export function ChainOfThoughtSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center overflow-hidden bg-muted/40 p-6">
      <ChainOfThoughtDemo />
    </SampleFrame>
  );
}
