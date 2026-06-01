import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { createOgMetadata } from "@/lib/og";

const title = "Terms of Service — assistant-ui";
const description =
  "Terms of Service for AgentbaseAI Inc. and assistant-ui services.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const sections = [
  {
    title: "1. Our Services",
    body: [
      "The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation.",
      "The Services are not tailored to comply with industry-specific regulations, including HIPAA or FISMA. You may not use the Services in a way that would violate the Gramm-Leach-Bliley Act.",
    ],
  },
  {
    title: "2. Intellectual Property Rights",
    body: [
      "We own or license all intellectual property rights in our Services, including source code, databases, functionality, software, website designs, audio, video, text, photographs, graphics, trademarks, service marks, and logos.",
      "Subject to your compliance with these Legal Terms, we grant you a non-exclusive, non-transferable, revocable license to access the Services and download or print a copy of any portion of the Content to which you have properly gained access solely for your internal business purpose.",
      "No part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose without our express prior written permission.",
      "By directly sending us any question, comment, suggestion, idea, feedback, or other information about the Services, you agree to assign to us all intellectual property rights in that submission.",
    ],
  },
  {
    title: "3. User Representations",
    body: [
      "By using the Services, you represent and warrant that your registration information is true, accurate, current, and complete; that you will maintain its accuracy; that you have legal capacity and agree to comply with these Legal Terms; that you are not a minor in your jurisdiction; that you will not access the Services through automated or non-human means; that you will not use the Services for an illegal or unauthorized purpose; and that your use will not violate applicable law or regulation.",
    ],
  },
  {
    title: "4. User Registration",
    body: [
      "You may be required to register to use the Services. You agree to keep your password confidential and are responsible for all use of your account and password.",
      "We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that the username is inappropriate, obscene, or otherwise objectionable.",
    ],
  },
  {
    title: "5. Purchases And Payment",
    body: [
      "We accept Visa, Mastercard, American Express, and Discover.",
      "You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Services and to promptly update account and payment information so we can complete your transactions and contact you as needed.",
      "You agree to pay all charges at the prices then in effect, and you authorize us to charge your chosen payment provider for those amounts. We reserve the right to correct pricing errors and to refuse, limit, or cancel orders in our sole discretion.",
    ],
  },
  {
    title: "6. Subscriptions",
    body: [
      "Your subscription will continue and automatically renew unless canceled. You consent to recurring charges until you cancel the applicable order.",
      "All purchases are non-refundable. You can cancel your subscription at any time by logging into your account. Cancellation takes effect at the end of the current paid term.",
      "We may make changes to subscription fees and will communicate price changes in accordance with applicable law.",
    ],
  },
  {
    title: "7. Prohibited Activities",
    body: [
      "You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with commercial endeavors except those specifically endorsed or approved by us.",
      "You agree not to systematically retrieve content, trick or defraud us or other users, interfere with security-related features, disparage or harm us or the Services, harass or harm others, submit false reports, violate laws, frame or link to the Services without authorization, upload harmful material, use automated systems, delete proprietary notices, impersonate others, collect user information, bypass access restrictions, reverse engineer software except as permitted by law, or use the Services to compete with us.",
    ],
  },
  {
    title: "8. User Generated Contributions",
    body: [
      "The Services do not offer users the ability to submit or post content. If we provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content or materials, those contributions may be viewable by other users and through third-party websites.",
      "When you create or make available Contributions, you represent and warrant that they do not infringe third-party rights; that you have the necessary rights and permissions; that they are not false, misleading, unlawful, harassing, abusive, discriminatory, obscene, violent, or otherwise objectionable; and that they do not violate these Legal Terms or applicable law.",
    ],
  },
  {
    title: "9. Contribution License",
    body: [
      "You and the Services agree that we may access, store, process, and use any information and personal data that you provide following the terms of the Privacy Policy and your choices.",
      "By submitting suggestions or other feedback regarding the Services, you agree that we can use and share that feedback for any purpose without compensation to you.",
      "We do not assert ownership over your Contributions. You retain full ownership of your Contributions and any associated intellectual property rights. You are solely responsible for your Contributions and agree to exonerate us from responsibility and refrain from legal action against us regarding them.",
    ],
  },
  {
    title: "10. Social Media",
    body: [
      "As part of the functionality of the Services, you may link your account with third-party accounts by providing login information or allowing us access as permitted by those accounts' terms.",
      "By granting access, you understand that we may access, make available, and store content from those third-party accounts so it is available through the Services. Your relationship with third-party service providers is governed solely by your agreements with those providers.",
      "You can deactivate the connection between the Services and your third-party account by contacting us or through account settings, if applicable.",
    ],
  },
  {
    title: "11. Third-Party Websites And Content",
    body: [
      "The Services may contain links to third-party websites and content. We are not responsible for third-party websites or content, including their accuracy, reliability, privacy practices, or policies.",
      "If you access third-party websites or content, you do so at your own risk and should review the applicable terms and policies.",
    ],
  },
  {
    title: "12. Services Management",
    body: [
      "We reserve the right, but not the obligation, to monitor the Services for violations, take appropriate legal action, refuse or restrict access to Contributions, remove excessive or burdensome files and content, and otherwise manage the Services to protect our rights and property and facilitate proper operation.",
    ],
  },
  {
    title: "13. Privacy Policy",
    body: [
      <>
        We care about data privacy and security. Please review our{" "}
        <Link
          href="/privacy-policy"
          className="text-foreground underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        . By using the Services, you agree to be bound by our Privacy Policy,
        which is incorporated into these Legal Terms.
      </>,
      "The Services are hosted in the United States. If you access the Services from another region with laws or requirements governing personal data collection, use, or disclosure that differ from applicable laws in the United States, you consent to have your data transferred to and processed in the United States.",
    ],
  },
  {
    title: "14. Term And Termination",
    body: [
      "These Legal Terms remain in full force and effect while you use the Services. We reserve the right, in our sole discretion and without notice or liability, to deny access to and use of the Services to any person for any reason or no reason, including breach of these Legal Terms or applicable law.",
      "We may terminate your use or participation in the Services or delete your account and any content or information you posted at any time, without warning, in our sole discretion.",
    ],
  },
  {
    title: "15. Modifications And Interruptions",
    body: [
      "We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice, and we have no obligation to update information on our Services.",
      "We cannot guarantee the Services will be available at all times. We may experience hardware, software, or other issues or perform maintenance that results in interruptions, delays, or errors.",
    ],
  },
  {
    title: "16. Governing Law",
    body: [
      "These Legal Terms and your use of the Services are governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.",
    ],
  },
  {
    title: "17. Dispute Resolution",
    body: [
      "The parties agree to first attempt to negotiate any dispute informally for at least thirty days before initiating arbitration.",
      "If the parties cannot resolve a dispute through informal negotiations, the dispute will be finally and exclusively resolved by binding arbitration under the Commercial Arbitration Rules of the American Arbitration Association and, where appropriate, the AAA Consumer Rules.",
      "Any arbitration will be limited to the dispute between the parties individually. There is no right or authority for a dispute to be arbitrated or brought as a class action or representative proceeding.",
      "Disputes seeking to enforce or protect intellectual property rights, disputes related to theft, piracy, invasion of privacy, unauthorized use, and claims for injunctive relief are not subject to the informal negotiation and arbitration provisions.",
    ],
  },
  {
    title: "18. Corrections",
    body: [
      "There may be information on the Services that contains typographical errors, inaccuracies, or omissions. We reserve the right to correct errors, inaccuracies, or omissions and to change or update information on the Services at any time, without prior notice.",
    ],
  },
  {
    title: "19. Disclaimer",
    body: [
      "The Services are provided on an as-is and as-available basis. Your use of the Services is at your sole risk.",
      "To the fullest extent permitted by law, we disclaim all warranties, express or implied, in connection with the Services and your use of them, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
    ],
  },
  {
    title: "20. Limitations Of Liability",
    body: [
      "In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages arising from your use of the Services, even if we have been advised of the possibility of such damages.",
      "Our liability to you for any cause will at all times be limited to the amount paid, if any, by you to us during the six-month period prior to the cause of action arising, except where prohibited by applicable law.",
    ],
  },
  {
    title: "21. Indemnification",
    body: [
      "You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand arising out of your use of the Services, breach of these Legal Terms, breach of your representations and warranties, violation of third-party rights, or harmful acts toward another user.",
    ],
  },
  {
    title: "22. User Data",
    body: [
      "We will maintain certain data that you transmit to the Services for managing the performance of the Services, as well as data relating to your use of the Services. You are solely responsible for all data that you transmit or that relates to your activity using the Services.",
    ],
  },
  {
    title: "23. Electronic Communications, Transactions, And Signatures",
    body: [
      "Visiting the Services, sending emails, and completing online forms constitute electronic communications. You consent to receive electronic communications and agree that electronic agreements, notices, disclosures, and communications satisfy any legal requirement that such communication be in writing.",
      "You agree to the use of electronic signatures, contracts, orders, and records, and to electronic delivery of notices, policies, and records of transactions initiated or completed by us or via the Services.",
    ],
  },
  {
    title: "24. California Users And Residents",
    body: [
      "If a complaint with us is not satisfactorily resolved, California users and residents can contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, California 95834 or by telephone at (800) 952-5210 or (916) 445-1254.",
    ],
  },
  {
    title: "25. Miscellaneous",
    body: [
      "These Legal Terms and any policies or operating rules posted by us constitute the entire agreement between you and us. Our failure to exercise or enforce any right or provision does not operate as a waiver.",
      "If any provision or part of a provision is determined to be unlawful, void, or unenforceable, that provision or part is deemed severable and does not affect the validity and enforceability of the remaining provisions.",
    ],
  },
  {
    title: "26. Contact Us",
    body: [
      "To resolve a complaint regarding the Services or to receive further information regarding use of the Services, contact AgentbaseAI Inc., 340 Fremont Street, Apt 2306, San Francisco, CA 94105, United States, or email contact@assistant-ui.com.",
    ],
  },
] satisfies {
  title: string;
  body: ReactNode[];
}[];

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-muted-foreground mb-3 text-sm">Legal</p>
        <h1 className="text-3xl font-medium tracking-tight">
          Terms of Service
        </h1>
        <p className="text-muted-foreground mt-3">Last updated July 18, 2024</p>
        <p className="text-muted-foreground mt-6 leading-relaxed">
          We are AgentbaseAI Inc. (&quot;Company,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;), a company registered in Delaware.
          We operate the website https://www.assistant-ui.com, as well as any
          other related products and services that refer or link to these legal
          terms.
        </p>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          These Legal Terms constitute a legally binding agreement between you
          and AgentbaseAI Inc. concerning your access to and use of the
          Services. If you do not agree with all of these Legal Terms, you are
          prohibited from using the Services and must discontinue use
          immediately.
        </p>
      </header>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-medium tracking-tight">
              {section.title}
            </h2>
            <div className="mt-4 space-y-4">
              {section.body.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-muted-foreground leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
