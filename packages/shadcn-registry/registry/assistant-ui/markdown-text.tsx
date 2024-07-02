"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { memo } from "react";
import { cn } from "@/lib/utils";

import "katex/dist/katex.min.css";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ node, className, ...props }) => (
          <h1
            className={cn(
              "mb-8 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        h2: ({ node, className, ...props }) => (
          <h2
            className={cn(
              "mb-4 mt-8 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        h3: ({ node, className, ...props }) => (
          <h3
            className={cn(
              "mb-4 mt-6 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        h4: ({ node, className, ...props }) => (
          <h4
            className={cn(
              "mb-4 mt-6 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        h5: ({ node, className, ...props }) => (
          <h5
            className={cn(
              "my-4 text-lg font-semibold first:mt-0 last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        h6: ({ node, className, ...props }) => (
          <h6
            className={cn("my-4 font-semibold first:mt-0 last:mb-0", className)}
            {...props}
          />
        ),
        p: ({ node, className, ...props }) => (
          <p
            className={cn(
              "mb-5 mt-5 leading-7 first:mt-0 last:mb-0",
              className,
            )}
            {...props}
          />
        ),
        a: ({ node, className, ...props }) => (
          <a
            target="_blank"
            className={cn(
              "text-primary font-medium underline underline-offset-4",
              className,
            )}
            {...props}
          />
        ),
        blockquote: ({ node, className, ...props }) => (
          <blockquote
            className={cn("border-l-2 pl-6 italic", className)}
            {...props}
          />
        ),
        ul: ({ node, className, ...props }) => (
          <ul
            className={cn("my-5 ml-6 list-disc [&>li]:mt-2", className)}
            {...props}
          />
        ),
        ol: ({ node, className, ...props }) => (
          <ol
            className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", className)}
            {...props}
          />
        ),
        hr: ({ node, className, ...props }) => (
          <hr className={cn("my-5 border-b", className)} {...props} />
        ),
        table: ({ node, className, ...props }) => (
          <table
            className={cn(
              "my-5 w-full border-separate border-spacing-0 overflow-y-auto",
              className,
            )}
            {...props}
          />
        ),
        th: ({ node, className, ...props }) => (
          <th
            className={cn(
              "bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right",
              className,
            )}
            {...props}
          />
        ),
        td: ({ node, className, ...props }) => (
          <td
            className={cn(
              "border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right",
              className,
            )}
            {...props}
          />
        ),
        tr: ({ node, className, ...props }) => (
          <tr
            className={cn(
              "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
              className,
            )}
            {...props}
          />
        ),
        sup: ({ node, className, ...props }) => (
          <sup
            className={cn("[&>a]:text-xs [&>a]:no-underline", className)}
            {...props}
          />
        ),
        code(props) {
          const { children, className, node, ref, ...rest } = props;
          const match = /language-(\w+)/.exec(className || "")?.[1];
          return (
            <>
              <div className="bg-muted rounded-t-lg px-4 py-2 font-mono text-xs">
                <p>{match}</p>
              </div>
              <code
                {...rest}
                className={cn(
                  "overflow-x-auto rounded-b-lg bg-black p-4 text-white",
                  className,
                )}
              >
                {children}
              </code>
            </>
          );
        },
      }}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
