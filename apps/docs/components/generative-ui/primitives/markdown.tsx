import ReactMarkdown from "react-markdown";

const PROSE =
  "text-foreground text-sm leading-relaxed [&_p]:my-0 [&_p+p]:mt-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-medium";

export function Markdown({
  value,
  children,
}: {
  value?: string;
  children?: string;
}) {
  const source = value ?? (typeof children === "string" ? children : "");
  return (
    <div className={PROSE}>
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}
