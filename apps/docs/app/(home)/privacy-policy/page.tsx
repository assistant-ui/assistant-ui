import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createOgMetadata } from "@/lib/og";
import { PageCopy, PageFrame } from "@/components/shared/page-frame";
import { CookieSettingsNotice } from "@/components/cookie-settings-link";

const title = "Privacy Policy";
const description =
  "Privacy Policy for AgentbaseAI Inc. and assistant-ui services.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const sections = [
  {
    title: "1. What Information Do We Collect?",
    body: [
      "We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, participate in activities on the Services, or otherwise contact us.",
      "The personal information we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. It may include names, email addresses, usernames, passwords, contact or authentication data, and billing addresses.",
      <>
        We do not ask for or deliberately collect sensitive information, though
        we do log the messages you send to the AI assistant, so anything
        sensitive you choose to put in them is processed as described in the
        section titled &quot;Do We Offer Artificial Intelligence-Based
        Products?&quot; If you choose to make purchases, payment data is handled
        and stored by Stripe. You may find Stripe&apos;s privacy notice at{" "}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-4"
        >
          https://stripe.com/privacy
        </a>
        .
      </>,
      'If you choose to register or log in using a social media account, we will collect certain profile information from the social media provider as described in the section titled "How Do We Handle Your Social Logins?"',
      'We also collect certain information automatically when you visit the Services, such as your IP address, browser and device characteristics, referring URLs, and the pages you view. We use this information for security, abuse prevention, and analytics as described in the section titled "Do We Use Cookies And Other Tracking Technologies?"',
    ],
  },
  {
    title: "2. How Do We Process Your Information?",
    body: [
      "We process your information to provide, improve, and administer our Services, communicate with you, protect our Services, prevent fraud, and comply with law. We may also process your information for other purposes with your consent.",
      "This includes facilitating account creation and authentication, delivering Services, responding to inquiries, sending administrative information, fulfilling and managing orders, protecting our Services, and saving or protecting an individual's vital interests.",
    ],
  },
  {
    title:
      "3. What Legal Bases Do We Rely On To Process Your Personal Information?",
    body: [
      "If you are located in the EU or UK, we may rely on consent, performance of a contract, legitimate interests, legal obligations, and vital interests to process your personal information.",
      "If you are located in Canada, we may process your information if you have given us express or implied consent, or in limited situations where processing without consent is legally permitted.",
    ],
  },
  {
    title: "4. When And With Whom Do We Share Your Personal Information?",
    body: [
      "We may share information in specific situations and with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work.",
      "The categories of third parties we may share personal information with include cloud computing services, AI platforms, payment processors, and website hosting service providers.",
      "We may also share or transfer information in connection with a merger, sale of company assets, financing, acquisition, or similar business transfer. We may share information with affiliates and require those affiliates to honor this Privacy Notice.",
    ],
  },
  {
    title: "5. Do We Use Cookies And Other Tracking Technologies?",
    body: [
      "We use a small number of cookies and similar technologies to operate the Services and to understand how they are used. We do not use third-party advertising cookies, and we do not sell or share your personal information for cross-context behavioral advertising.",
      "For product analytics and error monitoring we use PostHog, which stores a pseudonymous identifier in cookies and local storage on your device. Analytics events may include the pages you visit and the search queries you enter on the site. We also use Vercel Analytics and Vercel Speed Insights, which are cookieless and collect aggregate page-view and performance metrics, and a self-hosted instance of Umami, a cookieless, privacy-focused analytics tool that measures a small random sample of visits.",
      "We use one strictly necessary cookie (aui_anon_session) to prevent abuse of the free AI assistant on our website. It contains a random, signed identifier and expires after 24 hours.",
      'If you are visiting from the European Economic Area, the United Kingdom, or Switzerland, PostHog\'s analytics in your browser run only after you accept them through our consent banner, and you can decline them there. Vercel Analytics and Speed Insights are cookieless and store nothing on your device, so they run before you answer the banner; declining stops them. Our self-hosted Umami also runs before you answer, and it stores one sampling flag on your device, because it measures audience on our own site only, is never shared with anyone, and builds no profile of you across sites. Declining stops Umami as well, both for the rest of that visit and afterwards. Wherever you are located, we honor the Global Privacy Control (GPC) signal: if your browser broadcasts GPC, we disable all three of these analytics tools for your visit. Two things are not affected, because neither measures your browsing: the strictly necessary cookie described above, and the server-side logging of AI assistant conversations described in the section titled "Do We Offer Artificial Intelligence-Based Products?"',
      <CookieSettingsNotice key="cookie-settings" />,
    ],
  },
  {
    title: "6. Do We Offer Artificial Intelligence-Based Products?",
    body: [
      "We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies. These tools are designed to enhance your experience and provide innovative solutions.",
      "We provide AI Products through third-party service providers, including OpenAI, Anthropic, Microsoft Azure AI, and Google Cloud AI. Your input, output, and personal information may be shared with and processed by these AI Service Providers to enable your use of our AI Products.",
      "When you use the AI assistant on our website, your messages and the responses generated for you are processed by our AI Service Providers and are logged to PostHog, together with usage metadata such as the model, token counts, and cost, so that we can monitor quality, safety, abuse, and cost. This logging is how we operate the assistant rather than a way of measuring your browsing, so it is not covered by the analytics consent banner or the Global Privacy Control signal, and it applies wherever you are located. Please do not include sensitive personal information in your messages to the assistant.",
      "Our AI Products are designed for AI automation and AI applications. To opt out, you can log in to your account settings and update your user account.",
    ],
  },
  {
    title: "7. How Do We Handle Your Social Logins?",
    body: [
      "If you choose to register or log in using third-party social media account details, we will receive certain profile information from your social media provider. This information may include your name, email address, friends list, profile picture, and other information you choose to make public on that platform.",
      "We use this information only for the purposes described in this Privacy Notice or otherwise made clear to you on the relevant Services. We recommend reviewing your social media provider's privacy notice to understand how they handle your information.",
    ],
  },
  {
    title: "8. How Long Do We Keep Your Information?",
    body: [
      "We keep personal information only for as long as necessary for the purposes set out in this Privacy Notice unless a longer retention period is required or permitted by law.",
      "When we have no ongoing legitimate business need to process your personal information, we will delete or anonymize it. If deletion or anonymization is not possible, we will securely store the information and isolate it from further processing until deletion is possible.",
    ],
  },
  {
    title: "9. How Do We Keep Your Information Safe?",
    body: [
      "We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of personal information we process.",
      "No electronic transmission over the Internet or information storage technology can be guaranteed to be completely secure, so we cannot promise or guarantee that unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.",
    ],
  },
  {
    title: "10. Do We Collect Information From Minors?",
    body: [
      "We do not knowingly collect, solicit data from, or market to children under 18 years of age, nor do we knowingly sell such personal information.",
      "If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of data we may have collected from children under age 18, contact us at privacy@assistant-ui.com.",
    ],
  },
  {
    title: "11. What Are Your Privacy Rights?",
    body: [
      "Depending on where you are located, you may have rights that allow you greater access to and control over your personal information. These may include the right to request access, correction, deletion, restriction of processing, data portability, objection to processing, and freedom from automated decision-making in certain circumstances.",
      "If you are located in the EEA or UK and believe we are unlawfully processing your personal information, you may complain to your Member State data protection authority or UK data protection authority. If you are located in Switzerland, you may contact the Federal Data Protection and Information Commissioner.",
      "You can withdraw consent at any time when we rely on consent to process your personal information. You can unsubscribe from marketing and promotional communications by clicking the unsubscribe link in those emails or by contacting us.",
    ],
  },
  {
    title: "12. Controls For Do-Not-Track And Global Privacy Control Features",
    body: [
      "Most web browsers and some mobile operating systems and applications include a Do-Not-Track feature or setting. At this stage, no uniform technology standard for recognizing and implementing Do-Not-Track signals has been finalized, so we do not currently respond to them.",
      'We do recognize and honor the Global Privacy Control (GPC) signal. If your browser or browser extension broadcasts GPC, we treat it as an opt-out and disable the browser analytics described in the section titled "Do We Use Cookies And Other Tracking Technologies?" for your visit.',
    ],
  },
  {
    title: "13. Do United States Residents Have Specific Privacy Rights?",
    body: [
      "If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Montana, New Hampshire, New Jersey, Oregon, Tennessee, Texas, Utah, or Virginia, you may have rights to request access to and receive details about the personal information we maintain about you, correct inaccuracies, obtain a copy of your personal information, delete your personal information, and withdraw consent to our processing of your personal information.",
      "You may also have the right to opt out of processing if it is used for targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects. We honor Global Privacy Control opt-out signals.",
      "We have not sold or shared personal information to third parties for a business or commercial purpose in the preceding twelve months.",
      'California residents may request information under California\'s "Shine The Light" law by submitting a written request using the contact details below.',
    ],
  },
  {
    title: "14. Do We Make Updates To This Notice?",
    body: [
      "We may update this Privacy Notice from time to time. The updated version will be indicated by an updated date at the top of this Privacy Notice. If we make material changes, we may notify you by prominently posting a notice or directly sending you a notification.",
    ],
  },
  {
    title: "15. How Can You Contact Us About This Notice?",
    body: [
      "If you have questions or comments about this notice, you may email us at privacy@assistant-ui.com or contact us by post at AgentbaseAI Inc., 340 Fremont Street, Apt 2306, San Francisco, CA 94105, United States.",
    ],
  },
  {
    title: "16. How Can You Review, Update, Or Delete Your Data?",
    body: [
      "Based on the applicable laws of your country or state of residence, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correction of inaccuracies, or deletion of your personal information. You may also have the right to withdraw consent to our processing of your personal information.",
      "To request review, update, or deletion of your personal information, contact privacy@assistant-ui.com.",
    ],
  },
] satisfies {
  title: string;
  body: ReactNode[];
}[];

export default function PrivacyPolicyPage() {
  return (
    <PageFrame pad="sub">
      <PageCopy>
        <header className="mb-12">
          <p className="text-muted-foreground mb-3 text-sm">Legal</p>
          <h1 className="text-3xl font-medium tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-3">
            Last updated August 31, 2026
          </p>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            This Privacy Notice for AgentbaseAI Inc. (&quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) describes how and why we might
            access, collect, store, use, and/or share your personal information
            when you use our services, including when you visit assistant-ui.com
            or engage with us in other related ways.
          </p>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            If you have questions or concerns, contact us at{" "}
            <a
              href="mailto:privacy@assistant-ui.com"
              className="text-foreground underline underline-offset-4"
            >
              privacy@assistant-ui.com
            </a>
            .
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
      </PageCopy>
    </PageFrame>
  );
}
