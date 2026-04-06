"use client";

import { makeAssistantToolUI } from "@assistant-ui/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2Icon } from "lucide-react";

type ChartArgs = {
  title: string;
  type: "bar" | "line" | "pie";
  data: Array<Record<string, string | number>>;
  xKey: string;
  dataKeys: string[];
};

type ChartResult = {
  success: boolean;
};

const COLORS = [
  "oklch(0.646 0.222 41.116)",
  "oklch(0.6 0.118 184.704)",
  "oklch(0.398 0.07 227.392)",
  "oklch(0.828 0.189 84.429)",
  "oklch(0.769 0.188 70.08)",
];

export const ChartToolUI = makeAssistantToolUI<ChartArgs, ChartResult>({
  toolName: "generate_chart",
  render: function ChartUI({ args, status }) {
    if (status.type === "running" && !args.data?.length) {
      return (
        <div className="flex items-center gap-2 rounded-lg border p-4">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">
            Generating chart...
          </span>
        </div>
      );
    }

    const { title, type, data, xKey, dataKeys } = args;
    if (!data?.length || !dataKeys?.length) return null;

    return (
      <div className="my-2 rounded-lg border p-4">
        <h3 className="mb-3 text-center font-semibold text-sm">{title}</h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend />
                {dataKeys.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={COLORS[i % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend />
                {dataKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={COLORS[i % COLORS.length] ?? "#8884d8"}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            ) : (
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={data}
                  dataKey={dataKeys[0]!}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length] ?? "#8884d8"}
                    />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  },
});
