import { usePageMeta } from '../lib/router';
import { BUSINESS_INFO, SERVICE_FEE_USD } from '../shared/config';

export function PrivacyPolicyPage() {
  usePageMeta(
    'Privacy Policy – EasyApp Processing',
    'Learn how EasyApp Processing collects, encrypts, retains, and deletes personal data for Illinois CCL and FOID applications.'
  );

  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6 text-slate-700 leading-relaxed">
        <header className="border-b border-slate-200 pb-6 space-y-2">
          <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
            Data Protection &amp; Privacy
          </p>
          <h1 className="font-display text-3xl font-bold text-[#0F2744]">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">Effective Date: November 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            1. Information We Collect
          </h2>
          <p>
            When you submit an application through EasyApp Processing, we collect only the personal details required to prepare and submit your Illinois Concealed Carry License (CCL) and/or FOID Card application to the Illinois State Police (ISP). This includes your full name, date and place of birth, contact email and phone number, Illinois Driver&apos;s License or State ID details, FOID details, 10-year residential address history, ISP portal credentials and security answers (for new applicants), eligibility responses, uploaded training certificate, and electronic signature.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            2. Payment Data Isolation
          </h2>
          <p>
            We never collect, process, or store credit card numbers, CVV codes, or bank account/routing numbers on EasyApp Processing servers. All ${SERVICE_FEE_USD}.00 service fee payments are handled exclusively by Stripe&apos;s PCI-DSS compliant checkout platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            3. How We Protect Your Information
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>All traffic is encrypted in transit via HTTPS/TLS.</li>
            <li>
              Sensitive fields (Driver&apos;s License #, Document Discriminator, FOID #, TCN/ARN/I-94 numbers, Date of Birth, ISP password, security question answers, SSN last 4 digits) and uploaded training certificate files are encrypted at rest using AES-256-GCM authenticated encryption.
            </li>
            <li>Sensitive values are never placed in URLs, application logs, analytics, or email notifications.</li>
            <li>
              Access to submitted applications is restricted to the business owner ({BUSINESS_INFO.owner}) behind password and 2-factor authenticator verification, with an audit log recording every time a sensitive field is revealed.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            4. Retention &amp; Deletion Policy
          </h2>
          <p>
            Consistent with our commitment to delete applicant paperwork once submitted, sensitive encrypted fields and uploaded certificates are automatically purged 30 days after an application is marked &ldquo;Completed.&rdquo; You may also request immediate permanent deletion of your application data at any time by contacting {BUSINESS_INFO.email} or calling {BUSINESS_INFO.phoneDisplay}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            5. Essential Cookies Only
          </h2>
          <p>
            This site uses only strictly necessary security cookies (such as CSRF protection tokens and administrator session authentication cookies) and browser session storage to preserve your multi-step form progress while you complete an application. We do not use third-party advertising cookies or tracking analytics.
          </p>
        </section>
      </article>
    </div>
  );
}

export function TermsPage() {
  usePageMeta(
    'Terms & Disclaimer – EasyApp Processing',
    'Terms of service, independent status disclaimer, refund policy, and applicant accuracy responsibilities for EasyApp Processing.'
  );

  return (
    <div className="max-w-[840px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <article className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6 text-slate-700 leading-relaxed">
        <header className="border-b border-slate-200 pb-6 space-y-2">
          <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
            Service Terms
          </p>
          <h1 className="font-display text-3xl font-bold text-[#0F2744]">
            Terms of Service &amp; Disclaimer
          </h1>
          <p className="text-sm text-slate-500">Effective Date: November 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            1. Independent Preparation Service
          </h2>
          <p>
            {BUSINESS_INFO.disclaimer} EasyApp Processing ({BUSINESS_INFO.owner}) is not affiliated with High Caliber or any firearms training instructor or academy, and does not speak on behalf of the Illinois State Police.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            2. No Guarantee of License Approval
          </h2>
          <p>
            EasyApp Processing prepares and submits your application using the information and documents you supply. All licensing eligibility determinations, background checks, and approval or denial decisions are made solely by the Illinois State Police. We cannot guarantee approval of any CCL or FOID application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            3. Applicant Accuracy Responsibility
          </h2>
          <p>
            You are solely responsible for providing truthful, complete, and accurate information matching your valid Illinois Driver&apos;s License/State ID and FOID Card. Providing incorrect, incomplete, or false information (including inaccurate address history or eligibility answers) can cause delays or denial of your application by ISP. You agree not to hold EasyApp Processing or Bob Sumption liable if an application is delayed or denied due to the information you provide.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            4. Service Fee &amp; Refund Policy
          </h2>
          <p>
            The ${SERVICE_FEE_USD}.00 EasyApp Processing service fee covers administrative preparation and submission assistance. This fee is separate from your training class fee and separate from any Illinois State Police statutory application fees (or Secretary of State ID address update fees). Once your application has been submitted to the Illinois State Police, the ${SERVICE_FEE_USD}.00 EasyApp Processing service fee is non-refundable.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0F2744]">
            5. Contact
          </h2>
          <p>
            For questions regarding these terms, contact {BUSINESS_INFO.owner} at{' '}
            <a href={BUSINESS_INFO.emailHref} className="text-[#0F2744] font-semibold underline">
              {BUSINESS_INFO.email}
            </a>{' '}
            or{' '}
            <a href={BUSINESS_INFO.phoneHref} className="text-[#0F2744] font-semibold underline tabular-nums">
              {BUSINESS_INFO.phoneDisplay}
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
