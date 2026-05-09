"use client";

import { useState } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { CalendarIcon, CheckCircle2Icon } from "lucide-react";

type DatePickerArgs = {
  prompt: string;
  minDate?: string;
  maxDate?: string;
};

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
          <span className="text-green-800 text-sm">
            Selected: {new Date(result.date).toLocaleDateString()}
          </span>
        </div>
      );
    }

    return (
      <div className="my-2 rounded-lg border p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">{args.prompt}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value}
            min={args.minDate}
            max={args.maxDate}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!value}
            onClick={() => addResult({ date: new Date(value).toISOString() })}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  },
});
