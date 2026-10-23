import { Sparkline } from "diagrammatic";

const SERVICES = [
  {
    name: "api",
    p95: [212, 220, 198, 240, 231, 260, 244, 238, 251, 229, 219, 205],
    now: 205,
  },
  {
    name: "auth",
    p95: [88, 90, 86, 94, 91, 97, 112, 140, 128, 99, 92, 90],
    now: 90,
  },
  {
    name: "search",
    p95: [340, 352, 361, 330, 318, 301, 296, 288, 276, 270, 262, 255],
    now: 255,
  },
  {
    name: "billing",
    p95: [150, 148, 151, 149, 160, 171, 182, 179, 190, 201, 214, 226],
    now: 226,
  },
];

export default function ServiceTable() {
  return (
    <table className="w-full text-sm">
      <thead className="text-muted-foreground text-left text-xs">
        <tr>
          <th className="pb-2 font-normal">Service</th>
          <th className="pb-2 font-normal">p95, last 12 hours</th>
          <th className="pb-2 text-right font-normal">Now</th>
        </tr>
      </thead>
      <tbody>
        {SERVICES.map((service) => (
          <tr key={service.name}>
            <td className="py-1.5 font-mono text-xs">{service.name}</td>
            <td className="py-1.5">
              <Sparkline data={service.p95} title={`${service.name} p95`} />
            </td>
            <td className="py-1.5 text-right tabular-nums">{service.now} ms</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
