"use client";

import { useState } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
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

export const ContactFormToolUI = makeAssistantToolUI<
  ContactFormArgs,
  ContactFormResult
>({
  toolName: "collect_contact",
  render: function ContactFormUI({ args, result, addResult }) {
    const [form, setForm] = useState<ContactFormResult>({});

    if (result) {
      return (
        <div className="my-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-green-600" />
            <span className="font-medium text-green-800 text-sm">
              Contact info collected
            </span>
          </div>
          <div className="ml-6 space-y-0.5 text-green-700 text-xs">
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
          <UserIcon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">{args.prompt}</span>
        </div>
        <div className="space-y-2">
          {fields.includes("name") && (
            <input
              type="text"
              placeholder="Name"
              value={form.name ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          )}
          {fields.includes("email") && (
            <input
              type="email"
              placeholder="Email"
              value={form.email ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          )}
          {fields.includes("phone") && (
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          )}
          <button
            type="button"
            disabled={!isValid}
            onClick={() => addResult(form)}
            className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    );
  },
});
