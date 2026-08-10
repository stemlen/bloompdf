"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, BookOpen, Shield, Scale, FileText, User, Settings, CreditCard, Copyright, Headphones, AlertTriangle, Globe, Megaphone, Lock, Zap, Power, Link2, Scroll, RefreshCw, Mail, ArrowRightLeft, Gavel, MoreHorizontal, Layers, PenLine } from "lucide-react";

// ─── Section definitions ──────────────────────────────────────────────────────

interface Section {
  id: string;
  title: string;
  icon: React.ElementType;
  subsections?: { id: string; title: string }[];
}

const sections: Section[] = [
  {
    id: "scope",
    title: "Scope",
    icon: BookOpen,
  },
  {
    id: "changes-eligibility",
    title: "Changes & Eligibility",
    icon: RefreshCw,
    subsections: [
      { id: "privacy-policy-ref", title: "Privacy Policy" },
    ],
  },
  {
    id: "limited-use-license",
    title: "Limited Use License",
    icon: FileText,
  },
  {
    id: "use-of-services",
    title: "Use of the Services",
    icon: Settings,
  },
  {
    id: "prohibited-modification",
    title: "Prohibited Modification & AI/ML",
    icon: Shield,
  },
  {
    id: "user-accounts",
    title: "User Accounts",
    icon: User,
  },
  {
    id: "user-conduct",
    title: "User Conduct",
    icon: AlertTriangle,
  },
  {
    id: "user-content",
    title: "User Content",
    icon: FileText,
  },
  {
    id: "fees-billing",
    title: "Fees, Billing & Subscriptions",
    icon: CreditCard,
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    icon: Copyright,
  },
  {
    id: "technical-support",
    title: "Technical Support",
    icon: Headphones,
  },
  {
    id: "fraudulent-practices",
    title: "Fraudulent Practices",
    icon: Lock,
    subsections: [
      { id: "fraud-prevention", title: "A. Fraud Prevention" },
      { id: "fraudulent-payments", title: "B. Fraudulent Payments" },
    ],
  },
  {
    id: "program-updates",
    title: "Program Updates & Availability",
    icon: Zap,
  },
  {
    id: "liability",
    title: "Liability",
    icon: Scale,
    subsections: [
      { id: "bloompdfs-liability", title: "1. BloomPDF's Liability" },
      { id: "users-liability", title: "2. User's Liability" },
    ],
  },
  {
    id: "links-third-party",
    title: "Links & Third-Party Resources",
    icon: Link2,
  },
  {
    id: "social-media-advertising",
    title: "Social Media & Advertising",
    icon: Megaphone,
    subsections: [
      { id: "social-media", title: "(a) Social Media" },
      { id: "advertising", title: "(b) Advertising" },
    ],
  },
  {
    id: "security-attacks",
    title: "Viruses & Security Attacks",
    icon: AlertTriangle,
  },
  {
    id: "force-majeure",
    title: "Events Beyond Our Control",
    icon: Globe,
  },
  {
    id: "fees-billing-payment",
    title: "Fees, Billing & Payment",
    icon: CreditCard,
  },
  {
    id: "right-of-withdrawal",
    title: "Right of Withdrawal",
    icon: ArrowRightLeft,
    subsections: [
      { id: "withdrawal-ad-free", title: "(a) Ad-Free Withdrawal" },
      { id: "consequences-withdrawal", title: "(b) Consequences" },
    ],
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    icon: Lock,
  },
  {
    id: "contact-notifications",
    title: "Contact & Notifications",
    icon: Mail,
  },
  {
    id: "transfer-assignment",
    title: "Transfer & Assignment",
    icon: ArrowRightLeft,
  },
  {
    id: "jurisdiction",
    title: "Jurisdiction & Applicable Law",
    icon: Gavel,
  },
  {
    id: "miscellaneous",
    title: "Miscellaneous",
    icon: MoreHorizontal,
  },
  {
    id: "specific-terms",
    title: "Specific Terms of Services",
    icon: Layers,
    subsections: [
      { id: "digital-signature", title: "Digital Signature Service" },
    ],
  },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

function SidebarItem({
  section,
  active,
  onClick,
}: {
  section: Section;
  active: boolean;
  onClick: (id: string) => void;
}) {
  const Icon = section.icon;
  return (
    <li>
      <button
        onClick={() => onClick(section.id)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm font-medium transition-all duration-150 group",
          active
            ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
        )}
        aria-current={active ? "location" : undefined}
      >
        <Icon
          size={14}
          className={cn(
            "shrink-0 transition-colors",
            active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--primary)]"
          )}
        />
        <span className="truncate leading-tight">{section.title}</span>
        {active && (
          <span className="ml-auto w-1 h-4 rounded-full bg-[var(--primary)] shrink-0" />
        )}
      </button>
      {section.subsections && active && (
        <ul className="mt-1 ml-6 space-y-0.5 border-l border-[var(--border)] pl-3">
          {section.subsections.map((sub) => (
            <li key={sub.id}>
              <button
                onClick={() => onClick(sub.id)}
                className="w-full text-left text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] py-1 transition-colors"
              >
                {sub.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TermsContent() {
  const [activeSection, setActiveSection] = useState<string>("scope");
  const [mobileOpen, setMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const HEADER_OFFSET = 76; // px — navbar height + buffer

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    // Collect all watchable ids from sections + subsections
    const ids: string[] = [];
    sections.forEach((s) => {
      ids.push(s.id);
      s.subsections?.forEach((sub) => ids.push(sub.id));
    });

    const sectionEls = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            // Map subsection back to parent section for sidebar highlight
            const parentSection = sections.find(
              (s) => s.id === id || s.subsections?.some((sub) => sub.id === id)
            );
            if (parentSection) setActiveSection(parentSection.id);
          }
        });
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -60% 0px`,
        threshold: 0,
      }
    );

    sectionEls.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const activeLabel = sections.find((s) => s.id === activeSection)?.title ?? "Table of Contents";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Page header banner ──────────────────────────────────────────────── */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-[1300px] mx-auto w-full px-6 lg:px-12 py-10 md:py-14">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] border border-[var(--border)]">
              <Scale size={22} className="text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--accent-foreground)] border border-[var(--border)]">
                  <Shield size={10} />
                  Legal
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">Last revised: 2026-08-10</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                Terms &amp; Conditions
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
                These Terms and Conditions of Use form a legally binding agreement between you and{" "}
                <span className="font-semibold text-[var(--foreground)]">BloomPDF</span> (operated by{" "}
                <span className="font-semibold text-[var(--foreground)]">Stemlen Private Limited</span>).
                Please read them carefully before using our services.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile ToC Dropdown ──────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-[58px] z-40 border-b border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-sm">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--foreground)]"
          aria-expanded={mobileOpen}
        >
          <span className="flex items-center gap-2 text-[var(--primary)]">
            <BookOpen size={15} />
            <span className="text-[var(--foreground)] font-semibold truncate">{activeLabel}</span>
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-[var(--muted-foreground)] transition-transform duration-200",
              mobileOpen && "rotate-180"
            )}
          />
        </button>
        {mobileOpen && (
          <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 max-h-[60vh] overflow-y-auto">
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <SidebarItem
                  key={s.id}
                  section={s}
                  active={s.id === activeSection}
                  onClick={scrollTo}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="w-full pl-3 lg:pl-4 pr-6 lg:pr-12 py-10 lg:py-12">
        <div className="flex gap-12 xl:gap-14 items-start">

          {/* ── Desktop Sticky Sidebar ─────────────────────────────────────── */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-[76px] max-h-[calc(100vh-96px)] overflow-y-auto">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-3 px-1">
                Contents
              </p>
              <ul className="space-y-0.5">
                {sections.map((s) => (
                  <SidebarItem
                    key={s.id}
                    section={s}
                    active={s.id === activeSection}
                    onClick={scrollTo}
                  />
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Legal Content ──────────────────────────────────────────────── */}
          <article className="flex-1 min-w-0 px-6 lg:px-10">
            <div className="space-y-0">

              {/* ════════════════════════════════════════════════════════════ */}
              {/* SCOPE */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="scope" title="Scope" icon={BookOpen}>
                <Clause num="1">
                  <strong>Please read these Terms and Conditions carefully.</strong> These Terms and Conditions of Use ("<strong>Terms</strong>", "<strong>Terms of Use</strong>" or "<strong>T&amp;Cs</strong>") form a legally binding agreement between you and <strong>BloomPDF</strong> and govern your access to and use of the BloomPDF website, applications, tools, features, and related services (collectively, the "<strong>Services</strong>").
                </Clause>

                <Clause num="2">
                  By accessing or using any BloomPDF Service, you ("<strong>User</strong>", "<strong>you</strong>" or "<strong>your</strong>") acknowledge that:
                  <BulletList items={[
                    "you have read and understood these Terms;",
                    "you agree to be legally bound by these Terms;",
                    <>you accept the terms of our <strong>Privacy Policy</strong>; and</>,
                    "you will comply with all applicable laws and regulations while using BloomPDF.",
                  ]} />
                  <p className="mt-3">
                    Your continued access to or use of the Services constitutes your acceptance of these Terms. <strong>If you do not agree with any part of these Terms, or if you are unable to comply with them, you must not access or use BloomPDF or any of its Services.</strong>
                  </p>
                </Clause>

                <Clause num="3">
                  By using BloomPDF, you agree to the following obligations:
                  <NumberedList items={[
                    { label: "Understanding the Terms", text: "You confirm that you have reviewed and understood the provisions contained in these Terms and Conditions before using the Services." },
                    { label: "Compliance with obligations", text: "You agree to fulfill all responsibilities and obligations that apply to you under these Terms." },
                    { label: "Lawful use", text: "You may use BloomPDF and its Services only for legitimate and lawful purposes. Your use must not violate applicable laws, regulations, or the rights of any other person or entity." },
                    { label: "Account security", text: "If you create a registered BloomPDF account, you are responsible for keeping your account credentials secure. You must not share, transfer, or provide access to your registered account to another person, including another BloomPDF user." },
                    { label: "Prohibited and unlawful activities", text: "You must not use BloomPDF to carry out, facilitate, promote, or assist with any unlawful or prohibited activity. This includes uploading, creating, processing, or distributing content that is illegal, harmful, constitutes spam, infringes third-party rights, or provides instructions intended to facilitate illegal conduct." },
                    { label: "Personal data of others", text: "You must not collect, access, process, manipulate, or store personal information belonging to other users or third parties through BloomPDF unless you have the appropriate legal basis and are complying with all applicable privacy and data-protection laws." },
                  ]} />
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* CHANGES & ELIGIBILITY */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="changes-eligibility" title="Changes to These Terms and Eligibility" icon={RefreshCw}>
                <Clause num="1" label="Updates to the Terms">
                  BloomPDF may revise or update these Terms and Conditions from time to time. Such changes may be made to reflect changes in applicable laws, regulatory requirements, our Services, or improvements to the way BloomPDF operates. When material changes are made, BloomPDF will provide reasonable notice through the Services or other appropriate means. You are responsible for reviewing the latest version of these Terms periodically. If you continue to access or use BloomPDF after the updated Terms become effective, you will be deemed to have accepted the revised Terms. If you do not agree with any modification, you must discontinue your use of the Services.
                </Clause>

                <Clause num="2" label="Eligibility to Use BloomPDF">
                  You may access and use BloomPDF only if you are legally permitted to do so under the laws applicable to you. In general, you must:
                  <BulletList items={[
                    <>be at least <strong>18 years of age</strong>; or</>,
                    <>be at least <strong>16 years old and legally living independently</strong>, where permitted by applicable law; and</>,
                    "not be subject to any judicial, administrative, or other legal restriction that prevents you from accessing or using services such as BloomPDF in your jurisdiction.",
                  ]} />
                </Clause>

                <Clause num="3" label="Use by Minors">
                  If you are considered a minor under the laws of your jurisdiction, you may use BloomPDF only with the consent, authorization, and supervision of a parent, legal guardian, or other legally responsible adult who accepts responsibility for your use of the Services and, where applicable, the associated account. The responsible adult will be accountable for the minor's activities and use of BloomPDF to the extent permitted by applicable law. BloomPDF does not assume responsibility for acts or misuse of the Services by a minor where such supervision or authorization is required.
                </Clause>

                <Clause num="4" label="Additional Rules and Instructions">
                  Your use of BloomPDF may also be subject to additional notices, guidelines, instructions, usage requirements, or warnings that we provide within the Services. By continuing to use the relevant feature or Service, you agree to follow such additional requirements along with these Terms.
                </Clause>

                <Clause num="5" label="Service-Specific Terms">
                  Certain BloomPDF tools or Services may have additional terms that apply specifically to those features. If any specific service terms conflict with these general Terms and Conditions, the terms specifically applicable to that particular Service will take precedence to the extent of the conflict.
                </Clause>

                <Clause num="6" label="Violation of These Terms">
                  If you fail to comply with these Terms, BloomPDF may, where appropriate and subject to applicable law, restrict, suspend, or terminate your access to your account or Services, including cancellation of an applicable subscription. Any such action will be taken in accordance with the applicable provisions of these Terms.
                </Clause>

                <InlineNotice id="privacy-policy-ref" icon={Shield}>
                  <strong>Privacy Policy:</strong> For more information about the processing of your personal data when using the Services and/or the Programs, please see our Privacy Policy.
                </InlineNotice>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* LIMITED USE LICENSE */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="limited-use-license" title="Limited Use License" icon={FileText}>
                <Clause num="1" label="License to Use BloomPDF">
                  Subject to your continued compliance with these Terms and Conditions, BloomPDF grants you a limited, non-exclusive, revocable, non-transferable, and non-assignable license to access and use the BloomPDF Services and software made available as part of those Services. This license is provided solely for your lawful use of BloomPDF and remains valid only for the period during which you are authorized to use the Services.
                </Clause>

                <Clause num="2" label="Ownership of BloomPDF Services">
                  BloomPDF and/or its authorized licensors retain all rights, title, and interest in and to the Services, software, applications, interfaces, designs, features, and other materials made available through BloomPDF. This includes, without limitation, intellectual property rights relating to the reproduction, modification, adaptation, translation, distribution, publication, communication, display, and other forms of use of the Services and associated software. Nothing in this license transfers or grants you ownership of any intellectual property rights in BloomPDF or its Services. Your permission to use BloomPDF is limited strictly to the rights expressly granted under these Terms.
                </Clause>

                <Clause num="3" label="Restrictions on Use">
                  Unless BloomPDF has given you prior written permission, you may not use the Services or any BloomPDF software beyond the scope of the license provided under these Terms. In particular, you must not copy, reproduce, modify, adapt, reverse engineer, alter, distribute, sublicense, sell, make publicly available, or otherwise exploit any part of the Services or software, including their source code, except where such activity is expressly permitted by applicable law or authorized in writing by BloomPDF.
                </Clause>

                <Clause num="4" label="Breach of License Terms">
                  Any unauthorized use of BloomPDF or violation of the restrictions described in this section may result in appropriate action by BloomPDF. Depending on the nature and severity of the violation, BloomPDF may restrict or suspend your access to the Services, terminate your account or subscription, and/or pursue any remedies available under applicable law.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* USE OF THE SERVICES */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="use-of-services" title="Use of the Services" icon={Settings}>
                <Clause num="1" label="Permitted Use">
                  You agree to use BloomPDF responsibly, in good faith, and only for legitimate purposes for which the Services are provided. Your use of BloomPDF must comply with all applicable laws and regulations, public order, and generally accepted standards of conduct. You must also respect all intellectual property and other proprietary rights belonging to BloomPDF and its licensors.
                </Clause>

                <Clause num="2" label="Fair and Reasonable Use">
                  BloomPDF is designed to provide a fair and reliable experience for all users. To maintain the performance, security, and availability of our Services, your use must remain within reasonable limits. The following activities are prohibited, whether performed manually or through automated means:
                  <NumberedList items={[
                    { label: "Automated data extraction", text: "Using bots, crawlers, spiders, scrapers, scripts, or other automated systems to access, collect, extract, or monitor information from BloomPDF or its Services without our prior written authorization." },
                    { label: "Excessive processing", text: "Submitting, converting, editing, or processing documents at a volume or speed that is substantially beyond what a person could reasonably accomplish through ordinary manual use or standard devices." },
                    { label: "Account sharing", text: "Allowing another person to use your BloomPDF account or credentials, sharing your password with third parties, or accessing the Services using another person's account credentials." },
                    { label: "Abusive or excessive usage", text: "Using BloomPDF in a manner that places an unreasonable burden on our infrastructure or goes significantly beyond legitimate personal or business use. Where an account demonstrates unusually high task volumes, processing activity, or other abnormal usage patterns, BloomPDF may review the account to determine whether these Terms have been violated." },
                  ]} />
                </Clause>

                <Clause num="3" label="Suspension or Termination for Misuse">
                  If BloomPDF determines, acting reasonably and where permitted by applicable law, that your use of the Services violates these Terms or constitutes misuse, we may temporarily restrict, suspend, or permanently terminate your access to the affected Services, account, or subscription.
                </Clause>

                <Clause num="4" label="Internet Connectivity">
                  Certain BloomPDF features may require an active Internet connection, even though some functionality may be available without one. Your Internet service provider may charge you separately for data usage or Internet access. BloomPDF does not control the availability, reliability, speed, or cost of your Internet connection and is not responsible for issues arising from your network or Internet service. We recommend using a stable and sufficiently fast connection when accessing features that require online processing. BloomPDF will not be responsible for delays, interruptions, reduced performance, or failures of Internet-dependent features where the underlying issue is caused by your Internet connection or network conditions.
                </Clause>

                <Clause num="5" label="Backups and Usage Limits">
                  You are responsible for maintaining appropriate backup copies of important files or content that you upload, create, or process through BloomPDF. This recommendation applies even where BloomPDF provides storage or backup-related functionality. BloomPDF may impose reasonable technical and operational limits on the Services, including limits relating to file size, available storage, processing capacity, or usage volume. If your account exceeds an applicable storage or usage limit, we may restrict additional uploads or processing, or temporarily suspend relevant functionality until your usage falls within the permitted limits.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* PROHIBITED MODIFICATION */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="prohibited-modification" title="Prohibited Modification, Reverse Engineering, and AI/ML Use" icon={Shield}>
                <Clause num="1" label="Protection of BloomPDF Technology">
                  Certain components, technologies, software, algorithms, interfaces, and other elements used to provide BloomPDF may contain confidential or proprietary information belonging to BloomPDF or its licensors. Except where these Terms expressly allow it or applicable law provides otherwise, you must not, and must not permit any third party to:
                  <NumberedList items={[
                    { label: "Modify or adapt the software", text: "Modify, alter, adapt, translate, port, or otherwise change any part of BloomPDF's software or Programs, except to the limited extent that such activity is expressly permitted by applicable law for achieving interoperability." },
                    { label: "Reverse engineer or extract technology", text: "Reverse engineer, decompile, disassemble, decode, or otherwise attempt to discover the source code, underlying algorithms, data structures, technical processes, methods, or internal operation of any BloomPDF software or Service. This restriction also includes attempting to recreate or derive the underlying technology by monitoring, tracking, analyzing, or examining inputs, outputs, or data flowing through the Services." },
                    { label: "Use BloomPDF for AI/ML development", text: "Use, or permit any third party to use, BloomPDF software, Services, outputs, processed results, content, data, or information obtained through the Services to develop, train, test, validate, benchmark, or improve any artificial intelligence or machine learning system, model, algorithm, or related technology, whether directly or indirectly, unless such use is expressly authorized by BloomPDF or specifically permitted as part of an applicable BloomPDF AI feature." },
                  ]} />
                </Clause>

                <Clause num="2" label="Interoperability Rights">
                  If applicable law gives you a specific right to decompile or otherwise examine BloomPDF software for the limited purpose of obtaining information necessary to make it interoperable with independently developed software, you must first contact BloomPDF and request the relevant interoperability information. Where appropriate, BloomPDF may provide the required information or establish reasonable conditions governing such activity to protect its confidential information and intellectual property rights.
                </Clause>

                <Clause num="3">
                  Nothing in this section is intended to restrict any rights that cannot lawfully be excluded or limited under the applicable laws of your jurisdiction.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* USER ACCOUNTS */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="user-accounts" title="User Accounts" icon={User}>
                <Clause num="1" label="Creating a BloomPDF Account">
                  You may create a BloomPDF user account ("<strong>BloomPDF Account</strong>") by completing the registration process made available through the Services. Unless otherwise specified for a particular Service, a BloomPDF Account may provide access to multiple BloomPDF features and Services that are available to your account type.
                </Clause>

                <Clause num="2" label="Registration Information">
                  When registering for a BloomPDF Account, you may be required to provide certain information, such as your name, email address, and a password. Where supported, BloomPDF may also allow you to register or sign in using a third-party authentication provider, such as Google, Apple, or another supported identity provider. In such cases, your use of the third-party sign-in service may also be subject to that provider's terms and policies.
                </Clause>

                <Clause num="3" label="Verification and Service-Specific Requirements">
                  BloomPDF may require email verification or other forms of identity or account verification for certain features or Services. Additional requirements may apply to specific BloomPDF Services, and you agree to comply with any account-related conditions communicated to you when using those Services.
                </Clause>

                <Clause num="4" label="Types of Accounts">
                  BloomPDF may offer different account categories depending on how the Services are accessed or purchased. These may include:
                  <BulletList items={[
                    <><strong>Free or Unregistered Access:</strong> Certain BloomPDF features may be available without creating an account, subject to applicable usage restrictions.</>,
                    <><strong>Registered Free Account:</strong> An account that provides access to features available under BloomPDF's free plan.</>,
                    <><strong>Individual or Premium Account:</strong> A registered account associated with an individual user who has purchased or subscribed to paid BloomPDF features.</>,
                    <><strong>Business Account:</strong> An account provided or managed through an organization, company, or business subscription.</>,
                    <><strong>Platform-Based Account:</strong> Where BloomPDF is distributed through a supported third-party platform or app store, certain purchases or subscriptions may be associated with that platform account.</>,
                    <><strong>Educational or Non-Profit Accounts:</strong> BloomPDF may offer special account arrangements or pricing for eligible educational institutions or non-profit organizations, subject to additional terms or eligibility requirements.</>,
                  ]} />
                </Clause>

                <Clause num="5" label="Account Features and Limitations">
                  The functionality available to you may depend on the type of BloomPDF Account or subscription you have. Different plans may be subject to different limits, including, where applicable, limits relating to file size, storage, number of files, pages, processing operations, document size, or other technical or usage parameters. BloomPDF may modify or introduce reasonable limits applicable to particular plans or Services.
                </Clause>

                <Clause num="6" label="Account Dashboard">
                  Where a dashboard is provided, registered users may be able to use it to manage their BloomPDF Account and access information such as account details, subscription status, available features, billing or invoice information, and other relevant account information. Depending on the account type and available functionality, you may also be able to update your personal or business information, manage security settings, activate available security features, and manage your subscriptions or Services.
                </Clause>

                <Clause num="7" label="Responsibility for Account Activity">
                  You are responsible for activities carried out through your BloomPDF Account, including activities performed by someone who has obtained access to your credentials. You must not share your account credentials with unauthorized persons or use another individual's BloomPDF Account. For Business Accounts, an authorized administrator or account manager may have the ability to manage account access, subscriptions, or other aspects of the Services on behalf of the organization.
                </Clause>

                <Clause num="8" label="Account Credentials and Security">
                  You are responsible for keeping your password and other account credentials confidential and for taking reasonable measures to protect your BloomPDF Account. You should update your password when necessary and must not knowingly disclose your login credentials to unauthorized individuals. BloomPDF is not responsible for account-related issues resulting from your failure to maintain reasonable security over your credentials, except to the extent liability cannot be excluded under applicable law.
                  <p className="mt-3">
                    If you believe that your account or credentials have been accessed, compromised, or used without authorization, you should notify BloomPDF promptly through the support or contact channel provided on the Services.
                  </p>
                </Clause>

                <Clause num="9" label="Additional Security Measures">
                  BloomPDF may provide or require additional security controls where appropriate, including multi-factor authentication or other verification methods. We may also request additional information, such as a recovery email address or phone number, where reasonably necessary to protect your account. You are expected to follow security notifications, warnings, and instructions provided by BloomPDF.
                </Clause>

                <Clause num="10" label="Password Recovery">
                  If you forget your BloomPDF Account password, you may use the password-reset or account-recovery process provided through the Services. You may be required to verify your identity or ownership of the account before access can be restored.
                </Clause>

                <Clause num="11" label="Problems with Account Information">
                  If incorrect or outdated contact information prevents you from recovering your account or managing it through the normal recovery process, you may contact BloomPDF support for assistance. BloomPDF may require reasonable verification of your identity or account ownership before making changes, restoring access, processing requests, or taking other actions relating to the account. This verification requirement is intended to protect your account from unauthorized access.
                </Clause>

                <Clause num="12" label="Keeping Information Updated">
                  You are responsible for ensuring that the contact and account information associated with your BloomPDF Account remains accurate and up to date. This allows you to receive important service notifications, security alerts, account communications, and other relevant information.
                  <p className="mt-3">
                    You should also exercise caution when receiving messages that appear to come from BloomPDF. Do not provide passwords, verification codes, payment information, or other sensitive account information in response to suspicious messages or links.
                  </p>
                </Clause>

                <Clause num="13" label="Loss of Access">
                  BloomPDF cannot guarantee that an account can be recovered where you are unable to provide sufficient information or credentials required to verify ownership of the account. You are responsible for maintaining access to the email address, phone number, or other recovery methods associated with your account.
                </Clause>

                <Clause num="14" label="Account Deletion">
                  You may request deletion of your BloomPDF Account through the account settings or the support/contact mechanism made available by BloomPDF. Account deletion may result in the loss of access to associated account information, files, settings, or Services, subject to any applicable retention requirements.
                  <p className="mt-3">
                    Unless otherwise required by applicable law or expressly provided under BloomPDF's refund policy, deleting your account does not automatically entitle you to a refund of amounts already paid for a subscription or other paid Services.
                  </p>
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* USER CONDUCT */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="user-conduct" title="User Conduct" icon={AlertTriangle}>
                <Clause num="1">
                  You agree to use BloomPDF responsibly and in a manner that does not violate applicable law, harm other individuals or entities, or interfere with the security, availability, or proper operation of the Services. You must not use BloomPDF in any manner that could damage, disable, overload, disrupt, or negatively affect the Services, BloomPDF software, infrastructure, or the experience of other users.
                  <p className="mt-3">Without limiting the general requirement above, you must not:</p>
                  <NumberedList items={[
                    { label: "Extract or mine data", text: "Copy, reproduce, systematically extract, collect, or retrieve data, information, or content from BloomPDF or its underlying software for data-mining, scraping, or similar purposes unless you have obtained BloomPDF's prior written authorization or such activity is expressly permitted by applicable law." },
                    { label: "Interfere with security", text: "Bypass, disable, circumvent, compromise, or otherwise interfere with security mechanisms, access controls, authentication systems, or other protective measures implemented by BloomPDF. You must also not interfere with the normal operation of the Services or place an unreasonable burden on our systems or infrastructure." },
                    { label: "Access another user's account", text: "Attempt to access, control, or use another person's BloomPDF Account without proper authorization." },
                    { label: "Engage in fraud or impersonation", text: "Misrepresent your identity, impersonate another person or entity, use another user's name or credentials without permission, or attempt to obtain passwords, verification codes, or other sensitive account information through deception, fraud, or other unauthorized means." },
                    { label: "Misuse support channels", text: "Abuse BloomPDF's customer support systems, submit knowingly false or misleading reports, or make fraudulent claims regarding alleged misuse, unlawful activity, or violations by other users." },
                    { label: "Transfer account credentials", text: "Sell, rent, lease, sublicense, transfer, or otherwise provide your BloomPDF Account or account credentials to another person, except where an account or Service is specifically designed to be administered by an authorized organization or administrator." },
                    { label: "Harass or threaten others", text: "Use BloomPDF to harass, intimidate, threaten, coerce, abuse, or intentionally cause harm to another person, including other BloomPDF users, support personnel, or employees." },
                    { label: "Distribute malicious software", text: "Upload, transmit, distribute, or attempt to introduce viruses, worms, Trojan horses, ransomware, spyware, malicious code, or other harmful software or files that could compromise, damage, interrupt, or interfere with the Services or another person's device or data." },
                    { label: "Disrupt the Services", text: "Use any method, tool, process, or technique that modifies, damages, disrupts, degrades, or interferes with the functionality, performance, operation, maintenance, or availability of BloomPDF." },
                    { label: "Violate intellectual property rights", text: "Use BloomPDF in a manner that infringes or misappropriates the intellectual property or proprietary rights of BloomPDF, its licensors, other users, or third parties. This includes rights relating to software, source code, object code, databases, interfaces, trademarks, logos, designs, and other protected materials." },
                    { label: "Misuse AI-generated content", text: "Where BloomPDF provides AI-powered features, you must not use the Services to create, generate, distribute, or facilitate synthetic media, deepfakes, or AI-generated content for the purpose of deceiving, defrauding, impersonating, or deliberately misleading another person or entity." },
                  ]} />
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* USER CONTENT */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="user-content" title="User Content" icon={FileText}>
                <Clause num="1" label="Meaning of Content">
                  For the purposes of these Terms, "<strong>Content</strong>" means any material, information, or data that you upload, import, submit, create, or otherwise process through BloomPDF. This may include, without limitation, documents, PDFs, text, images, audio, video, or other electronic files and materials.
                </Clause>

                <Clause num="2" label="Processing of Your Content">
                  BloomPDF provides tools that process files submitted by users in order to perform the requested operations. Unless otherwise stated in these Terms or the applicable Privacy Policy, BloomPDF does not routinely review or manually inspect the substantive contents of files submitted for processing. You are responsible for ensuring that you have the necessary rights and permissions to upload and process your Content through the Services.
                  <p className="mt-3">
                    Once processing is completed, you may access and download the resulting files through the functionality made available by BloomPDF. You may also share your Content or processed files with third parties at your own discretion.
                  </p>
                </Clause>

                <Clause num="3" label="File Retention and Automatic Deletion">
                  To help protect user privacy and limit the amount of Content stored on our systems:
                  <NumberedList items={[
                    { text: <>Files uploaded to BloomPDF for processing may be automatically deleted from our processing servers within <strong>two (2) hours</strong> after processing is completed; and</> },
                    { text: "Processed files generally remain available only for the period during which the applicable download or access link remains active, which is ordinarily up to two (2) hours after processing." },
                  ]} />
                  <p className="mt-3">
                    Different retention periods may apply to specific BloomPDF features or Services where those Services expressly provide otherwise.
                  </p>
                </Clause>

                <Clause num="4" label="Access to Your Content">
                  BloomPDF is designed to provide access to your Content through your use of the relevant Services. You remain responsible for the Content you upload, process, store, download, or share through BloomPDF, including ensuring that such Content complies with applicable law and does not violate the rights of others.
                </Clause>

                <Clause num="5" label="Technical Support">
                  BloomPDF may provide documentation, instructions, and technical support to assist you in using our file-processing features. If you experience technical difficulties while uploading, processing, downloading, or otherwise using your files, you may contact BloomPDF through the support or contact channels provided on the Services.
                </Clause>

                <Clause num="6" label="Security of Content">
                  BloomPDF takes reasonable measures designed to protect user Content and maintain the security of its systems. We implement appropriate technical and organizational safeguards intended to protect Content against unauthorized access, loss, misuse, or alteration. However, no method of electronic transmission or storage can be guaranteed to be completely secure.
                </Clause>

                <Clause num="7" label="Ownership of Your Content">
                  You retain all rights, title, and interest, including applicable intellectual property rights, in the Content that you upload or process through BloomPDF. These Terms do not transfer ownership of your Content to BloomPDF.
                  <p className="mt-3">
                    You grant BloomPDF only the limited rights necessary to receive, process, transmit, temporarily store, and provide the Services requested by you. Such rights exist solely for the purpose of operating and delivering the relevant BloomPDF functionality and do not give BloomPDF ownership of your Content.
                  </p>
                </Clause>

                <Clause num="8" label="Your Responsibility for Content">
                  BloomPDF does not generally determine whether Content submitted by users is lawful, accurate, authorized, or compliant with third-party rights. You are solely responsible for your Content and for the manner in which you use the Services.
                  <p className="mt-3">
                    You must not use BloomPDF to process Content that you do not have the legal right or authorization to use, or Content that violates applicable laws or the intellectual property, privacy, confidentiality, publicity, or other rights of another person or entity.
                  </p>
                </Clause>

                <Clause num="9" label="Third-Party Claims and Indemnification">
                  If your use of BloomPDF or your Content results in a third-party claim alleging infringement or violation of intellectual property rights, privacy rights, publicity rights, confidentiality obligations, trade secrets, or other legal rights, or involves unlawful or unfair conduct attributable to you, you may be responsible for resulting claims, losses, damages, liabilities, costs, and reasonable legal expenses to the extent permitted by applicable law.
                </Clause>

                <Clause num="10" label="Removal or Restriction of Content">
                  BloomPDF may remove, restrict, disable access to, or otherwise take appropriate action regarding Content where we receive a valid request or notice from a competent authority, or where we reasonably believe that the Content violates these Terms, applicable law, or the rights of BloomPDF or a third party.
                  <p className="mt-3">
                    Where appropriate and legally permitted, BloomPDF may also take action to protect the security, integrity, and proper functioning of the Services.
                  </p>
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* FEES, BILLING AND SUBSCRIPTIONS */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="fees-billing" title="Fees, Billing and Subscriptions" icon={CreditCard}>
                <Clause num="1" label="Free Access to BloomPDF">
                  BloomPDF provides access to its PDF editing, conversion, processing, and related tools without requiring users to purchase a subscription. Unless otherwise stated, users may access and use the available Services free of charge, subject to these Terms and any reasonable usage limits that may apply.
                </Clause>

                <Clause num="2" label="Advertising-Supported Services">
                  BloomPDF may provide its free Services on an advertising-supported basis. This means that users who access BloomPDF without a paid subscription may see advertisements while using the website, applications, or Services. Advertising helps BloomPDF provide its tools and features to users without requiring payment for standard access.
                </Clause>

                <Clause num="3" label="Optional Ad-Free Subscription">
                  Users who prefer to use BloomPDF without advertisements may choose to purchase an optional paid subscription ("<strong>Subscription</strong>" or "<strong>Ad-Free Subscription</strong>"). The Subscription is not required to access the standard BloomPDF Services and is primarily intended to provide an advertising-free experience.
                  <p className="mt-3">
                    Unless expressly stated otherwise at the time of purchase, purchasing an Ad-Free Subscription does not transfer ownership of any BloomPDF software, Services, or intellectual property to you.
                  </p>
                </Clause>

                <Clause num="4" label="Subscription Pricing">
                  The applicable Subscription price, billing frequency, and available payment options will be displayed to you before you complete your purchase. Subscription prices may vary depending on the plan, billing period, location, applicable taxes, promotional offers, or other factors.
                  <p className="mt-3">
                    BloomPDF reserves the right to change Subscription pricing from time to time. Any price change affecting an existing Subscription will be communicated to you in advance where required by applicable law.
                  </p>
                </Clause>

                <Clause num="5" label="Subscription Period and Automatic Renewal">
                  Depending on the plan offered, BloomPDF may provide monthly, annual, or other Subscription periods. If your selected Subscription is configured for automatic renewal, your Subscription will renew at the end of each billing period unless you cancel it before the renewal date.
                  <p className="mt-3">
                    By subscribing to an automatically renewing plan, you authorize BloomPDF or its authorized payment provider to charge the applicable Subscription fee using your selected payment method for each renewal period.
                  </p>
                </Clause>

                <Clause num="6" label="Payment Processing">
                  Payments may be processed through third-party payment providers or distribution platforms made available by BloomPDF. When completing a purchase, you agree to provide accurate and current billing and payment information.
                  <p className="mt-3">
                    BloomPDF does not necessarily process or store your complete payment card information directly. Payment details may instead be handled by the relevant third-party payment processor in accordance with its own security practices and terms.
                  </p>
                </Clause>

                <Clause num="7" label="Taxes and Additional Charges">
                  The Subscription price displayed by BloomPDF may include applicable taxes where required. Depending on your location and payment method, additional charges imposed by your bank, payment provider, currency conversion service, or other third party may apply. Such third-party charges are outside BloomPDF's control.
                </Clause>

                <Clause num="8" label="Failed or Declined Payments">
                  If a Subscription payment cannot be successfully processed, BloomPDF or its payment provider may attempt to collect the outstanding amount again or request that you update your payment information.
                  <p className="mt-3">
                    If payment remains unsuccessful, BloomPDF may suspend or terminate the Ad-Free benefits associated with your Subscription. You may continue to use BloomPDF's free, advertising-supported Services where available.
                  </p>
                </Clause>

                <Clause num="9" label="Managing Your Subscription">
                  You may manage or cancel your Subscription through the account settings, subscription management page, or the third-party platform through which you purchased the Subscription, depending on the payment method used.
                  <p className="mt-3">
                    Cancelling a Subscription generally prevents the next renewal but does not necessarily terminate your current paid period immediately. Unless otherwise stated at the time of cancellation, you may continue receiving the applicable Ad-Free benefits until the end of the period for which you have already paid.
                  </p>
                </Clause>

                <Clause num="10" label="Effect of Cancellation">
                  After your paid Subscription period ends, your account will generally return to the free, advertising-supported version of BloomPDF. You will continue to have access to the standard Services available to free users, subject to any applicable usage limits.
                  <p className="mt-3">
                    Cancellation of an Ad-Free Subscription does not automatically delete your BloomPDF Account.
                  </p>
                </Clause>

                <Clause num="11" label="Refunds">
                  Subscription payments are generally non-refundable once a billing period has begun, except where a refund is required by applicable law or is expressly provided under BloomPDF's refund policy.
                  <p className="mt-3">
                    If you believe you have been charged incorrectly, you should contact BloomPDF support promptly and provide the relevant transaction details so that the matter can be reviewed.
                  </p>
                </Clause>

                <Clause num="12" label="Promotional Offers and Trials">
                  BloomPDF may occasionally offer promotional pricing, discounts, or limited free trials for its Ad-Free Subscription. Any such offer may be subject to additional conditions communicated at the time the offer is presented.
                  <p className="mt-3">
                    Unless expressly stated otherwise, a promotional offer does not create a permanent entitlement to the promotional price or benefit.
                  </p>
                </Clause>

                <Clause num="13" label="Free Services and Future Changes">
                  BloomPDF may introduce, modify, limit, or discontinue particular features, advertising formats, usage limits, or other aspects of the free Services from time to time. Where required by applicable law, BloomPDF will provide appropriate notice of material changes.
                </Clause>

                <Clause num="14" label="Subscription Does Not Guarantee Uninterrupted Service">
                  An Ad-Free Subscription provides the benefits expressly described for the applicable Subscription plan. It does not guarantee uninterrupted, error-free, or continuously available access to BloomPDF. The Services may occasionally be unavailable due to maintenance, technical issues, security measures, third-party service interruptions, or circumstances beyond BloomPDF's reasonable control.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* INTELLECTUAL PROPERTY */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="intellectual-property" title="Intellectual Property Rights" icon={Copyright}>
                <Clause num="1" label="Ownership of BloomPDF">
                  BloomPDF, including its website, software, applications, interfaces, designs, features, functionality, documentation, branding, and underlying technology, is owned by <strong>Stemlen Private Limited</strong> ("<strong>Stemlen</strong>") or is used by Stemlen under valid authorization or licence.
                  <p className="mt-3">
                    All intellectual property rights relating to BloomPDF and its Services, including any updates, improvements, modifications, enhancements, corrections, new versions, or developments made by or on behalf of Stemlen, remain with Stemlen or the applicable rights holder.
                  </p>
                </Clause>

                <Clause num="2" label="No Transfer of Intellectual Property Rights">
                  Your use of BloomPDF does not transfer or grant you any ownership interest in BloomPDF or in any intellectual property belonging to Stemlen.
                  <p className="mt-3">
                    Unless expressly permitted under these Terms, you are not granted any right or licence to use Stemlen's or BloomPDF's trademarks, trade names, logos, domain names, designs, software, copyrighted materials, or other intellectual property.
                  </p>
                  <p className="mt-3">
                    You must not use BloomPDF's or Stemlen's intellectual property in a manner that may cause confusion regarding ownership, affiliation, sponsorship, or endorsement.
                  </p>
                </Clause>

                <Clause num="3" label="Respect for Intellectual Property">
                  You agree to respect all intellectual property rights associated with BloomPDF, Stemlen, and their respective licensors. You must not remove, hide, alter, obscure, or modify any copyright notice, trademark notice, proprietary notice, attribution, or other legal notice displayed on or included within the Services.
                </Clause>

                <Clause num="4" label="Protection Against Unauthorized Use">
                  You agree not to undertake or assist in any activity that infringes, misappropriates, or otherwise violates Stemlen's or BloomPDF's intellectual property rights.
                  <p className="mt-3">
                    If you become aware of any unauthorized copying, distribution, misuse, infringement, or other violation involving BloomPDF's intellectual property, you are encouraged to notify Stemlen through the contact or support channels provided on the Services.
                  </p>
                </Clause>

                <Clause num="5" label="Feedback and Suggestions">
                  We welcome suggestions, ideas, comments, recommendations, and other feedback regarding BloomPDF ("<strong>Feedback</strong>"). By submitting Feedback, you acknowledge that Stemlen may use, reproduce, modify, develop, publish, or otherwise utilize such Feedback for purposes including improving, developing, or promoting BloomPDF and its Services, without being required to pay you compensation or obtain additional permission.
                  <p className="mt-3">
                    To the extent permitted by applicable law, you grant Stemlen a perpetual, worldwide, royalty-free, transferable, and non-exclusive right to use and incorporate your Feedback into BloomPDF or other products and services.
                  </p>
                  <p className="mt-3">
                    Feedback does not include your Content or personal information, except where such information is voluntarily included as part of the Feedback and its use is otherwise permitted under our Privacy Policy.
                  </p>
                </Clause>

                <Clause num="6" label="Meaning of Intellectual Property">
                  For these Terms, "<strong>Intellectual Property Rights</strong>" includes all rights recognized under applicable law relating to intellectual and industrial property, including copyrights, software rights, database rights, patents, trademarks, service marks, trade names, logos, domain names, designs, trade secrets, confidential information, and other proprietary rights, together with applications, renewals, extensions, and equivalent rights existing now or arising in the future.
                </Clause>

                <Clause num="7" label="BloomPDF Branding">
                  The name <strong>"BloomPDF"</strong>, together with associated logos, visual identity, designs, and other brand elements, may constitute trademarks or other protected intellectual property of Stemlen Private Limited or its licensors. Nothing in these Terms grants you permission to use such branding except as reasonably necessary to identify or refer to BloomPDF in a lawful manner.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* TECHNICAL SUPPORT */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="technical-support" title="Technical Support" icon={Headphones}>
                <Clause num="1" label="General Support and Maintenance">
                  BloomPDF may provide general maintenance, updates, bug fixes, and technical improvements to help maintain the availability, security, and functionality of the Services. These efforts may apply to both free users and users with an Ad-Free Subscription.
                </Clause>

                <Clause num="2" label="Standard Technical Support">
                  BloomPDF may provide technical assistance to users who experience difficulties while accessing or using the Services. Unless expressly stated otherwise, technical support is provided on a <strong>standard, non-priority basis</strong> and is not a separate benefit of an Ad-Free Subscription.
                  <p className="mt-3">
                    An Ad-Free Subscription provides the benefits expressly associated with the subscription, primarily the removal of advertisements, and does not guarantee faster response times, dedicated support, or priority handling of support requests.
                  </p>
                </Clause>

                <Clause num="3" label="Support Policies and Service Updates">
                  Technical support may include assistance with common issues, troubleshooting, service-related questions, and problems affecting the normal operation of BloomPDF.
                  <p className="mt-3">
                    BloomPDF may establish or update reasonable support procedures, channels, availability, and policies from time to time. We may also discontinue support for outdated versions, unsupported environments, or features that are no longer maintained.
                  </p>
                </Clause>

                <Clause num="4" label="Help Resources">
                  BloomPDF may make available FAQs, help documentation, guides, tutorials, or other self-service resources to assist users in resolving common questions and technical issues.
                </Clause>

                <Clause num="5" label="Reporting Technical Problems">
                  If you experience a technical issue, you may contact BloomPDF through the support or contact channels made available on the Services. When reporting a problem, you should provide sufficient information to help us understand and investigate the issue, such as the relevant feature, error message, device or browser information, and other reasonably necessary details.
                </Clause>

                <Clause num="6" label="Files Provided for Technical Investigation">
                  If your technical issue specifically relates to a file processed through BloomPDF and you voluntarily provide that file to our support team for investigation, BloomPDF may temporarily retain and process the file only to the extent reasonably necessary to reproduce, diagnose, investigate, or resolve the reported technical issue.
                  <p className="mt-3">
                    Such processing will be handled in accordance with our Privacy Policy and applicable data protection requirements. You should avoid providing files containing unnecessary sensitive or confidential information when submitting a support request.
                  </p>
                </Clause>

                <Clause num="7" label="No Guaranteed Resolution or Response Time">
                  While BloomPDF will make reasonable efforts to assist users with reported technical issues, we do not guarantee that every issue can be resolved or that support requests will be answered within a particular period unless a specific response commitment has been expressly provided to you.
                </Clause>

                <Clause num="8" label="Service Improvements">
                  BloomPDF may use aggregated or otherwise appropriately processed information about technical issues and support requests to identify recurring problems, improve reliability, enhance functionality, and maintain the quality and security of the Services.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* FRAUDULENT PRACTICES */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="fraudulent-practices" title="Fraudulent Practices" icon={Lock}>
                <SubsectionHeader id="fraud-prevention" title="A. Fraud Prevention and Impersonation" />

                <Clause num="1" label="Beware of Impersonation and Phishing">
                  BloomPDF may, from time to time, become the target of unauthorized third parties attempting to impersonate BloomPDF or Stemlen Private Limited in order to obtain users' personal information, account credentials, payment information, or other sensitive data.
                  <p className="mt-3">Such fraudulent activity may include, without limitation:</p>
                  <NumberedList items={[
                    { text: "Creating websites, domains, applications, or online pages that imitate BloomPDF's branding, design, or appearance;" },
                    { text: "Sending emails or other communications that falsely claim to be from BloomPDF or Stemlen and direct you to a link or website requesting account or payment information; and" },
                    { text: "Publishing fake offers, promotions, giveaways, advertisements, or social media accounts that falsely represent an association with BloomPDF or Stemlen." },
                  ]} />
                </Clause>

                <Clause num="2" label="Protecting Your Account and Information">
                  These activities may constitute phishing or other forms of online fraud designed to obtain information such as passwords, authentication codes, payment details, or other personal information.
                  <p className="mt-3">To reduce the risk of becoming a victim of fraud, you should:</p>
                  <NumberedList items={[
                    { text: "Access BloomPDF only through its official website, applications, or other officially communicated channels;" },
                    { text: "Be cautious of unexpected messages, emails, advertisements, or social media communications requesting your password, payment information, verification codes, or other sensitive information; and" },
                    { text: "Avoid clicking suspicious links or providing account information on websites that you cannot verify as being operated by BloomPDF or Stemlen." },
                  ]} />
                  <p className="mt-3">BloomPDF will not knowingly request your password or authentication credentials through unsolicited communications.</p>
                </Clause>

                <Clause num="3" label="Reporting Suspicious Activity">
                  If you receive a suspicious communication, encounter a website or account impersonating BloomPDF, or become aware of an attempted scam involving BloomPDF or its Services, please notify us through the official contact or support channels available on the Services. We may take reasonable steps to investigate and address reported fraudulent activity.
                </Clause>

                <Clause num="4" label="Security Disclaimer">
                  The information in this section is provided for general awareness and preventive purposes and does not constitute legal, financial, cybersecurity, or professional advice.
                  <p className="mt-3">
                    BloomPDF cannot guarantee that third parties will never attempt to misuse its name, trademarks, branding, or Services for fraudulent purposes. You are responsible for taking reasonable security precautions when using the Internet and accessing your account.
                  </p>
                  <p className="mt-3">
                    We recommend maintaining appropriate security measures on your devices, including keeping your operating system, browser, applications, and security software reasonably up to date.
                  </p>
                </Clause>

                <SubsectionHeader id="fraudulent-payments" title="B. Fraudulent Payments and Account Misuse" />

                <Clause num="5" label="Fraudulent Transactions">
                  BloomPDF may take appropriate action where it reasonably believes that an account has been involved in attempted fraud, fraudulent activity, unauthorized payment activity, payment abuse, or other conduct intended to obtain Services or Ad-Free benefits without valid payment.
                  <p className="mt-3">
                    This may include, for example, the unauthorized use of another person's payment method, deliberately providing false payment information, abusing payment reversals, or attempting to circumvent legitimate Subscription charges.
                  </p>
                </Clause>

                <Clause num="6" label="Suspension or Restriction">
                  Where reasonably necessary to protect BloomPDF, its users, or payment systems, we may temporarily restrict or suspend access to an account associated with suspected fraudulent activity while the matter is investigated.
                  <p className="mt-3">
                    Depending on the circumstances and applicable law, BloomPDF may also cancel an affected Subscription, restrict access to certain Services, or terminate the relevant account.
                  </p>
                </Clause>

                <Clause num="7" label="Opportunity to Explain">
                  Where appropriate, BloomPDF may notify you of suspected fraudulent activity and allow you to provide relevant information or an explanation. We may consider information provided by you in good faith before making a final decision, except where immediate action is reasonably necessary to protect users, our systems, or payment networks.
                </Clause>

                <Clause num="8" label="Chargebacks and Payment Disputes">
                  If a payment for an Ad-Free Subscription is reversed, charged back, or disputed on the basis that the transaction was unauthorized or fraudulent, BloomPDF may investigate the transaction and take appropriate action.
                  <p className="mt-3">
                    This may include suspending the affected Subscription, restricting access to paid Ad-Free benefits, requesting additional information, or taking other reasonable measures to protect against payment fraud.
                  </p>
                  <p className="mt-3">
                    If you believe a payment has been incorrectly identified as fraudulent or unauthorized, you may contact BloomPDF through the available support channels and provide relevant transaction information for review.
                  </p>
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* PROGRAM UPDATES */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="program-updates" title="Program Updates and Availability" icon={Zap}>
                <Clause num="1" label="Updates and Improvements">
                  BloomPDF may periodically modify, update, improve, replace, or temporarily suspend parts of the Services, including individual tools, features, software components, or functionality. Such changes may be made to fix errors, improve performance, enhance security, introduce new capabilities, or maintain compatibility with supported technologies.
                </Clause>

                <Clause num="2" label="Updates to the Services">
                  Where updates or improvements are made available as part of the standard BloomPDF Services, users may receive them without an additional charge. The availability of particular updates or features may depend on the applicable Service, device, browser, operating system, or other technical requirements.
                </Clause>

                <Clause num="3" label="Keeping Your Environment Updated">
                  You are responsible for maintaining compatible and reasonably up-to-date hardware, operating systems, browsers, applications, and Internet connectivity required to access and use BloomPDF.
                </Clause>

                <Clause num="4" label="Notification of Important Changes">
                  Where appropriate, BloomPDF may notify you about significant updates, changes, maintenance activities, or modifications to the Services through your account, email address, website notices, or other communication channels available to us.
                </Clause>

                <Clause num="5" label="Permanent Discontinuation of a Service">
                  If BloomPDF permanently discontinues a material part or the entirety of the Services, other than where the discontinuation results from circumstances beyond our reasonable control, we will make reasonable efforts to provide advance notice where circumstances permit.
                  <p className="mt-3">
                    Where technically and legally feasible, we may also provide users with a reasonable opportunity to download or retrieve their Content before the relevant Service is permanently discontinued.
                  </p>
                  <p className="mt-3">
                    If you have an active paid Ad-Free Subscription at the time BloomPDF permanently discontinues the relevant Service, any refund or other remedy will be handled in accordance with applicable law and BloomPDF's then-current refund policy.
                  </p>
                </Clause>

                <Clause num="6" label="Availability by Location">
                  BloomPDF is intended to be accessible from multiple locations, but individual Services, features, or functionality may not be available in every country or region. Availability may be affected by local laws, regulations, technical restrictions, third-party service availability, or other circumstances.
                  <p className="mt-3">
                    You are responsible for ensuring that your use of BloomPDF is lawful in the location from which you access the Services.
                  </p>
                </Clause>

                <Clause num="7" label="Language and Regional Availability">
                  Not all BloomPDF Services, features, support materials, or content will necessarily be available in every language or region. BloomPDF may introduce or discontinue language or regional support as the Services evolve.
                </Clause>

                <Clause num="8" label="No Guarantee of Continuous Availability">
                  While BloomPDF will make reasonable efforts to maintain the availability of its Services, we do not guarantee that the Services or any particular feature will always be available, uninterrupted, or error-free. Temporary interruptions may occur due to maintenance, updates, technical issues, security measures, infrastructure limitations, or circumstances outside our reasonable control.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* LIABILITY */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="liability" title="Liability" icon={Scale}>
                <SubsectionHeader id="bloompdfs-liability" title="1. BloomPDF's Liability" />

                <Clause num="1" label="Availability of the Services">
                  BloomPDF provides its Services on an "as is" and "as available" basis, to the maximum extent permitted by applicable law. While we make reasonable efforts to maintain the Services and keep them secure and functional, we do not guarantee that the Services will always be uninterrupted, error-free, completely secure, or available at all times.
                </Clause>

                <Clause num="2" label="No Guarantee of Suitability">
                  BloomPDF does not guarantee that the Services will be compatible with every device, operating system, browser, software environment, or Internet connection, or that the Services will meet every individual user's specific requirements or intended purpose.
                </Clause>

                <Clause num="3" label="Internet and Third-Party Services">
                  Certain BloomPDF features may depend on Internet connectivity, hosting providers, payment providers, advertising services, cloud infrastructure, or other third-party technologies. BloomPDF will not be responsible for interruptions, delays, failures, or additional costs caused by circumstances outside our reasonable control, including problems with your Internet connection or third-party services.
                </Clause>

                <Clause num="4" label="Data and Content">
                  You are responsible for maintaining appropriate backups of your files and Content. To the maximum extent permitted by law, BloomPDF will not be responsible for loss, corruption, alteration, or unavailability of Content where such issue is not directly caused by BloomPDF's breach of its obligations.
                </Clause>

                <Clause num="5" label="Indirect or Consequential Losses">
                  To the maximum extent permitted by applicable law, BloomPDF will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for losses such as lost profits, lost revenue, lost business opportunities, loss of goodwill, loss of anticipated savings, or loss of data arising from or related to your use of the Services.
                </Clause>

                <Clause num="6" label="Free Services">
                  BloomPDF provides its standard document tools to users free of charge, with the Services being supported in part through advertising. To the maximum extent permitted by applicable law, your use of the free Services is at your own risk, and BloomPDF will not be liable for losses or damages arising solely from your use of the free Services, except where liability cannot legally be excluded or limited.
                </Clause>

                <Clause num="7" label="Ad-Free Subscription">
                  An Ad-Free Subscription provides access to the applicable BloomPDF Services without advertisements, subject to the terms of the relevant subscription. Payment for an Ad-Free Subscription does not create any guarantee that the Services will be uninterrupted, error-free, or available at all times.
                </Clause>

                <Clause num="8" label="Events Beyond Our Control">
                  BloomPDF will not be responsible for any delay, interruption, failure, or unavailability of the Services caused by circumstances beyond our reasonable control, including natural disasters, widespread Internet or telecommunications failures, cyberattacks, government actions, power outages, infrastructure failures, strikes, or other force majeure events.
                </Clause>

                <Clause num="9" label="User's Responsibility for Use of the Services">
                  You are responsible for determining whether BloomPDF is suitable for your intended use and for ensuring that your use of the Services complies with applicable laws and these Terms and Conditions. If you do not agree to assume the risks associated with using the Services, your option is to discontinue using BloomPDF.
                </Clause>

                <Clause num="10" label="Mandatory Legal Rights">
                  Nothing in these Terms and Conditions is intended to exclude or limit any liability, warranty, right, or remedy that cannot lawfully be excluded or limited under applicable law.
                </Clause>

                <SubsectionHeader id="users-liability" title="2. User's Liability" />

                <Clause num="1">
                  You are responsible for your use of BloomPDF and for any Content you upload, process, edit, create, or otherwise handle through the Services.
                </Clause>

                <Clause num="2">
                  You agree to use the Services lawfully and in accordance with these Terms and Conditions. You must not use BloomPDF in a manner that violates applicable laws, infringes the rights of others, or causes harm to BloomPDF, its users, service providers, or other third parties.
                </Clause>

                <Clause num="3">
                  To the extent permitted by applicable law, you agree to indemnify and hold BloomPDF, Stemlen Private Limited, and their respective officers, employees, contractors, and service providers harmless from claims, losses, damages, liabilities, costs, and reasonable legal expenses arising from:
                  <BulletList items={[
                    "your violation of these Terms and Conditions;",
                    "your unlawful use or misuse of the Services;",
                    "infringement of another person's intellectual property, privacy, or other legal rights through your Content or use of the Services; or",
                    "your fraudulent, abusive, or unauthorized activities involving BloomPDF.",
                  ]} />
                </Clause>

                <Clause num="4">
                  If your actions create a security risk, legal risk, operational risk, or otherwise materially affect BloomPDF or other users, BloomPDF may take reasonable measures to protect the Services, including restricting, suspending, or terminating your access in accordance with these Terms and Conditions.
                </Clause>

                <Clause num="5">
                  The obligations contained in this section that by their nature are intended to continue after termination of your use of BloomPDF will remain effective after your account or access to the Services ends.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* LINKS & THIRD-PARTY */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="links-third-party" title="Links and Third-Party Resources" icon={Link2}>
                <Clause num="1">
                  BloomPDF may contain links to websites, applications, services, or other resources operated by third parties. These links are provided for convenience and informational purposes only. BloomPDF does not control or regularly monitor third-party websites or resources, and these Terms and Conditions and our Privacy Policy apply only to BloomPDF and its Services.
                </Clause>
                <Clause num="2">
                  Your use of any third-party website, application, product, or service accessed through a link provided on BloomPDF will be governed by the terms of use, privacy policies, and other applicable policies of that third party. We recommend that you review those terms and policies before using any third-party service.
                </Clause>
                <Clause num="3">
                  The presence of a third-party link on BloomPDF does not mean that BloomPDF, Stemlen Private Limited, or its affiliates endorse, sponsor, recommend, or are otherwise associated with the third-party website, service, product, or its operator, unless expressly stated otherwise.
                </Clause>
                <Clause num="4">
                  To the maximum extent permitted by applicable law, BloomPDF is not responsible for the availability, accuracy, legality, security, quality, reliability, or content of third-party websites, products, services, communications, or resources, nor for any loss or damage resulting from your use of them.
                </Clause>
                <Clause num="5">
                  If you become aware that a third-party link available through BloomPDF leads to unlawful content or activity, you may notify us through our official support or contact channel. We may review the matter and, where appropriate, remove or disable the relevant link.
                </Clause>
                <Clause num="6">
                  BloomPDF may add, modify, restrict, or remove links to third-party websites and resources at any time without prior notice.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* SOCIAL MEDIA & ADVERTISING */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="social-media-advertising" title="Social Media and Advertising" icon={Megaphone}>
                <SubsectionHeader id="social-media" title="(a) Social Media" />

                <Clause num="1">
                  BloomPDF may maintain official profiles or pages on various social media platforms for purposes including communication, product updates, community engagement, marketing, and promotion. Our official social media profiles may include:
                  <BulletList items={[
                    <><strong>[X / Twitter]</strong></>,
                    <><strong>[Facebook]</strong></>,
                    <><strong>[LinkedIn]</strong></>,
                    <><strong>[Instagram]</strong></>,
                    <><strong>[YouTube]</strong></>,
                    <><strong>[TikTok]</strong></>,
                  ]} />
                  <p className="mt-3">
                    The above profiles, together with any other official social media accounts that BloomPDF may operate from time to time, are collectively referred to as the "<strong>Social Media Channels</strong>."
                  </p>
                </Clause>

                <Clause num="2">
                  BloomPDF may receive or process information that you choose to make publicly available through our Social Media Channels. The processing of such information will be subject to the applicable privacy policies of the relevant social media platform and, where applicable, BloomPDF's Privacy Policy.
                </Clause>

                <Clause num="3">
                  BloomPDF may conduct or participate in contests, giveaways, promotions, campaigns, or other activities through its Social Media Channels. Any specific rules applicable to such activities may be published separately and will apply in addition to these Terms and Conditions.
                </Clause>

                <Clause num="4">
                  You may be able to post or share comments, photographs, videos, or other material on BloomPDF's Social Media Channels where the relevant platform permits such functionality ("<strong>User Social Content</strong>"). You are solely responsible for any User Social Content that you submit or publish.
                </Clause>

                <Clause num="5">
                  By submitting User Social Content, you represent that you have the necessary rights and permissions to publish that content and that its publication does not violate any applicable law or the rights of another person or entity.
                </Clause>

                <Clause num="6">
                  User Social Content represents the views of the person who posted it and does not necessarily represent the views or opinions of BloomPDF or Stemlen Private Limited.
                </Clause>

                <Clause num="7">
                  To the maximum extent permitted by applicable law, BloomPDF is not responsible for User Social Content posted by users, including any inaccuracies, opinions, claims, or materials contained in such content.
                </Clause>

                <Clause num="8">
                  BloomPDF may remove, restrict, hide, or disable access to User Social Content where we reasonably believe that it violates applicable law, these Terms and Conditions, the rules of the relevant social media platform, or the rights of BloomPDF or another person.
                </Clause>

                <Clause num="9">
                  BloomPDF may also take appropriate action against accounts or users that repeatedly submit unlawful, abusive, fraudulent, misleading, or otherwise prohibited content.
                </Clause>

                <Clause num="10">
                  Nothing in this section grants BloomPDF ownership of your User Social Content. You retain your rights in content that you own, subject to any licence or permissions that may be necessary for the operation of the relevant Social Media Channel.
                </Clause>

                <SubsectionHeader id="advertising" title="(b) Advertising" />

                <Clause num="1">
                  BloomPDF is supported in part through advertising. Users who access the standard free version of the Services may see advertisements while using BloomPDF.
                </Clause>
                <Clause num="2">
                  Users who purchase an <strong>Ad-Free Subscription</strong> may use the applicable BloomPDF Services without advertisements during the active subscription period, subject to the terms and limitations of that subscription.
                </Clause>
                <Clause num="3">
                  Advertisements displayed through BloomPDF may be provided by BloomPDF or by third-party advertising partners. Third-party advertisements may be selected or delivered based on factors such as the user's general context, device, location, preferences, or other information handled in accordance with applicable law and BloomPDF's Privacy Policy.
                </Clause>
                <Clause num="4">
                  BloomPDF does not necessarily endorse or guarantee the products, services, claims, or offers presented in third-party advertisements. Any transaction or interaction between you and an advertiser is solely between you and that advertiser.
                </Clause>
                <Clause num="5">
                  BloomPDF may change the advertising providers, formats, placement, frequency, or types of advertisements displayed through the free version of the Services from time to time.
                </Clause>
                <Clause num="6">
                  The availability of an Ad-Free Subscription does not prevent BloomPDF from displaying essential service-related notices, account communications, legal notices, or other non-promotional communications that are necessary for operating or providing the Services.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* SECURITY ATTACKS */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="security-attacks" title="Viruses, Hacking, and Other Security Attacks" icon={AlertTriangle}>
                <Clause num="1">
                  You must not introduce, upload, transmit, distribute, or attempt to introduce any virus, worm, Trojan, ransomware, spyware, malicious code, logic bomb, or other harmful software or material into BloomPDF or any system connected to the Services.
                </Clause>
                <Clause num="2">
                  You must not attempt to gain unauthorized access to BloomPDF, its Services, servers, systems, databases, accounts, networks, or any other infrastructure connected to or used to provide the Services.
                </Clause>
                <Clause num="3">
                  You must not interfere with or disrupt the operation, security, availability, or performance of BloomPDF, including by carrying out or attempting to carry out denial-of-service (DoS), distributed denial-of-service (DDoS), automated abuse, or similar attacks.
                </Clause>
                <Clause num="4">
                  You must not use any method, tool, or technique intended to bypass, disable, circumvent, or compromise BloomPDF's security measures, access controls, usage restrictions, or other protective mechanisms.
                </Clause>
                <Clause num="5">
                  Any violation of this section may result in the immediate suspension or termination of your access to BloomPDF, without prior notice where reasonably necessary to protect the Services, other users, or our systems.
                </Clause>
                <Clause num="6">
                  Where required or permitted by applicable law, BloomPDF may report suspected security attacks, unauthorized access, fraud, or other unlawful activity to the appropriate authorities and may cooperate with investigations.
                </Clause>
                <Clause num="7">
                  BloomPDF is not responsible for damage, loss, or disruption caused by malicious software, cyberattacks, unauthorized access, or other harmful activity originating from third parties, except to the extent such liability cannot be excluded under applicable law.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* FORCE MAJEURE */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="force-majeure" title="Events Beyond Our Control" icon={Globe}>
                <Clause num="1">
                  BloomPDF will not be responsible for any delay, interruption, failure, or inability to perform its obligations under these Terms and Conditions where such circumstances result from an event or situation that is beyond our reasonable control ("<strong>Force Majeure Event</strong>").
                </Clause>

                <Clause num="2">
                  Force Majeure Events may include, without limitation:
                  <BulletList items={[
                    "Natural disasters such as earthquakes, floods, fires, storms, or other severe natural events;",
                    "Epidemics or pandemics;",
                    "War, armed conflict, terrorism, civil unrest, riots, or other public disturbances;",
                    "Strikes, labour disputes, or other widespread disruptions affecting essential services;",
                    "Major power outages or telecommunications failures;",
                    "Internet infrastructure failures or widespread network disruptions;",
                    "Government actions, laws, regulations, restrictions, orders, or other actions by public authorities;",
                    "Cyberattacks, widespread security incidents, or failures affecting critical third-party infrastructure, where such events are beyond BloomPDF's reasonable control; or",
                    "Any other event that could not reasonably have been prevented or overcome by BloomPDF.",
                  ]} />
                </Clause>

                <Clause num="3">
                  Where a Force Majeure Event affects the availability or performance of the Services, BloomPDF's affected obligations may be suspended for the duration of the event to the extent reasonably necessary.
                </Clause>
                <Clause num="4">
                  BloomPDF will make reasonable efforts to restore affected Services and resume its obligations as soon as reasonably practicable after the relevant circumstances have been resolved.
                </Clause>
                <Clause num="5">
                  Nothing in this section limits any rights or remedies that cannot legally be excluded or limited under applicable law.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* FEES, BILLING AND PAYMENT (specific terms) */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="fees-billing-payment" title="Fees, Billing and Payment" icon={CreditCard}>
                <Clause num="1">
                  BloomPDF provides access to its Services under a free, ad-supported model. Users may access and use the available tools and features without paying a subscription fee, subject to these Terms and Conditions and any applicable usage limitations.
                </Clause>
                <Clause num="2">
                  The Services available under the free plan may be supported by advertisements. By using the free version of BloomPDF, You acknowledge and agree that advertisements may be displayed during your use of the Services, including on or around the pages, tools, or results associated with the Services.
                </Clause>
                <Clause num="3">
                  BloomPDF may offer an optional paid subscription that provides an <strong>ad-free experience</strong> (the "<strong>Ad-Free Subscription</strong>"). Unless expressly stated otherwise, the Ad-Free Subscription does not provide additional tools, processing capabilities, storage, or other functionality that is otherwise unavailable to free users. Its primary benefit is the removal of advertisements from the BloomPDF experience.
                </Clause>
                <Clause num="4">
                  The availability, price, billing frequency, and payment methods applicable to the Ad-Free Subscription will be displayed to You before You complete the purchase. BloomPDF may offer the Ad-Free Subscription on a monthly, annual, or other billing basis as indicated at the time of purchase.
                </Clause>
                <Clause num="5" label="Automatic Renewal">
                  Where an Ad-Free Subscription is offered on an automatically renewing basis, the subscription will automatically renew at the end of each applicable billing period unless You cancel it before the renewal date. By subscribing, You authorise BloomPDF or its authorised payment provider to charge the applicable subscription fee using the payment method provided by You.
                </Clause>
                <Clause num="6">
                  You may cancel your Ad-Free Subscription at any time through the account settings or subscription management interface made available by BloomPDF or, where applicable, through the payment or distribution platform through which You purchased the subscription.
                </Clause>
                <Clause num="7" label="Effect of Cancellation">
                  Cancellation of an Ad-Free Subscription will prevent the subscription from automatically renewing. You will continue to receive the ad-free experience until the end of the current paid subscription period. After the end of that period, your account will automatically return to the free, ad-supported version of the Services. Cancellation does not by itself result in the deletion of your BloomPDF User Account.
                </Clause>
                <Clause num="8" label="No Refund on Cancellation">
                  Unless otherwise required by applicable law or expressly provided under these Terms and Conditions, cancellation of an Ad-Free Subscription does not entitle You to a refund for any unused portion of the current subscription period. You will continue to have access to the ad-free experience until the end of the period for which You have already paid.
                </Clause>
                <Clause num="9" label="Refunds">
                  Subscription payments are generally non-refundable. However, BloomPDF may provide a refund where required by applicable law or where a refund is otherwise determined to be appropriate based on the circumstances of the request. Refund requests may be submitted through BloomPDF's designated support or billing channel and may be reviewed on a case-by-case basis.
                </Clause>
                <Clause num="10">
                  Where a refund is approved, the refund will generally be issued using the original payment method used for the transaction. The time required for the refunded amount to appear in Your account may depend on the payment provider, bank, card issuer, or applicable distribution platform and may therefore vary.
                </Clause>
                <Clause num="11">
                  Where a subscription has been purchased through a third-party distribution platform or payment provider, including an app store or other payment intermediary, refunds and billing-related matters may be subject to the policies and procedures of that platform or provider.
                </Clause>
                <Clause num="12">
                  If a payment cannot be successfully collected, BloomPDF may temporarily suspend or remove the Ad-Free Subscription associated with that payment. Your account may continue to be used under the free, ad-supported version of the Services, subject to these Terms and Conditions.
                </Clause>
                <Clause num="13">
                  Any billing and payment information provided by You in connection with an Ad-Free Subscription must be accurate, complete, and up to date. BloomPDF and its authorised payment providers may process and retain the information necessary to process payments, manage subscriptions, prevent fraud, and comply with applicable legal obligations.
                </Clause>
                <Clause num="14">
                  BloomPDF does not intend to retain complete payment-card information where payment processing is handled by an authorised third-party payment provider. Payment information may instead be processed and stored by such payment providers in accordance with their applicable terms, privacy policies, and security practices.
                </Clause>
                <Clause num="15">
                  BloomPDF reserves the right to modify the price, billing frequency, or availability of the Ad-Free Subscription. Where required by applicable law, You will be notified of material changes before they take effect. Any such change will not affect a subscription period for which You have already paid, unless otherwise permitted or required by applicable law.
                </Clause>
                <Clause num="16">
                  BloomPDF may offer promotional pricing, introductory offers, discounts, or free trials for the Ad-Free Subscription from time to time. The specific terms applicable to any such offer will be communicated at the time of the offer. Unless otherwise stated, promotional offers may be subject to eligibility restrictions and may not be combined with other offers.
                </Clause>
                <Clause num="17">
                  A User may only use a promotional or free-trial offer to the extent that the User satisfies the eligibility requirements specified for that offer. BloomPDF reserves the right to withdraw or refuse a promotional offer where it reasonably believes that the eligibility requirements have not been satisfied or that the offer is being misused.
                </Clause>
                <Clause num="18">
                  If an Ad-Free Subscription is cancelled, expires, or otherwise terminates, the User will continue to have access to the free version of the Services, and advertisements may again be displayed as part of that free experience.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* RIGHT OF WITHDRAWAL */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="right-of-withdrawal" title="Right of Withdrawal" icon={ArrowRightLeft}>
                <SubsectionHeader id="withdrawal-ad-free" title="(a) Right to withdraw from an Ad-Free Subscription" />

                <Clause num="1">
                  If You are legally entitled to a right of withdrawal under applicable law, You may withdraw from the purchase of an Ad-Free Subscription within the applicable statutory withdrawal period, subject to the conditions and exceptions provided by applicable law.
                </Clause>
                <Clause num="2">
                  The right of withdrawal, where applicable, applies only to the purchase of a paid Ad-Free Subscription and does not apply to the free, ad-supported use of the Services, as no payment is required for such use.
                </Clause>
                <Clause num="3">
                  Where applicable law provides an exception to the right of withdrawal for digital services or digital content once performance has begun with the User's consent, the right of withdrawal may no longer be available after You have started using the Ad-Free Subscription.
                </Clause>
                <Clause num="4">
                  To exercise any applicable right of withdrawal, You must notify BloomPDF through the support or contact channel made available on the BloomPDF website. Your request should clearly state that You wish to withdraw from the purchase of the Ad-Free Subscription and should include sufficient information to identify the relevant subscription or transaction.
                </Clause>
                <Clause num="5">
                  Nothing in this clause limits or excludes any mandatory consumer rights that cannot legally be waived under applicable law.
                </Clause>

                <SubsectionHeader id="consequences-withdrawal" title="(b) Consequences of withdrawal" />

                <Clause num="1">
                  Where You validly exercise a statutory right of withdrawal, BloomPDF will process any refund required by applicable law.
                </Clause>
                <Clause num="2">
                  Where a refund is due, BloomPDF will generally issue the refund using the original payment method used for the transaction, unless otherwise required or permitted by applicable law.
                </Clause>
                <Clause num="3">
                  The time required for the refunded amount to appear in Your account may depend on the payment provider, bank, card issuer, or distribution platform used for the transaction.
                </Clause>
                <Clause num="4">
                  Where applicable law permits BloomPDF to deduct an amount for Services already provided before withdrawal, BloomPDF may make such deduction in accordance with applicable law.
                </Clause>
                <Clause num="5">
                  This clause does not affect any other refund rights expressly provided under these Terms and Conditions or by mandatory applicable law.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* CONFIDENTIALITY */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="confidentiality" title="Confidentiality" icon={Lock}>
                <Clause num="1">
                  BloomPDF respects the confidentiality and security of information provided by Users in connection with their use of the Services. BloomPDF will handle personal information and other information in accordance with its Privacy Policy and applicable data protection laws.
                </Clause>
                <Clause num="2">
                  Users must not disclose or misuse confidential information belonging to BloomPDF that is not publicly available and that is clearly identified as confidential or that should reasonably be understood to be confidential based on its nature or the circumstances in which it was disclosed.
                </Clause>
                <Clause num="3">
                  Confidential information may include, where applicable, non-public information relating to BloomPDF's software, source code, technical systems, security measures, business plans, product development, pricing strategies, internal processes, and other proprietary information.
                </Clause>
                <Clause num="4">
                  The confidentiality obligations in this clause do not apply to information that:
                  <NumberedList items={[
                    { text: "is or becomes publicly available without a breach of a confidentiality obligation;" },
                    { text: "was lawfully known to the receiving party before it was disclosed;" },
                    { text: "is lawfully received from a third party without a confidentiality obligation;" },
                    { text: "is independently developed without use of the confidential information; or" },
                    { text: "must be disclosed by law, regulation, court order, or a valid request from a competent governmental or regulatory authority." },
                  ]} />
                </Clause>
                <Clause num="5">
                  Where disclosure of confidential information is legally required, the receiving party will, to the extent legally permitted, provide reasonable notice to the other party before making such disclosure.
                </Clause>
                <Clause num="6">
                  Nothing in this clause prevents BloomPDF from processing, storing, or disclosing information as reasonably necessary to provide, secure, maintain, improve, or support the Services, or as otherwise permitted under these Terms and Conditions and the Privacy Policy.
                </Clause>
                <Clause num="7">
                  The obligations in this clause will continue for so long as the relevant information remains confidential, except where applicable law requires otherwise.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* CONTACT & NOTIFICATIONS */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="contact-notifications" title="Contact and Notifications" icon={Mail}>
                <Clause num="1">
                  You may contact BloomPDF regarding the Services, your account, billing, technical issues, or other matters through the contact or support channels made available on the BloomPDF website.
                </Clause>
                <Clause num="2">
                  BloomPDF may contact You using the email address associated with your BloomPDF User Account, through notifications within the Services, or through other reasonable electronic means.
                </Clause>
                <Clause num="3">
                  You are responsible for keeping the contact information associated with your account accurate and up to date so that You can receive important notices regarding your account, the Services, security, changes to these Terms and Conditions, or other matters relating to your use of BloomPDF.
                </Clause>
                <Clause num="4">
                  Electronic notifications will generally be considered delivered when they are sent to the email address associated with your account or made available through your account or the Services, unless applicable law requires a different method or timing of delivery.
                </Clause>
                <Clause num="5">
                  BloomPDF will not be responsible for a failure to receive a notification where such failure results from incorrect, outdated, inaccessible, or otherwise inaccurate contact information provided by You.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* TRANSFER & ASSIGNMENT */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="transfer-assignment" title="Transfer or Assignment of These Terms and Conditions" icon={ArrowRightLeft}>
                <Clause num="1">
                  You may not transfer, assign, sublicense, or otherwise transfer your rights or obligations under these Terms and Conditions to another person without BloomPDF's prior written consent.
                </Clause>
                <Clause num="2">
                  BloomPDF may assign or transfer its rights and obligations under these Terms and Conditions to an affiliate, successor, purchaser, or other entity in connection with a merger, acquisition, reorganisation, sale of assets, or similar corporate transaction, or where otherwise permitted by applicable law.
                </Clause>
                <Clause num="3">
                  Any attempted transfer or assignment by You that does not comply with this clause will have no effect.
                </Clause>
                <Clause num="4">
                  These Terms and Conditions remain binding on You and BloomPDF and on any permitted successors or assigns.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* JURISDICTION */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="jurisdiction" title="Jurisdiction and Applicable Law" icon={Gavel}>
                <Clause num="1">
                  These Terms and Conditions shall be governed by and interpreted in accordance with the laws of India, without prejudice to any mandatory rights or protections available to You under applicable law.
                </Clause>
                <Clause num="2">
                  Any dispute, claim, or controversy arising out of or relating to these Terms and Conditions, the Services, your BloomPDF User Account, or your use of BloomPDF shall be subject to the applicable courts and legal authorities in accordance with Indian law.
                </Clause>
                <Clause num="3">
                  Before initiating formal legal proceedings, You and BloomPDF are encouraged to make reasonable efforts to resolve any dispute amicably through BloomPDF's available support or contact channels.
                </Clause>
                <Clause num="4">
                  If a dispute cannot be resolved amicably, either party may pursue the remedies available to it under applicable Indian law.
                </Clause>
                <Clause num="5">
                  If You are legally considered a consumer, nothing in these Terms and Conditions is intended to limit or exclude any rights, remedies, or protections available to You under applicable consumer protection laws or other mandatory legislation.
                </Clause>
                <Clause num="6">
                  Nothing in this clause prevents either party from seeking urgent or interim relief from a court or other competent authority where such relief is available under applicable law.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* MISCELLANEOUS */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="miscellaneous" title="Miscellaneous" icon={MoreHorizontal}>
                <Clause num="1" label="No Waiver">
                  If BloomPDF does not immediately enforce any provision of these Terms and Conditions, this will not constitute a waiver of its right to enforce that provision or any other provision in the future. Any waiver will be effective only to the extent expressly provided.
                </Clause>
                <Clause num="2" label="Severability">
                  If any provision of these Terms and Conditions is found to be invalid, unlawful, or unenforceable by a competent court or authority, that provision will be enforced to the maximum extent permitted by law. The remaining provisions will continue to remain valid and enforceable.
                </Clause>
                <Clause num="3" label="Entire Agreement">
                  These Terms and Conditions, together with the BloomPDF Privacy Policy and any other policies or terms expressly incorporated into them, constitute the agreement between You and BloomPDF regarding your use of the Services and supersede any prior agreements or understandings relating to the same subject matter, to the extent permitted by applicable law.
                </Clause>
                <Clause num="4" label="Headings">
                  The headings used throughout these Terms and Conditions are provided for convenience only and do not affect the interpretation of the provisions.
                </Clause>
                <Clause num="5" label="Electronic Acceptance">
                  Your acceptance of these Terms and Conditions electronically, including by creating an account, clicking an acceptance button, or using the Services where acceptance is legally required, constitutes your agreement to be bound by these Terms and Conditions.
                </Clause>
                <Clause num="6" label="Changes to the Terms">
                  Any modification of these Terms and Conditions will be governed by the provisions of the Modification section of these Terms and Conditions.
                </Clause>
                <Clause num="7" label="Language">
                  These Terms and Conditions may be made available in multiple languages for convenience. In the event of any discrepancy between language versions, the version designated by BloomPDF as the governing version will apply to the extent permitted by applicable law.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* SPECIFIC TERMS */}
              {/* ════════════════════════════════════════════════════════════ */}
              <Section id="specific-terms" title="Specific Terms of Services" icon={Layers}>
                <Clause num="1">
                  These Terms and Conditions apply to the BloomPDF Services and the tools, features, applications, and platforms made available by BloomPDF from time to time.
                </Clause>
                <Clause num="2">
                  Certain Services or features may be subject to additional terms, conditions, instructions, or usage requirements ("<strong>Specific Terms</strong>"). Where such Specific Terms apply, they will be made available to You before or when You access or use the relevant Service or feature.
                </Clause>
                <Clause num="3">
                  The Specific Terms applicable to a particular Service form part of these Terms and Conditions and will apply to your use of that Service.
                </Clause>
                <Clause num="4">
                  In the event of a conflict between these General Terms and Conditions and Specific Terms applicable to a particular Service, the Specific Terms will prevail only with respect to the relevant Service or feature and only to the extent of the conflict.
                </Clause>
                <Clause num="5">
                  BloomPDF's Privacy Policy will govern the collection, use, storage, and processing of personal information and will apply in addition to these Terms and Conditions.
                </Clause>
                <Clause num="6">
                  BloomPDF may introduce new tools, features, services, or platforms from time to time. The applicable Specific Terms may be updated or introduced accordingly.
                </Clause>
                <Clause num="7">
                  Capitalised terms used in any Specific Terms will have the meanings assigned to them in these Terms and Conditions unless otherwise expressly defined in the relevant Specific Terms.
                </Clause>

                <SubsectionHeader id="digital-signature" title="Digital Signature Service" />

                <Clause num="1">
                  BloomPDF may provide a digital signature feature that allows You to add a basic electronic signature to a PDF document.
                </Clause>
                <Clause num="2">
                  The Digital Signature Service is available to both Free Account Users and Ad-Free Subscription Users. Free Account Users may use the feature subject to the advertisements displayed as part of the Services. An Ad-Free Subscription removes advertisements but does not provide additional signature functionality.
                </Clause>
                <Clause num="3">
                  The signature functionality provided by BloomPDF is intended as a basic electronic signing feature. BloomPDF does not represent or warrant that a signature created through the Service constitutes a qualified, advanced, or otherwise legally equivalent electronic signature under the laws or regulations of any particular jurisdiction.
                </Clause>
                <Clause num="4">
                  You are solely responsible for determining whether the type of electronic signature provided through BloomPDF is legally sufficient for Your particular document, transaction, purpose, or jurisdiction. BloomPDF does not provide legal advice regarding the validity, enforceability, or legal effect of any electronic signature created through the Service.
                </Clause>
                <Clause num="5">
                  You are responsible for ensuring that You have the necessary authority and rights to sign any document using the Digital Signature Service and that the information, signature, and other content added to the document are accurate and lawful.
                </Clause>
                <Clause num="6">
                  BloomPDF does not verify the identity or authority of the person applying a signature to a document and does not independently verify whether the person adding a signature is authorised to sign on behalf of any individual, organisation, or entity.
                </Clause>
                <Clause num="7">
                  BloomPDF does not provide signature requests, third-party signing workflows, identity verification, SMS authentication, audit trails, qualified timestamps, or other advanced signature verification services unless expressly stated as part of the Service.
                </Clause>
                <Clause num="8">
                  Documents processed using the Digital Signature Service are not intended to be permanently stored by BloomPDF. After the signing process, You are responsible for downloading and securely storing the signed document.
                </Clause>
                <Clause num="9">
                  You acknowledge and agree that BloomPDF is not responsible for the loss, deletion, corruption, unauthorised modification, or inability to recover a signed document after it has been made available for download. You should maintain an appropriate backup of any signed document that You wish to retain.
                </Clause>
                <Clause num="10">
                  BloomPDF does not guarantee that a digitally signed document will be accepted by any particular person, organisation, authority, court, government body, or other third party. You are responsible for verifying the applicable requirements before relying on a digitally signed document.
                </Clause>
                <Clause num="11">
                  BloomPDF may modify, suspend, or discontinue the Digital Signature Service or any of its features when reasonably necessary for technical, operational, security, legal, or regulatory reasons.
                </Clause>
              </Section>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* Footer stamp */}
              {/* ════════════════════════════════════════════════════════════ */}
              <div className="pt-8 pb-4 border-t border-[var(--border)] mt-4">
                <p className="text-xs text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">Last revision:</strong> 2026-08-10
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  &copy; {new Date().getFullYear()} Stemlen Private Limited. All rights reserved.
                </p>
              </div>

            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="pt-12 first:pt-0 scroll-mt-20">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-7 pb-5 border-b border-[var(--border)]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] border border-[var(--border)]">
          <Icon size={15} className="text-[var(--primary)]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight leading-snug">
          {title}
        </h2>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function SubsectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="mt-9 mb-5 scroll-mt-20">
      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-2">
        <span className="inline-block h-px w-4 bg-[var(--primary)] opacity-60 rounded" />
        {title}
      </h3>
    </div>
  );
}

function Clause({
  num,
  label,
  children,
}: {
  num: number | string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 py-4 group">
      <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--muted)] text-[10px] font-bold text-[var(--muted-foreground)] tabular-nums leading-none select-none">
        {num}
      </span>
      <div className="flex-1 text-[15px] text-[var(--foreground)] leading-[1.75] min-w-0">
        {label && (
          <span className="font-semibold text-[var(--foreground)]">{label}. </span>
        )}
        {children}
      </div>
    </div>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-2.5 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] text-[var(--foreground)] leading-[1.75]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)] opacity-70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({
  items,
}: {
  items: { label?: string; text: React.ReactNode }[];
}) {
  return (
    <ol className="mt-4 space-y-4 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] text-[var(--foreground)] leading-[1.75]">
          <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] border border-[var(--border)] text-[10px] font-bold text-[var(--primary)] tabular-nums leading-none">
            {i + 1}
          </span>
          <span>
            {item.label && <span className="font-semibold">{item.label}: </span>}
            {item.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

function InlineNotice({
  id,
  icon: Icon,
  children,
}: {
  id?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="mt-4 mb-2 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-3 text-sm text-[var(--foreground)] leading-relaxed scroll-mt-20"
    >
      <Icon size={15} className="shrink-0 mt-0.5 text-[var(--primary)]" />
      <div>{children}</div>
    </div>
  );
}
