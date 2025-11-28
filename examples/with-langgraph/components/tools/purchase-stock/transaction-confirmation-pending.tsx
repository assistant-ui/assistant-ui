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
        <CardTitle className="font-bold text-2xl">
          Confirm Transaction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <p className="font-medium text-muted-foreground text-sm">Ticker:</p>
          <p className="font-bold text-sm">{ticker}</p>
          <p className="font-medium text-muted-foreground text-sm">Company:</p>
          <p className="text-sm">{companyName}</p>
          <p className="font-medium text-muted-foreground text-sm">Quantity:</p>
          <p className="text-sm">{quantity} shares</p>
          <p className="font-medium text-muted-foreground text-sm">
            Max Purchase Price:
          </p>
          <p className="text-sm">${maxPurchasePrice?.toFixed(2)}</p>
        </div>
        <div className="rounded-md bg-muted p-3">
          <p className="font-medium text-sm">Total Maximum Cost:</p>
          <p className="font-bold text-lg">
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
