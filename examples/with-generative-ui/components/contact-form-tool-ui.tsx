"use client";

import { useState } from "react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { UserIcon, CheckCircle2Icon } from "lucide-react";

type ContactFormArgs = {
  prompt: string;
  fields: Array<"name" | "email" | "phone">;
};

type ContactFormResult = {
  name?: string;
  email?: string;
  phone?: string;
};

export const ContactFormToolUI: ToolCallMessagePartComponent<
  ContactFormArgs,
  ContactFormResult
> = function ContactFormUI({ args, result, addResult }) {
  const [form, setForm] = useState<ContactFormResult>({});

  if (result) {
    return (
      <div className="my-2 rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="mb-1 flex items-center gap-2">
          <CheckCircle2Icon className="size-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Contact info collected
          </span>
        </div>
        <div className="ml-6 space-y-0.5 text-xs text-green-700">
          {result.name && <p>Name: {result.name}</p>}
          {result.email && <p>Email: {result.email}</p>}
          {result.phone && <p>Phone: {result.phone}</p>}
        </div>
      </div>
    );
  }

  const fields = args.fields ?? ["name", "email", "phone"];
  const isValid = fields.every((f) => form[f]?.trim());

  return (
    <div className="my-2 rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserIcon className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">{args.prompt}</span>
      </div>
      <div className="space-y-2">
        {fields.includes("name") && (
          <input
            type="text"
            placeholder="Name"
            value={form.name ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        )}
        {fields.includes("email") && (
          <input
            type="email"
            placeholder="Email"
            value={form.email ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        )}
        {fields.includes("phone") && (
          <input
            type="tel"
            placeholder="Phone"
            value={form.phone ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        )}
        <button
          type="button"
          disabled={!isValid}
          onClick={() => addResult(form)}
          className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
};
