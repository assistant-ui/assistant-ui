"use client";

import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TransactionConfirmation = {
  ticker: string;
  companyName: string;
  quantity: number;
  maxPurchasePrice: number;
  onConfirm: () => void;
};

export function TransactionConfirmationPending(props: TransactionConfirmation) {
  const { ticker, companyName, quantity, maxPurchasePrice, onConfirm } = props;

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Confirm Transaction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <p className="text-muted-foreground text-sm font-medium">Ticker:</p>
          <p className="text-sm font-bold">{ticker}</p>
          <p className="text-muted-foreground text-sm font-medium">Company:</p>
          <p className="text-sm">{companyName}</p>
          <p className="text-muted-foreground text-sm font-medium">Quantity:</p>
          <p className="text-sm">{quantity} shares</p>
          <p className="text-muted-foreground text-sm font-medium">
            Max Purchase Price:
          </p>
          <p className="text-sm">${maxPurchasePrice?.toFixed(2)}</p>
        </div>
        <div className="bg-muted rounded-md p-3">
          <p className="text-sm font-medium">Total Maximum Cost:</p>
          <p className="text-lg font-bold">
            ${(quantity * maxPurchasePrice)?.toFixed(2)}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        {/* <Button variant="outline" onClick={onReject}>
          <X className="mr-2 h-4 w-4" />
          Reject
        </Button> */}
        <Button onClick={onConfirm}>
          <CheckIcon className="mr-2 h-4 w-4" />
          Confirm
        </Button>
      </CardFooter>
    </Card>
  );
}
