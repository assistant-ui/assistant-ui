"use client";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
      console.log(values);
      await submitSignup(values);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting)
    return <p className="my-4 font-bold text-green-600">Submitting...</p>;

  if (isSubmitted)
    return (
      <p className="my-4 font-bold text-green-600">
        Thank you for signing up, you will hear from me soon!
      </p>
    );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...form.register("hidden")} />

      <FormField
        control={form.control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Name</FormLabel>
            <FormDescription>Your first name.</FormDescription>
            <FormControl>
              <Input placeholder="First Name" {...field} />
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
            <FormLabel>Last Name</FormLabel>
            <FormDescription>Your last name.</FormDescription>
            <FormControl>
              <Input placeholder="Last Name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormDescription>Your email.</FormDescription>
            <FormControl>
              <Input placeholder="Email" {...field} />
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
            <FormLabel>City</FormLabel>
            <FormDescription>The city and country you live in.</FormDescription>
            <FormControl>
              <Input placeholder="City" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="projectIdea"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Idea</FormLabel>
            <FormDescription>
              Do you have an idea for a project?
            </FormDescription>
            <FormControl>
              <Input placeholder="Idea" {...field} />
            </FormControl>
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
            <FormDescription>
              What technologies are you most comfortable with?
            </FormDescription>
            <FormControl>
              <Input placeholder="Next.js, Tailwind CSS" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button type="submit">Submit</Button>
    </form>
  );
};
