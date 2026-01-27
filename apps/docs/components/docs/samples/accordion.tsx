"use client";

import { useState } from "react";
import { CreditCard, Settings, User, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/assistant-ui/accordion";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function AccordionSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Accordion type="single" collapsible className="w-[400px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern for accordions.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Is it styled?</AccordionTrigger>
          <AccordionContent>
            Yes. It comes with default styles that match the other components'
            aesthetic.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Is it animated?</AccordionTrigger>
          <AccordionContent>
            Yes. It's animated by default, but you can disable it if you prefer.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SampleFrame>
  );
}

export function AccordionVariantsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-8 p-6">
      <div className="flex w-[400px] flex-col gap-2">
        <span className="text-muted-foreground text-xs">Default</span>
        <Accordion type="single" collapsible variant="default">
          <AccordionItem value="a">
            <AccordionTrigger>Section A</AccordionTrigger>
            <AccordionContent>Content for section A.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Section B</AccordionTrigger>
            <AccordionContent>Content for section B.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="flex w-[400px] flex-col gap-2">
        <span className="text-muted-foreground text-xs">Outline</span>
        <Accordion type="single" collapsible variant="outline">
          <AccordionItem value="a">
            <AccordionTrigger>Section A</AccordionTrigger>
            <AccordionContent>Content for section A.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Section B</AccordionTrigger>
            <AccordionContent>Content for section B.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="flex w-[400px] flex-col gap-2">
        <span className="text-muted-foreground text-xs">Ghost</span>
        <Accordion type="single" collapsible variant="ghost">
          <AccordionItem value="a">
            <AccordionTrigger>Section A</AccordionTrigger>
            <AccordionContent>Content for section A.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger>Section B</AccordionTrigger>
            <AccordionContent>Content for section B.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </SampleFrame>
  );
}

export function AccordionMultipleSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Accordion type="multiple" className="w-[400px]">
        <AccordionItem value="item-1">
          <AccordionTrigger>First Section</AccordionTrigger>
          <AccordionContent>
            This section can be open at the same time as others.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Second Section</AccordionTrigger>
          <AccordionContent>
            Multiple sections can be expanded simultaneously.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Third Section</AccordionTrigger>
          <AccordionContent>Try opening all three at once!</AccordionContent>
        </AccordionItem>
      </Accordion>
    </SampleFrame>
  );
}

export function AccordionWithIconsSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Accordion
        type="single"
        collapsible
        variant="outline"
        className="w-[400px]"
      >
        <AccordionItem value="account">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <User className="size-4" />
              Account Settings
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
            View your billing history, manage payment methods, and update
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
  const [value, setValue] = useState("item-1");

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-4 p-6">
      <Accordion
        type="single"
        collapsible
        value={value}
        onValueChange={setValue}
        className="w-[400px]"
      >
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
        Current value: <code className="font-mono">{value ?? "none"}</code>
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
          <h3 className="font-semibold text-lg">Frequently Asked Questions</h3>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="faq-1">
            <AccordionTrigger>
              What payment methods do you accept?
            </AccordionTrigger>
            <AccordionContent>
              We accept all major credit cards (Visa, MasterCard, American
              Express), PayPal, and bank transfers for annual subscriptions.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger>
              Can I cancel my subscription anytime?
            </AccordionTrigger>
            <AccordionContent>
              Yes, you can cancel your subscription at any time. Your access
              will continue until the end of your current billing period.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger>Do you offer refunds?</AccordionTrigger>
            <AccordionContent>
              We offer a 30-day money-back guarantee for all new subscriptions.
              Contact our support team to request a refund.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-4">
            <AccordionTrigger>How do I contact support?</AccordionTrigger>
            <AccordionContent>
              You can reach our support team via email at support@example.com or
              through the live chat feature in the bottom right corner.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </SampleFrame>
  );
}
