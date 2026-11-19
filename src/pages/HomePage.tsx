import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, usePageMeta } from '../lib/router';
import { BUSINESS_INFO, SERVICE_FEE_USD } from '../shared/config';

const FAQ_ITEMS = [
  {
    q: 'Do I need fingerprints to apply?',
    a: 'Fingerprints are not required for an Illinois Concealed Carry application, but they are suggested. Fingerprinting may allow faster processing than the standard 120-day wait without them and helps avoid delays caused by name-only background checks.',
  },
  {
    q: "What if my driver's license address differs from my FOID address?",
    a: "Your driver's license address and FOID address must match. If your FOID address is different, we can update it as part of your application. If your driver's license address is outdated, you must update it with the Illinois Secretary of State before we submit your CCW application.",
  },
  {
    q: 'How long does it take?',
    a: 'We typically review, prepare, and submit your completed paperwork to the Illinois State Police shortly after receiving your form and payment. ISP processing times vary by state volume and whether electronic fingerprints (TCN) are included (up to 90 days with fingerprints or 120 days without).',
  },
  {
    q: 'What does the $35 service fee cover?',
    a: `The $${SERVICE_FEE_USD}.00 fee covers EasyApp Processing's full preparation service: creating your digital ID, verifying your 10-year address history, reviewing your submission for accuracy, filing with ISP, and handling any needed FOID address change. Illinois State Police state fees are separate.`,
  },
  {
    q: 'How is my sensitive personal information protected?',
    a: 'All sensitive identifiers (driver\'s license number, FOID number, date of birth, ISP password, security answers, and uploaded certificates) are encrypted at rest using AES-256-GCM and transmitted over HTTPS. We never store payment card numbers, and sensitive data can be permanently deleted after submission.',
  },
];

