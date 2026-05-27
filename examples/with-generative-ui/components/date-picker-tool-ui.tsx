"use client";

import type { SelectDateArgs } from "@/lib/inline-tool-schemas";
import { useState } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { CalendarIcon, CheckCircle2Icon } from "lucide-react";

type DatePickerArgs = SelectDateArgs;

type DatePickerResult = {
  date: string;
};

export const DatePickerToolUI = makeAssistantToolUI<
  DatePickerArgs,
  DatePickerResult
>({
  toolName: "select_date",
  render: function DatePickerUI({ args, result, addResult }) {
    const [value, setValue] = useState("");

    if (result) {
      return (
        <div className="my-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle2Icon className="size-4 text-green-600" />
          <span className="text-sm text-green-800">
            Selected: {new Date(result.date).toLocaleDateString()}
          </span>
        </div>
      );
    }

    return (
      <div className="my-2 rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">{args.prompt}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value}
            min={args.minDate}
            max={args.maxDate}
            onChange={(e) => setValue(e.target.value)}
            className="bg-background rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!value}
            onClick={() => addResult({ date: new Date(value).toISOString() })}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  },
});
