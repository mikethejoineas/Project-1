import { AlertCircle, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Link, usePageMeta, useRouter } from '../lib/router';
import { SERVICE_FEE_USD } from '../shared/config';

interface ApplicationSummary {
  referenceId: string;
  formType: 'new' | 'renewal';
  applicantName: string;
  paymentStatus: 'pending_payment' | 'paid' | 'failed';
  amountUsd: number;
}

export function PaymentPage() {
  usePageMeta(
    'Secure Payment – EasyApp Processing',
    `Complete your $${SERVICE_FEE_USD}.00 EasyApp Processing service fee securely via Stripe.`
  );

  const { search, navigate } = useRouter();
  const params = new URLSearchParams(search);
  const referenceId = params.get('ref') || '';
  const wasCanceled = params.get('canceled') === '1';

  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);

  useEffect(() => {
    if (!referenceId) {
      setLoading(false);
      setError('No application reference ID provided. Please start or resume your application.');
      return;
    }

    fetch(`/api/applications/status/${encodeURIComponent(referenceId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Application not found');
        if (data.paymentStatus === 'paid') {
          navigate(`/thank-you?ref=${encodeURIComponent(referenceId)}`);
          return;
        }
        setSummary(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load application summary');
      })
      .finally(() => setLoading(false));
  }, [referenceId, navigate]);

  async function handleCheckout() {
    if (!summary) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await apiRequest<{
        mode: 'stripe' | 'sandbox' | 'already_paid';
        checkoutUrl?: string;
        redirectUrl?: string;
      }>('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ referenceId: summary.referenceId }),
      });

      if (res.mode === 'already_paid' && res.redirectUrl) {
        navigate(res.redirectUrl);
        return;
      }

      if (res.mode === 'stripe' && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      if (res.mode === 'sandbox') {
        setSandboxMode(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed');
    } finally {
      setProcessing(false);
    }
  }

  async function handleSandboxConfirm(outcome: 'success' | 'cancel') {
    if (!summary) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await apiRequest<{ status: string }>('/api/payments/sandbox-confirm', {
        method: 'POST',
        body: JSON.stringify({ referenceId: summary.referenceId, outcome }),
      });
      if (res.status === 'paid') {
        navigate(`/thank-you?ref=${encodeURIComponent(summary.referenceId)}`);
      } else {
        setSandboxMode(false);
        navigate(`/payment?ref=${encodeURIComponent(summary.referenceId)}&canceled=1`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment confirmation failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
          Step 2 · Secure Payment
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2744]">
          Service Fee Checkout
        </h1>
      </div>

      {wasCanceled && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-[#FBF5E8] border border-[#D4A64A]/60 flex items-start gap-3 text-sm text-slate-800"
        >
          <AlertCircle className="w-5 h-5 text-[#9A6D1B] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Payment was canceled. Your application data remains safely saved as Pending Payment—you can complete checkout below when ready.
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4 animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="h-12 bg-slate-200 rounded w-full" />
        </div>
      ) : error && !summary ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4">
          <p className="text-red-700 font-medium">{error}</p>
          <Link
            to="/apply"
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#0F2744] text-white text-sm font-semibold rounded-lg"
          >
            Go to Applications
          </Link>
        </div>
      ) : summary ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-4 border-b border-slate-200 pb-6">
            <h2 className="font-display text-lg font-bold text-[#0F2744]">
              Order Summary
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Reference ID</dt>
                <dd className="font-mono font-semibold text-[#0F2744] tabular-nums">
                  {summary.referenceId}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Applicant Name</dt>
                <dd className="font-medium text-slate-900">{summary.applicantName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Application Type</dt>
                <dd className="font-medium text-slate-900">
                  {summary.formType === 'new'
                    ? 'New Concealed Carry & FOID (Form A)'
                    : 'Concealed Carry & FOID Renewal (Form B)'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 pt-3 border-t border-slate-200 text-base font-bold text-[#0F2744]">
                <dt>EasyApp Processing Service Fee</dt>
                <dd className="tabular-nums">${summary.amountUsd.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
            This ${SERVICE_FEE_USD} covers EasyApp Processing&apos;s service. Illinois State Police state fees are separate and are handled as described by your processor during submission. Card service fees may apply.
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {!sandboxMode ? (
            <button
              type="button"
              disabled={processing}
              onClick={handleCheckout}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 bg-[#0F2744] hover:bg-[#17365D] disabled:opacity-60 text-white font-semibold text-base rounded-lg transition-colors"
            >
              <CreditCard className="w-5 h-5" aria-hidden="true" />
              <span>
                {processing
                  ? 'Connecting to Stripe...'
                  : `Pay $${summary.amountUsd.toFixed(2)} via Secure Checkout`}
              </span>
            </button>
          ) : (
            <div className="p-5 rounded-xl border border-[#0F2744]/20 bg-[#F8FAFC] space-y-4">
              <div className="space-y-1">
                <p className="font-display font-bold text-[#0F2744] text-sm">
                  Stripe Test Checkout Preview Mode
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No live Stripe API key is configured in this environment. Simulate the hosted Stripe Checkout confirmation or cancellation below (no card numbers are collected here).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleSandboxConfirm('success')}
                  className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg"
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  <span>Complete ${summary.amountUsd.toFixed(2)} Test Payment</span>
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleSandboxConfirm('cancel')}
                  className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg"
                >
                  Cancel Checkout
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#0F2744]" aria-hidden="true" />
            <span>We never store card numbers or CVV on EasyApp Processing servers.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
