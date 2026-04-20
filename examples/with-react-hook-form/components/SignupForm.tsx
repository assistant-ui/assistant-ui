"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";
import { type FC, useState } from "react";
import { useFormContext } from "react-hook-form";
import { submitSignup } from "../lib/submitSignup";

export const SignupForm: FC = () => {
  const form = useFormContext();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onSubmit = async (values: object) => {
    try {
      setIsSubmitting(true);
      await submitSignup(values);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-green-600" />
          <p className="font-semibold text-lg">You&apos;re signed up!</p>
          <p className="text-muted-foreground text-sm">
            Thanks for registering. You&apos;ll hear from us soon.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input type="hidden" {...form.register("hidden")} />

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Tell us a bit about yourself.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cityAndCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City and country</FormLabel>
                <FormControl>
                  <Input placeholder="San Francisco, USA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>

        <Separator />

        <CardHeader>
          <CardTitle>Your project</CardTitle>
          <CardDescription>
            Share what you&apos;d like to build at the hackathon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="projectIdea"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project idea</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="A multiplayer drawing game powered by AI..."
                    className="min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A short pitch is fine. Leave blank if you&apos;re still
                  brainstorming.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="proficientTechnologies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Technologies</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Next.js, Tailwind CSS, Postgres"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Comma-separated list of what you&apos;re comfortable with.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>

        <CardFooter className="sticky bottom-0 justify-end gap-3 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
