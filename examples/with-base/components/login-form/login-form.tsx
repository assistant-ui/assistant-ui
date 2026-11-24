"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { icons, type IconProps } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/*
 * Login Form: sign in or sign up by email, with provider buttons above it.
 * Continue hands `{ email }` to `onSubmit`; return a promise and the button
 * works until it settles, and a rejection's message shows above it. Login
 * Dialog puts the form in a Dialog and closes once `onSubmit` resolves.
 * Not a shadcn component: its API is its own.
 *
 * Look: provider buttons are outline Buttons with the brand mark in full ink,
 * an "or" divider on hairlines, then a Field (label, input, the consequence
 * in 13px muted text), all in a Form. A bad address, or `onSubmit`'s
 * rejection, turns the field's border destructive and shows in its
 * FieldError. While it sends, the button names the work beside a Spinner.
 */

type LoginValues = { email: string };

type LoginProvider = {
  id: string;
  name: string;
  icon: React.ComponentType<IconProps>;
};

const LOGIN_PROVIDERS: LoginProvider[] = [
  { id: "google", name: "Google", icon: icons.google },
  { id: "github", name: "GitHub", icon: icons.github },
];

type LoginFormProps = Omit<
  React.ComponentProps<typeof Form>,
  "onSubmit" | "onFormSubmit" | "errors"
> & {
  /**
   * Return a promise to show the button working. A rejection's message shows
   * under the email field, as the Form's error for it.
   */
  onSubmit?: (values: LoginValues) => void | Promise<void>;
  /** Sign-in buttons above the email form. Pass `[]` for none. */
  providers?: LoginProvider[];
  /** Like `onSubmit`: a rejection's message shows under the provider buttons. */
  onProvider?: (id: string) => void | Promise<void>;
  /** Under the email field: what happens after Continue. */
  emailDescription?: React.ReactNode;
};

function LoginForm({
  onSubmit,
  providers = LOGIN_PROVIDERS,
  onProvider,
  emailDescription = "We'll email you a code to sign in.",
  className,
  ...props
}: LoginFormProps) {
  const id = React.useId();
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [providerError, setProviderError] = React.useState<string | null>(null);

  const failed = (reason: unknown, fallback: string) =>
    reason instanceof Error && reason.message ? reason.message : fallback;

  return (
    <Form
      data-slot="login-form"
      errors={errors}
      // The browser checks the address first; FieldError shows its message.
      onFormSubmit={async (values) => {
        setErrors({});
        setProviderError(null);
        setPending(true);
        try {
          await onSubmit?.({ email: String(values.email ?? "").trim() });
        } catch (reason) {
          setErrors({
            email: failed(
              reason,
              "The code didn't send. Check the address and try again.",
            ),
          });
        } finally {
          setPending(false);
        }
      }}
      className={cn("gap-4", className)}
      {...props}
    >
      {providers.length > 0 ? (
        <>
          <div data-slot="login-form-providers" className="flex flex-col gap-2">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                disabled={pending}
                onClick={async () => {
                  setProviderError(null);
                  try {
                    await onProvider?.(provider.id);
                  } catch (reason) {
                    setProviderError(
                      failed(
                        reason,
                        `Signing in with ${provider.name} didn't finish. Try again.`,
                      ),
                    );
                  }
                }}
                // A brand mark keeps its own ink, not the muted icon color.
                className="[&_svg]:text-foreground"
              >
                <provider.icon data-icon="inline-start" aria-hidden />
                Continue with {provider.name}
              </Button>
            ))}
            {providerError ? (
              <FieldError errors={[{ message: providerError }]} />
            ) : null}
          </div>
          <div
            data-slot="login-form-divider"
            className="text-muted-foreground flex items-center gap-3 text-[0.75rem] leading-4"
          >
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>
        </>
      ) : null}

      <Field name="email" disabled={pending}>
        <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <FieldDescription>{emailDescription}</FieldDescription>
        <FieldError />
      </Field>

      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <Spinner data-icon="inline-start" aria-hidden /> : null}
        {pending ? "Sending code" : "Continue"}
      </Button>
    </Form>
  );
}

function LoginDialog({
  open,
  onOpenChange,
  title = "Sign in or sign up",
  description,
  onSubmit,
  ...props
}: LoginFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="login-dialog"
        className="bg-background sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <LoginForm
          {...props}
          onSubmit={async (values) => {
            await onSubmit?.(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export { LoginDialog, LoginForm, LOGIN_PROVIDERS };
export type { LoginProvider, LoginValues };