export function HomePage() {
  usePageMeta(
    'EasyApp Processing – Illinois Concealed Carry & FOID Help',
    'Professional Illinois Concealed Carry License (CCL) and FOID card application and renewal preparation service for $35. Fast, accurate, and secure.'
  );

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [consultImgFailed, setConsultImgFailed] = useState(false);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <p className="text-sm font-semibold text-[#9A6D1B] tracking-wide">
                {BUSINESS_INFO.tagline}
              </p>
              <h1
                className="font-display font-bold tracking-tight text-[#0F2744] leading-[1.12] max-w-2xl"
                style={{
                  fontSize: 'clamp(2.15rem, 3.6vw, 3.25rem)',
                  textWrap: 'balance',
                }}
              >
                We Handle Your Illinois Concealed Carry &amp; FOID Paperwork
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Skip confusing state portals, address-history mismatches, and formatting errors. For a flat{' '}
                <span className="font-semibold text-[#0F2744] tabular-nums">
                  ${SERVICE_FEE_USD}
                </span>{' '}
                service fee, we prepare, review, and submit your Illinois CCL and FOID application accurately on your behalf.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  to="/apply/new"
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 text-base font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>New Application</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/renewal"
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 text-base font-semibold text-[#0F2744] bg-white border border-slate-300 hover:border-[#0F2744] hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Renewal</span>
                </Link>
              </div>
              <p className="text-xs text-slate-500">
                Serving Illinois applicants · Encrypted submission · Independent application assistance
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_document_desk_1795117752427.jpg"
                    alt="Organized Illinois application folders and stationery on a clean oak desk"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <FileText className="w-12 h-12 text-[#0F2744] mb-3" aria-hidden="true" />
                    <p className="font-display font-semibold text-[#0F2744]">
                      EasyApp Processing
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Illinois CCL &amp; FOID Preparation
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Process */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2744]">
            What We Process
          </h2>
          <p className="mt-2 text-slate-600 leading-relaxed">
            Focused preparation for both first-time Illinois applicants and license renewals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
                Service 01 · Concealed Carry
              </p>
              <h3 className="font-display text-xl font-bold text-[#0F2744]">
                Illinois Concealed Carry License (New &amp; Renewal)
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Complete digital ID creation, document verification, 10-year residency validation, and full electronic submission to the Illinois State Police for both initial 16-hour applicants and 5-year renewals.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/apply/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2744] hover:text-[#17365D] underline underline-offset-4"
              >
                <span>Start New CCL Application</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
                Service 02 · FOID &amp; Address Updates
              </p>
              <h3 className="font-display text-xl font-bold text-[#0F2744]">
                FOID Card (New, Renewal &amp; Address Changes)
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Accurate preparation for new Firearm Owner&apos;s Identification cards and renewals, including coordinating FOID address updates so your FOID record matches your Illinois Driver&apos;s License or State ID.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/renewal"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2744] hover:text-[#17365D] underline underline-offset-4"
              >
                <span>Start CCL &amp; FOID Renewal</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2744]">
              How It Works
            </h2>
            <p className="mt-2 text-slate-600">
              Four straightforward steps from start to state submission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                num: '01.',
                title: 'Choose New or Renewal',
                body: 'Select Form A if you are applying for a new CCL/FOID, or Form B if you are renewing an existing license.',
              },
              {
                num: '02.',
                title: 'Fill Out the Secure Online Form',
                body: 'Guided steps validate your ID numbers, 10-year address history, and training certificate upload.',
              },
              {
                num: '03.',
                title: `Pay the $${SERVICE_FEE_USD} EasyApp Fee`,
                body: 'Complete secure checkout via Stripe. State ISP fees remain separate and are handled during submission.',
              },
              {
                num: '04.',
                title: 'We Prepare & Submit to ISP',
                body: 'We create your digital ID, complete and submit your application to the Illinois State Police, and update your FOID address if needed.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-2.5"
              >
                <p className="font-mono text-sm font-semibold text-[#9A6D1B] tabular-nums">
                  {step.num}
                </p>
                <h3 className="font-display text-lg font-bold text-[#0F2744]">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Use EasyApp & What You'll Need */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 space-y-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2744]">
                Why Use EasyApp Processing
              </h2>
              <p className="mt-2 text-slate-600 leading-relaxed">
                With years of experience helping Illinois students and applicants navigate state paperwork, we prevent common mistakes that delay approvals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Saves Valuable Time',
                  desc: 'We handle portal setup, digital ID creation, and form entry so you do not have to wrestle with state systems.',
                },
                {
                  title: '10-Year Address Check',
                  desc: 'Our built-in calculator checks your residency dates to ensure a full 10-year history with zero gaps.',
                },
                {
                  title: 'Error Review Before Filing',
                  desc: 'We cross-check your Driver’s License, FOID details, and certificate before submitting to ISP.',
                },
                {
                  title: 'Experienced Student Support',
                  desc: 'Years of hands-on experience helping Illinois training students complete applications smoothly.',
                },
              ].map((reason) => (
                <div
                  key={reason.title}
                  className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5"
                >
                  <h3 className="font-display font-semibold text-[#0F2744]">
                    {reason.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {reason.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] max-h-[280px] w-full">
              {!consultImgFailed ? (
                <img
                  src="/src/assets/images/application_review_consultation_1795117752977.jpg"
                  alt="Application specialist carefully reviewing forms and digital records"
                  referrerPolicy="no-referrer"
                  onError={() => setConsultImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 text-slate-500 text-sm">
                  Careful document review before submission
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
                    Preparation Checklist
                  </p>
                  <h2 className="font-display text-2xl font-bold text-[#0F2744] mt-1">
                    What You&apos;ll Need Before You Start
                  </h2>
                  <p className="text-sm text-slate-600 mt-2">
                    Have these items nearby to complete your online form in about 10 minutes. Your progress auto-saves in your browser session.
                  </p>
                </div>

                <ul className="space-y-3.5">
                  {[
                    "Valid Illinois Driver's License or State Identification Card",
                    'FOID card number (and height/weight listed on your FOID)',
                    'Active email address (required by ISP to submit an application)',
                    '10 years of residential address history (with move-in/move-out months & years)',
                    'Copy of your training certificate (PDF, JPG, or PNG — required for applicants)',
                    'Fingerprint TCN number from Digital Synergy (optional, if you were fingerprinted)',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-slate-700">
                      <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#0F2744]/10 text-[#0F2744] shrink-0">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-[#0F2744] shrink-0" aria-hidden="true" />
                  <span>Encrypted with AES-256-GCM</span>
                </div>
                <Link
                  to="/apply"
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>Start Application</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16">
          <div className="mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2744]">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-slate-600">
              Clear answers about Illinois CCL &amp; FOID processing.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full min-h-[56px] px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-display font-semibold text-[#0F2744] text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Block */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <div className="bg-[#0F2744] text-white rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <h2 className="font-display text-2xl font-bold text-white">
              Have Questions Before Applying?
            </h2>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              Reach out directly to {BUSINESS_INFO.owner} for guidance on your Illinois Concealed Carry or FOID paperwork.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href={BUSINESS_INFO.phoneHref}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 bg-white text-[#0F2744] font-semibold text-sm rounded-lg hover:bg-slate-100 transition-colors tabular-nums whitespace-nowrap"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              <span>{BUSINESS_INFO.phoneDisplay}</span>
            </a>
            <a
              href={BUSINESS_INFO.emailHref}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#17365D] text-white border border-slate-500/40 font-semibold text-sm rounded-lg hover:bg-[#21497A] transition-colors whitespace-nowrap"
            >
              <Mail className="w-4 h-4" aria-hidden="true" />
              <span>{BUSINESS_INFO.email}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
