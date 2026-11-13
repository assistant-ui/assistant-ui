"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { analytics } from "@/lib/analytics";
import {
  BUILDING_MAX_LENGTH,
  COMPANY_SIZES,
  EMPTY_CONTACT_SALES_VALUES,
  REFERRAL_SOURCES,
  ROLES,
  buildSalesBookingUrl,
  isPersonalEmail,
  validateContactSales,
  type ContactSalesErrors,
  type ContactSalesField,
  type ContactSalesValues,
} from "@/lib/contact-sales";

function Field({
  id,
  label,
  optional,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="text-muted-foreground font-normal">Optional</span>
        ) : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function OptionSelect({
  id,
  value,
  options,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || null}
      items={options.map((option) => ({ value: option, label: option }))}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-message` : undefined}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** How long the form waits on the email before moving on to cal.com. */
const NOTIFY_TIMEOUT_MS = 2_500;

/**
 * Emails the answers to the team. Never rejects: the visitor books on cal.com
 * whether or not the email goes out, and the route logs any failure.
 */
function notifySales(
  values: ContactSalesValues,
  website: string,
): Promise<void> {
  const request = fetch("/api/contact-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...values,
      website,
      pageUrl: window.location.href,
    }),
    keepalive: true,
  }).then(
    () => undefined,
    () => undefined,
  );
  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, NOTIFY_TIMEOUT_MS),
  );
  return Promise.race([request, timeout]);
}

export function ContactSalesForm({
  navigate = (url: string) => window.location.assign(url),
}: {
  navigate?: (url: string) => void;
}) {
  const honeypot = useRef<HTMLInputElement>(null);
  const id = useId();
  const [values, setValues] = useState<ContactSalesValues>(
    EMPTY_CONTACT_SALES_VALUES,
  );
  const [errors, setErrors] = useState<ContactSalesErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Back from cal.com can restore this page from the bfcache with the button
  // still disabled, so re-enable it whenever the page is shown again.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setSubmitting(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const fieldId = (field: ContactSalesField) => `${id}-${field}`;

  const set = (field: ContactSalesField) => (value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateContactSales(next)[field],
      }));
    }
  };

  const inputProps = (field: ContactSalesField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => set(field)(event.target.value),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${fieldId(field)}-message` : undefined,
  });

  const emailHint =
    !errors.email && isPersonalEmail(values.email)
      ? "A work email helps us find your team."
      : undefined;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateContactSales(values);
    setErrors(found);
    const first = (Object.keys(found) as ContactSalesField[])[0];
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }
    setSubmitting(true);
    const url = buildSalesBookingUrl(values);
    void Promise.all([
      analytics.contactSales
        .submitted({
          company_size: values.companySize,
          role: values.role || "unspecified",
          referral: values.referral || "unspecified",
          personal_email: isPersonalEmail(values.email),
        })
        .catch(() => undefined),
      notifySales(values, honeypot.current?.value ?? ""),
    ]).then(() => navigate(url));
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-label="Contact sales"
      className="[&_:is(input,textarea,button):focus-visible]:ring-foreground/25 [&_button[type=submit]:focus-visible]:ring-offset-background flex flex-col gap-5 [&_:is(input,textarea,button):focus-visible]:ring-2 [&_button[type=submit]:focus-visible]:ring-offset-2"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={fieldId("firstName")}
          label="First name"
          error={errors.firstName}
        >
          <Input autoComplete="given-name" {...inputProps("firstName")} />
        </Field>
        <Field
          id={fieldId("lastName")}
          label="Last name"
          error={errors.lastName}
        >
          <Input autoComplete="family-name" {...inputProps("lastName")} />
        </Field>
      </div>

      <Field
        id={fieldId("email")}
        label="Work email"
        error={errors.email}
        hint={emailHint}
      >
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="name@company.com"
          {...inputProps("email")}
          aria-describedby={
            errors.email || emailHint
              ? `${fieldId("email")}-message`
              : undefined
          }
        />
      </Field>

      <Field id={fieldId("company")} label="Company" error={errors.company}>
        <Input autoComplete="organization" {...inputProps("company")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={fieldId("companySize")}
          label="Company size"
          error={errors.companySize}
        >
          <OptionSelect
            id={fieldId("companySize")}
            value={values.companySize}
            options={COMPANY_SIZES}
            placeholder="Choose a size"
            invalid={Boolean(errors.companySize)}
            onChange={set("companySize")}
          />
        </Field>
        <Field id={fieldId("role")} label="Role" optional>
          <OptionSelect
            id={fieldId("role")}
            value={values.role}
            options={ROLES}
            placeholder="Choose a role"
            onChange={set("role")}
          />
        </Field>
      </div>

      <Field
        id={fieldId("building")}
        label="What are you building?"
        optional
        error={errors.building}
      >
        <Textarea
          rows={4}
          maxLength={BUILDING_MAX_LENGTH}
          placeholder="Your product and where chat fits in."
          className="min-h-28"
          {...inputProps("building")}
        />
      </Field>

      <Field
        id={fieldId("referral")}
        label="How did you hear about us?"
        optional
      >
        <OptionSelect
          id={fieldId("referral")}
          value={values.referral}
          options={REFERRAL_SOURCES}
          placeholder="Choose one"
          onChange={set("referral")}
        />
      </Field>

      {/* Hidden from people and screen readers. Bots that fill it are dropped. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input
            ref={honeypot}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Opening cal.com" : "Contact sales"}
        </Button>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Next, you'll pick a time on cal.com. Your answers carry over.
        </p>
      </div>
    </form>
  );
}
