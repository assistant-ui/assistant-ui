"use client";

import { CheckCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TransactionConfirmation = {
  ticker: string;
  companyName: string;
  quantity: number;
  maxPurchasePrice: number;
};

export function TransactionConfirmationFinal(props: TransactionConfirmation) {
  const { ticker, companyName, quantity, maxPurchasePrice } = props;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <CardTitle className="text-2xl font-bold text-green-700">
          Transaction Confirmed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-green-800">
            Purchase Summary
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="font-medium text-green-700">Ticker:</p>
            <p className="font-bold text-green-900">{ticker}</p>
            <p className="font-medium text-green-700">Company:</p>
            <p className="text-green-900">{companyName}</p>
            <p className="font-medium text-green-700">Quantity:</p>
            <p className="text-green-900">{quantity} shares</p>
            <p className="font-medium text-green-700">Price per Share:</p>
            <p className="text-green-900">${maxPurchasePrice?.toFixed(2)}</p>
          </div>
        </div>
        <div className="rounded-md border border-green-300 bg-green-100 p-4">
          <p className="text-lg font-semibold text-green-800">Total Cost:</p>
          <p className="text-2xl font-bold text-green-900">
            ${(quantity * maxPurchasePrice)?.toFixed(2)}
          </p>
        </div>
        <p className="text-center text-sm text-green-600">
          Your purchase of {quantity} shares of {companyName} ({ticker}) has
          been successfully processed.
        </p>
      </CardContent>
    </Card>
  );
}
