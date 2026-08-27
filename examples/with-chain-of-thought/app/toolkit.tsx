"use generative";

import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";
import { calculateFibonacci } from "./calculateFibonacci";

type CalculateFibonacciResult = {
  index: number;
  value: string;
};

type ToolkitArgs = {
  calculate_fibonacci: { index: number };
};

export default defineToolkit<ToolkitArgs>({
  calculate_fibonacci: {
    description: "Calculate a Fibonacci number exactly",
    parameters: z.object({
      index: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .describe("The zero-based Fibonacci index to calculate"),
    }),
    execute: async ({ index }) => {
      "use client";
      return { index, value: calculateFibonacci(index) };
    },
    render: ({ args, result, status }) => {
      const output = result as CalculateFibonacciResult | undefined;
      return (
        <div className="bg-muted/30 my-2 rounded-lg border p-4 text-sm">
          <p className="mb-1 font-semibold">calculate_fibonacci</p>
          <div className="bg-background rounded p-2 font-mono text-xs">
            F({args.index ?? "…"})
          </div>
          {status.type !== "running" && output && (
            <div className="mt-2 border-t pt-2">
              <p className="text-muted-foreground font-semibold">Result:</p>
              <output className="font-mono text-xs break-all">
                {output.value}
              </output>
            </div>
          )}
        </div>
      );
    },
  },
});
