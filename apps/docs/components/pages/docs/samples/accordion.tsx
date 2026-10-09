"use client";

import { useState } from "react";
import { CreditCard, HelpCircle, Settings, User } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function AccordionSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Accordion defaultValue={["item-1"]} className="w-[400px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>
            Yes. It follows the WAI-ARIA accordion pattern.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Is it styled?</AccordionTrigger>
          <AccordionContent>
            Yes. It comes with styles that match the design system.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Is it animated?</AccordionTrigger>
          <AccordionContent>
            Yes. The panel animates when it opens and closes.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SampleFrame>
  );
}

export function AccordionMultipleSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Accordion multiple className="w-[400px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>First section</AccordionTrigger>
          <AccordionContent>
            This section can be open at the same time as others.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Second section</AccordionTrigger>
          <AccordionContent>
            Multiple sections can be expanded simultaneously.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Third section</AccordionTrigger>
          <AccordionContent>Try opening all three at once.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </SampleFrame>
  );
}

export function AccordionWithIconsSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Accordion className="w-[400px]">
        <AccordionItem value="account">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <User className="size-4" />
              Account settings
            </span>
          </AccordionTrigger>
          <AccordionContent>
            Manage your account details, profile picture, and personal
            information.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="billing">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <CreditCard className="size-4" />
              Billing
            </span>
          </AccordionTrigger>
          <AccordionContent>
            View your billing history, manage payment methods, and update your
            subscription.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="preferences">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <Settings className="size-4" />
              Preferences
            </span>
          </AccordionTrigger>
          <AccordionContent>
            Customize your experience with notification and display settings.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SampleFrame>
  );
}

export function AccordionControlledSample() {
  const [value, setValue] = useState(["item-1"]);

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-4 p-6">
      <Accordion value={value} onValueChange={setValue} className="w-[400px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>Overview</AccordionTrigger>
          <AccordionContent>
            This is the overview section content.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent>
            This is the details section content.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Advanced</AccordionTrigger>
          <AccordionContent>
            This is the advanced section content.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <p className="text-muted-foreground text-sm">
        Current value: <code className="font-mono">{value[0] ?? "none"}</code>
      </p>
    </SampleFrame>
  );
}

export function AccordionFAQSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <div className="w-[500px]">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="size-5" />
          <h3 className="text-lg font-semibold">Frequently asked questions</h3>
        </div>
        <Accordion>
          <AccordionItem value="faq-1">
            <AccordionTrigger>
              What payment methods do you accept?
            </AccordionTrigger>
            <AccordionContent>
              We accept all major credit cards, PayPal, and bank transfers for
              annual subscriptions.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger>
              Can I cancel my subscription anytime?
            </AccordionTrigger>
            <AccordionContent>
              Yes. Your access continues until the end of the current billing
              period.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger>Do you offer refunds?</AccordionTrigger>
            <AccordionContent>
              We offer a 30-day money-back guarantee for new subscriptions.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </SampleFrame>
  );
}
