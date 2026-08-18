export function BrowserAIIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" {...props} viewBox="0 0 24 24" fill="none">
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M2 8.5h20" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="5" cy="6.25" r="0.9" fill="currentColor" />
      <path
        fill="currentColor"
        d="m12 10.5 1.05 2.7 2.7 1.05-2.7 1.05L12 18l-1.05-2.7-2.7-1.05 2.7-1.05z"
      />
    </svg>
  );
}
