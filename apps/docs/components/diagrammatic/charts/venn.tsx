import { CAT, TXT, VIEWBOX, stroke } from "./lib";

export function VennChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <circle
        cx="80"
        cy="60"
        r="38"
        fill={CAT[0]}
        fillOpacity="0.2"
        stroke={CAT[0]}
        strokeOpacity="0.7"
        {...stroke.medium}
      />
      <circle
        cx="124"
        cy="60"
        r="38"
        fill={CAT[2]}
        fillOpacity="0.2"
        stroke={CAT[2]}
        strokeOpacity="0.7"
        {...stroke.medium}
      />
      <text
        x="62"
        y="56"
        textAnchor="middle"
        fontSize="4.5"
        fill={CAT[0]}
        className="font-mono"
      >
        web only
      </text>
      <text x="62" y="64" textAnchor="middle" {...TXT.value}>
        4.2k
      </text>
      <text
        x="142"
        y="56"
        textAnchor="middle"
        fontSize="4.5"
        fill={CAT[2]}
        className="font-mono"
      >
        app only
      </text>
      <text x="142" y="64" textAnchor="middle" {...TXT.value}>
        3.1k
      </text>
      <text x="102" y="56" textAnchor="middle" {...TXT.axis}>
        both
      </text>
      <text x="102" y="64" textAnchor="middle" {...TXT.value}>
        1.3k
      </text>
    </svg>
  );
}
