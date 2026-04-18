const SPARKLE_PATH =
  "M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z";

export function GeminiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" {...props} viewBox="0 0 65 65" fill="none">
      <defs>
        {/* biome-ignore lint/correctness/useUniqueElementIds: static page with unique context */}
        <linearGradient
          id="gemini-blue"
          x1="18.447"
          y1="43.42"
          x2="52.153"
          y2="15.004"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#346BF1" />
          <stop offset=".45" stopColor="#3186FF" />
          <stop offset="1" stopColor="#4FA0FF" />
        </linearGradient>
      </defs>
      <path d={SPARKLE_PATH} fill="url(#gemini-blue)" />
    </svg>
  );
}
