"use client";

import { Testimonial } from "@/components/testimonials/testimonials";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FC } from "react";

export const TestimonialContainer: FC<{
  testimonials: Testimonial[];
  className?: string;
}> = ({ testimonials, className }) => {
  return (
    <div className={cn("relative columns-1 gap-4 overflow-hidden", className)}>
      {testimonials.map((testimonial, idx) => (
        <TestimonialView key={idx} {...testimonial} />
      ))}
    </div>
  );
};
const TestimonialView: FC<Testimonial> = (testimonial) => {
  return (
    <div className="mb-4 break-inside-avoid-column">
      <a target="_blank" href={testimonial.url}>
        <div className="bg-card hover:bg-border flex flex-col gap-3 rounded-lg border p-6 shadow transition-colors">
          <div className="relative flex items-center gap-2">
            <Image
              alt={"@" + testimonial.username + "'s twitter image"}
              loading="lazy"
              width="64"
              height="64"
              className="h-10 w-10 rounded-full border"
              src={testimonial.avatar}
            />
            <p className="text-sm font-medium">{testimonial.username}</p>
            <div className="bg-background absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full">
              <XLogo />
            </div>
          </div>
          <p className="text-muted-foreground whitespace-pre-line">
            {testimonial.message}
          </p>
        </div>
      </a>
    </div>
  );
};
const XLogo: FC = () => {
  return (
    <svg
      className="h-[12px] w-[12px]"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
  );
};
