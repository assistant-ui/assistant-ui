"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PriceSnapshotToolArgs = {
  ticker: string;
};

type PriceSnapshotToolResult = {
  price: number;
  day_change: number;
  day_change_percent: number;
  time: string;
};

export function PriceSnapshot({
  ticker,
  price,
  day_change,
  day_change_percent,
  time,
}: PriceSnapshotToolArgs & PriceSnapshotToolResult) {
  const isPositiveChange = day_change >= 0;
  const changeColor = isPositiveChange ? "text-green-600" : "text-red-600";
  const ArrowIcon = isPositiveChange ? ArrowUpIcon : ArrowDownIcon;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-bold text-2xl">{ticker}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <p className="font-semibold text-3xl">${price?.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Day Change</p>
            <p
              className={`flex items-center font-medium text-lg ${changeColor}`}
            >
              <ArrowIcon className="mr-1 h-4 w-4" />$
              {Math.abs(day_change)?.toFixed(2)} (
              {Math.abs(day_change_percent)?.toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Last Updated</p>
            <p className="font-medium text-lg">
              {new Date(time).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
