export type PropRow = {
  name: string;
  type: string;
  description: string;
  default?: string;
};

export function PropsTable({ props }: { props: PropRow[] }) {
  return (
    <div className="border-border/60 overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium">Default</th>
            </tr>
          </thead>
          <tbody>
            {props.map((prop) => (
              <tr
                key={prop.name}
                className="border-border/60 border-t align-top"
              >
                <td className="px-4 py-2.5 font-mono text-xs">{prop.name}</td>
                <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs">
                  {prop.type}
                </td>
                <td className="text-muted-foreground px-4 py-2.5">
                  {prop.description}
                </td>
                <td className="text-muted-foreground px-4 py-2.5 font-mono text-xs">
                  {prop.default ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
