"use client";

import { Testimonial } from "@/components/home/testimonials/data";
import { cn } from "@/lib/utils";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";

export const TestimonialContainer: FC<{
  testimonials: Testimonial[];
  className?: string;
}> = ({ testimonials, className }) => {
  return (
    <section className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="font-medium text-3xl tracking-tight">
          Join the community
        </h2>
        <div className="flex items-center gap-4">
          <Link
            href="https://discord.gg/S9dwgCNEFs"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <DiscordLogoIcon className="size-4" />
            Discord
          </Link>
          <Link
            href="https://github.com/assistant-ui/assistant-ui"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <GitHubLogoIcon className="size-4" />
            GitHub
          </Link>
        </div>
      </div>

      <div className="relative mx-auto max-h-[500px] w-full max-w-7xl overflow-hidden">
        <div
          className={cn("relative columns-1 gap-4 overflow-hidden", className)}
        >
          {testimonials.map((testimonial, idx) => (
            <TestimonialView key={idx} {...testimonial} />
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-24 w-full bg-linear-to-t from-background" />
      </div>
    </section>
  );
};

const TestimonialView: FC<Testimonial> = (testimonial) => {
  return (
    <div className="mb-4 break-inside-avoid-column">
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={testimonial.url}
        className="block space-y-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              alt={`@${testimonial.username}`}
              loading="lazy"
              width="24"
              height="24"
              className="size-6 rounded-full"
              src={testimonial.avatar}
            />
            <span className="text-muted-foreground text-xs">
              {testimonial.username}
            </span>
          </div>
          <XLogo />
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed">
          {testimonial.message}
        </p>
      </a>
    </div>
  );
};

const XLogo: FC = () => {
  return (
    <svg
      className="size-3 text-muted-foreground/50"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
};
