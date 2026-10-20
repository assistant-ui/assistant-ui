import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const compactMarkdownComponents = {
  h1: ({ className, ...props }: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className={cn(
        "mb-2 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className={cn(
        "mt-3 mb-1.5 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className={cn(
        "mt-2.5 mb-1 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: ComponentPropsWithoutRef<"h4">) => (
    <h4
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: ComponentPropsWithoutRef<"h5">) => (
    <h5
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: ComponentPropsWithoutRef<"h6">) => (
    <h6
      className={cn(
        "mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: ComponentPropsWithoutRef<"p">) => (
    <p
      className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  blockquote: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className={cn(
        "border-muted-foreground/30 text-muted-foreground my-2.5 border-l-2 pl-3 italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className={cn(
        "marker:text-muted-foreground my-2 ml-4 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className={cn(
        "marker:text-muted-foreground my-2 ml-4 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className={cn("leading-normal", className)} {...props} />
  ),
  hr: ({ className, ...props }: ComponentPropsWithoutRef<"hr">) => (
    <hr
      className={cn("border-muted-foreground/20 my-2", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: ComponentPropsWithoutRef<"table">) => (
    <div className="my-2 overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-xs", className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }: ComponentPropsWithoutRef<"th">) => (
    <th
      className={cn(
        "border-muted-foreground/20 bg-muted border px-2 py-1 text-left font-medium",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentPropsWithoutRef<"td">) => (
    <td
      className={cn(
        "border-muted-foreground/20 border px-2 py-1 text-left",
        className,
      )}
      {...props}
    />
  ),
  tr: (props: ComponentPropsWithoutRef<"tr">) => <tr {...props} />,
};
