"use client";

import { unstable_MarkdownTextPrimitive as MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export const MarkdownText = () => {
  return (
    <MarkdownTextPrimitive
      className="prose dark:prose-invert prose-pre:p-0 prose-p:leading-relaxed break-words"
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        // code({ node, className, children, ...props }) {
        //   if (children.length) {
        //     if (children[0] == "▍") {
        //       return (
        //         <span className="mt-1 animate-pulse cursor-default">▍</span>
        //       );
        //     }

        //     children[0] = (children[0] as string).replace("`▍`", "▍");
        //   }

        //   const match = /language-(\w+)/.exec(className || "");

        //   if (inline) {
        //     return (
        //       <code className={className} {...props}>
        //         {children}
        //       </code>
        //     );
        //   }

        //   return (
        //     <CodeBlock
        //       key={Math.random()}
        //       language={match?.[1] || ""}
        //       value={String(children).replace(/\n$/, "")}
        //       {...props}
        //     />
        //   );
        // },
      }}
    />
  );
};
