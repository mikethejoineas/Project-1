import { CheckCircle2, Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, usePageMeta, useRouter } from '../lib/router';
import { BUSINESS_INFO, SERVICE_FEE_USD } from '../shared/config';

interface ReceiptSummary {
  referenceId: string;
  formType: 'new' | 'renewal';
  applicantName: string;
  paymentStatus: string;
  amountUsd: number;
  paidAt: string | null;
}

export function ThankYouPage() {
  usePageMeta(
    'Application Received – Thank You | EasyApp Processing',
    'Your EasyApp Processing application and service fee payment have been received.'
  );

  const { search } = useRouter();
  const params = new URLSearchParams(search);
  const referenceId = params.get('ref') || '';

  const [receipt, setReceipt] = useState<ReceiptSummary | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(Boolean(referenceId));

  useEffect(() => {
    if (!referenceId) {
      setLoadingReceipt(false);
      return;
    }
    setLoadingReceipt(true);
    fetch(`/api/applications/status/${encodeURIComponent(referenceId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setReceipt(data);
      })
      .catch(() => {})
      .finally(() => setLoadingReceipt(false));
  }, [referenceId]);

  return (
    <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2744]">
            Thank You — Application &amp; Payment Received
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Your application details have been encrypted and securely logged for processing by {BUSINESS_INFO.name}. A confirmation email receipt has been sent to the address you provided.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2.5 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-slate-600">Receipt / Reference Number</span>
            <span className="font-mono font-bold text-[#0F2744] tabular-nums">
              {receipt?.referenceId || referenceId || 'EA-CONFIRMED'}
            </span>
          </div>
          {loadingReceipt ? (
            <div className="space-y-2 pt-1 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ) : receipt ? (
            <>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-600">Applicant</span>
                <span className="font-medium text-slate-900">{receipt.applicantName}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-600">Application Type</span>
                <span className="font-medium text-slate-900">
                  {receipt.formType === 'new'
                    ? 'New Concealed Carry & FOID'
                    : 'Concealed Carry & FOID Renewal'}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-600">Service Fee Paid</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  ${(receipt.amountUsd ?? SERVICE_FEE_USD).toFixed(2)} ({receipt.paymentStatus === 'paid' ? 'Paid' : 'Pending Webhook'})
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold text-[#0F2744]">
            What Happens Next
          </h2>
          <ol className="space-y-3 text-sm sm:text-base text-slate-700 list-decimal pl-5 leading-relaxed">
            <li>
              <strong>Application Review:</strong> We will review your driver&apos;s license info, 10-year address history, and training certificate for accuracy.
            </li>
            <li>
              <strong>Follow-Up If Needed:</strong> We will contact you at the email or phone number you provided if anything is missing or needs clarification.
            </li>
            <li>
              <strong>Submission to ISP:</strong> We will create your digital ID, complete and submit your application to the Illinois State Police, and update your FOID address if needed.
            </li>
          </ol>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-slate-600 space-y-1">
            <p className="font-semibold text-[#0F2744]">Questions?</p>
            <div className="flex flex-wrap gap-4">
              <a
                href={BUSINESS_INFO.phoneHref}
                className="inline-flex items-center gap-1.5 text-[#0F2744] hover:underline tabular-nums"
              >
                <Phone className="w-4 h-4" aria-hidden="true" />
                <span>{BUSINESS_INFO.phoneDisplay}</span>
              </a>
              <a
                href={BUSINESS_INFO.emailHref}
                className="inline-flex items-center gap-1.5 text-[#0F2744] hover:underline"
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                <span>{BUSINESS_INFO.email}</span>
              </a>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#0F2744] hover:bg-[#17365D] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
