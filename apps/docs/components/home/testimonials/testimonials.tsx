import { Testimonial } from "@/components/home/testimonials/data";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FC } from "react";

export const TestimonialContainer: FC<{
  testimonials: Testimonial[];
  className?: string;
}> = ({ testimonials, className }) => {
  return (
    <div className="relative mx-auto max-h-[500px] w-full max-w-7xl overflow-hidden">
      <div className={cn("columns-1 gap-4", className)}>
        {testimonials.map((testimonial, idx) => (
          <TestimonialCard key={idx} {...testimonial} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background" />
    </div>
  );
};

const TestimonialCard: FC<Testimonial> = ({
  username,
  avatar,
  message,
  url,
}) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="mb-4 block break-inside-avoid-column space-y-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Image
          alt={`@${username}`}
          loading="lazy"
          width={24}
          height={24}
          className="size-6 rounded-full"
          src={avatar}
        />
        <span className="text-muted-foreground text-xs">{username}</span>
      </div>
      <svg
        className="size-3 text-muted-foreground/50"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </div>
    <p className="whitespace-pre-line text-sm leading-relaxed">{message}</p>
  </a>
);
