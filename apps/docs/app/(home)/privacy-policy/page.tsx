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
      "If you are in the European Economic Area, the United Kingdom, or Switzerland, we rely on these legal bases:",
      "Contract: to create and run your account, provide the AI assistant and the other features you ask for, and handle your purchases.",
      'Legitimate interests: to keep the Services secure, prevent abuse and limit usage, log and review AI assistant conversations to monitor quality, safety, abuse, and cost, measure how the Services are used with cookieless analytics, answer sales inquiries, and protect our legal rights. We have weighed these interests against your rights. You can object to this processing at any time, as described in the section titled "What Are Your Privacy Rights?"',
      'Consent: for the browser analytics that ask for it in our consent banner, as described in the section titled "Do We Use Cookies And Other Tracking Technologies?" You can withdraw consent at any time in cookie settings. Withdrawing does not affect processing that happened before.',
      "Legal obligation: where the law requires us to process or keep information. In rare cases we may also process information to protect someone's vital interests.",
      "If you are located in Canada, we may process your information if you have given us express or implied consent, or in limited situations where processing without consent is legally permitted.",
    ],
  },
  {
    title: "4. When And With Whom Do We Share Your Personal Information?",
    body: [
      "We may share information in specific situations and with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work.",
      "The categories of third parties we may share personal information with include cloud computing services, AI platforms, payment processors, and website hosting service providers.",
      "When you use assistant-ui.com, these service providers receive personal information:",
      'PostHog receives product analytics events, error reports from your browser and from our servers, and the AI assistant logs described in the section titled "Do We Offer Artificial Intelligence-Based Products?"',
      "Axiom receives the same AI assistant logs, including details that PostHog drops when it ingests them. It also receives our hosting logs from Vercel, which include your IP address, browser details, the page you requested, and the referring page. We use it to monitor and debug the Services.",
      "Assistant Cloud, our own hosted backend, stores your AI assistant conversations and their attachments so you can return to them. It also receives the same AI assistant logs, including details that PostHog drops when it ingests them, and reports from your browser on each assistant reply, such as the tools it called, its output, errors, and token usage.",
      'Our own AI gateway, which runs on Cloudflare, receives your messages and the context needed to answer them. It sends them through an AI routing service, such as Vercel AI Gateway or Cloudflare AI Gateway, to the AI model providers described in the section titled "Do We Offer Artificial Intelligence-Based Products?"',
      'Vercel hosts the website and receives your requests to it, as well as the analytics described in the section titled "Do We Use Cookies And Other Tracking Technologies?" When we turn on Vercel\'s tracing to debug the site, Vercel also receives the AI assistant logs.',
      "Upstash receives your IP address, an anonymous session identifier, your account identifier when you are signed in, and AI assistant conversation identifiers, which we use to limit how often the AI assistant and other features can be used.",
      "Cloudflare receives the details you submit in the contact sales form and delivers them to our team by email. The form then opens Cal.com with your name, email, and notes filled in so you can book a call.",
      "Stripe processes your payment details when you buy a paid plan from us.",
      "Blaxel runs the live previews in the Xulux playground, so your browser loads those previews from Blaxel.",
      "Open-Meteo receives the location used for a weather lookup in one of our demos. When you ask the AI assistant for the weather, our servers send the place name or coordinates. One remote-components demo looks up a fixed city from your browser, so Open-Meteo also sees your IP address and browser details there. Google Fonts serves the fonts for one of our interactive demos, and Unsplash and Pravatar serve the sample photos and avatars in our component demos. Your browser loads these directly, so they see your IP address and browser details.",
      "We may also share or transfer information in connection with a merger, sale of company assets, financing, acquisition, or similar business transfer. We may share information with affiliates and require those affiliates to honor this Privacy Notice.",
      "We may disclose information when we believe in good faith that the law requires it, such as to answer a subpoena, court order, or other legal process, and when it is needed to protect the rights, property, or safety of AgentbaseAI Inc., our users, or others, or to enforce our terms.",
    ],
  },
  {
    title: "5. Do We Use Cookies And Other Tracking Technologies?",
    body: [
      "We use a small number of cookies and similar technologies to operate the Services and to understand how they are used. We do not use third-party advertising cookies, and we do not sell or share your personal information for cross-context behavioral advertising.",
      "For product analytics and error monitoring we use PostHog, which stores a pseudonymous identifier in cookies and local storage on your device. Analytics events may include the pages you visit and the search queries you enter on the site. We also use Vercel Analytics, which is cookieless and collects page views and the same site events as PostHog, including search queries, and Vercel Speed Insights, which is cookieless and collects performance metrics. We also use a self-hosted instance of Umami, a cookieless, privacy-focused analytics tool that measures a small random sample of visits. When you use the AI assistant, your browser can also send Assistant Cloud events about how you use it, such as copying a reply, clicking a suggestion, or switching threads.",
      "We use one strictly necessary cookie (aui_anon_session) to prevent abuse of the free AI assistant on our website. It contains a random, signed identifier and expires after 24 hours. Assistant Cloud also keeps a sign-in token in your browser's local storage so your AI assistant conversations stay available to you, and the site keeps your preferences and the state of our demos there.",
      'If you are visiting from the European Economic Area, the United Kingdom, or Switzerland, PostHog\'s analytics in your browser, the site events we send to Vercel Analytics, and the Assistant Cloud usage events run only after you accept them through our consent banner, and you can decline them there. Vercel Analytics page views and Speed Insights are cookieless and store nothing on your device, so they run before you answer the banner; declining stops them. Our self-hosted Umami also runs before you answer, and it stores one sampling flag on your device, because it measures audience on our own site only, is never shared with anyone, and builds no profile of you across sites. Declining stops Umami as well, both for the rest of that visit and afterwards. Wherever you are located, we honor the Global Privacy Control (GPC) signal: if your browser broadcasts GPC, we disable all of these analytics for your visit. Some things are not affected, because they are needed to run the Services and do not measure your browsing: the strictly necessary cookie and local storage described above, and the logging and storage of AI assistant conversations described in the section titled "Do We Offer Artificial Intelligence-Based Products?", including the reports your browser sends to Assistant Cloud about each assistant reply.',
      <CookieSettingsNotice key="cookie-settings" />,
    ],
  },
  {
    title: "6. Do We Offer Artificial Intelligence-Based Products?",
    body: [
      "We offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies. These tools are designed to enhance your experience and provide innovative solutions.",
      "The AI assistant on our website runs on models from OpenAI, Anthropic, DeepSeek, and Z.ai. Our AI gateway and the routing services behind it send each request to the provider of the model that answers it, or to a cloud service that hosts that model. Your input, output, and personal information may be shared with and processed by these AI Service Providers to enable your use of our AI Products.",
      "When you use the AI assistant on our website, your messages, the responses generated for you, and the tools called to answer them are processed by our AI Service Providers. They are also logged to PostHog, Axiom, and Assistant Cloud, together with usage metadata such as the model, token counts, and cost, and a pseudonymous identifier derived from your IP address, so that we can monitor quality, safety, abuse, and cost. Assistant Cloud also stores the conversation itself so you can return to it. This logging is how we operate the assistant rather than a way of measuring your browsing, so it is not covered by the analytics consent banner or the Global Privacy Control signal, and it applies wherever you are located. Please do not include sensitive personal information in your messages to the assistant.",
      "There is no setting that turns this logging off. If you do not want your messages logged, do not use the AI assistant. To ask for a copy of your conversations, ask us to delete them, or object to this processing, email privacy@assistant-ui.com. We may keep some records where the law allows, for example to prevent abuse or to meet legal obligations.",
      "AI output can be wrong, incomplete, or out of date. Check it before you rely on it.",
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
    title: "8. How Long Do We Keep Your Information, And Where?",
    body: [
      "Data is processed in the United States and kept only as long as needed for the purposes above, unless the law requires longer.",
      "Some service providers may also process your information in other countries. AI model providers and the AI gateway may handle your messages wherever the model that answers them runs. When we transfer personal information out of the European Economic Area, the United Kingdom, or Switzerland, we rely on Standard Contractual Clauses, and the EU-US Data Privacy Framework where a provider is certified.",
      "If you use the Services from outside the United States, you send your information to us in the United States, where data protection laws may differ from those where you live.",
      "When we have no ongoing legitimate business need to process your personal information, we will delete or anonymize it. If deletion or anonymization is not possible, we will securely store the information and isolate it from further processing until deletion is possible.",
    ],
  },
  {
    title: "9. How Do We Keep Your Information Safe?",
    body: [
      "We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of personal information we process.",
      "No electronic transmission over the Internet or information storage technology can be guaranteed to be completely secure, so we cannot promise or guarantee that unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.",
      "You send information to the Services at your own risk. Keep your sign-in details safe, and tell us at privacy@assistant-ui.com if you think your account has been compromised.",
    ],
  },
  {
    title: "10. Do We Collect Information From Minors?",
    body: [
      "The Services are meant for adults and are not directed to children. You must be at least 18 years old to use them.",
      "We do not knowingly collect personal information from children under 13, or under 16 in the European Economic Area, the United Kingdom, or Switzerland. We do not knowingly collect, solicit data from, or market to anyone under 18, nor do we knowingly sell or share their personal information.",
      "If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of data we may have collected from children under age 18, contact us at privacy@assistant-ui.com.",
    ],
  },
  {
    title: "11. What Are Your Privacy Rights?",
    body: [
      "Depending on where you are located, you may have rights that allow you greater access to and control over your personal information. These may include the right to request access, correction, deletion, restriction of processing, data portability, objection to processing, and freedom from automated decision-making in certain circumstances.",
      "To use any of these rights, email privacy@assistant-ui.com. We will answer within the time the law allows. We may ask for information to verify your identity before we act, and we may decline requests we cannot verify or that the law lets us refuse. You may use an authorized agent, and we may ask the agent for proof that you authorized them. We will not discriminate against you for using your rights.",
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
      "In the past twelve months we collected these categories of personal information: identifiers, such as your name, email address, IP address, and account and pseudonymous identifiers; internet activity, such as pages viewed, site searches, site events, and AI assistant conversations; professional information you give in the contact sales form, such as your company and role; and commercial information when you buy from us. We collect it from you, your browser, and your sign-in provider, for the purposes described in this notice, and we disclose it to the service providers listed above for those purposes. We do not use sensitive personal information to infer characteristics about you.",
      "We have not sold or shared personal information to third parties for a business or commercial purpose in the preceding twelve months.",
      "If we decline your request, you can appeal by replying to our answer. If we deny your appeal, you may contact your state attorney general.",
      'California residents may request information under California\'s "Shine The Light" law by submitting a written request using the contact details below.',
    ],
  },
  {
    title: "14. What About Third-Party Links And Services?",
    body: [
      "The Services link to and embed websites and services we do not run, such as GitHub, social sign-in providers, Cal.com, and the outside services our demos use. This Privacy Notice does not cover them. We are not responsible for their content or their privacy practices, and their own terms and privacy notices apply when you use them.",
    ],
  },
  {
    title: "15. Do We Make Updates To This Notice?",
    body: [
      "We may update this Privacy Notice from time to time. The updated version will be indicated by an updated date at the top of this Privacy Notice. If we make material changes, we may notify you by prominently posting a notice or directly sending you a notification.",
      "Changes take effect when we post them. If you keep using the Services after that, the updated notice applies to you.",
    ],
  },
  {
    title: "16. How Can You Contact Us About This Notice?",
    body: [
      "AgentbaseAI Inc. is responsible for your personal information under this notice.",
      "If you have questions or comments about this notice, you may email us at privacy@assistant-ui.com or contact us by post at AgentbaseAI Inc., 580 Howard St, Suite 201, San Francisco, CA 94105, United States.",
    ],
  },
  {
    title: "17. How Can You Review, Update, Or Delete Your Data?",
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
            Last updated November 14, 2026
          </p>
          <p className="text-muted-foreground mt-6 leading-relaxed">
            This Privacy Notice for AgentbaseAI Inc. (&quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;) describes how and why we might
            access, collect, store, use, and/or share your personal information
            when you use our services, including when you visit assistant-ui.com
            or engage with us in other related ways.
          </p>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            This notice covers only the services described in it. It does not
            cover apps that others build with the open-source assistant-ui
            libraries, or the data our business customers process about their
            own users through Assistant Cloud. Those customers decide how that
            data is used, under their own privacy notices and our agreement with
            them.
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
