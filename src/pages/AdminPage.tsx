import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogOut,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { usePageMeta } from '../lib/router';
import { SECURITY_QUESTIONS } from '../shared/config';
import { CRIMINAL_HISTORY_QUESTIONS } from '../utils/criminalQuestions';

interface SubmissionSummary {
  id: string;
  reference_id: string;
  form_type: 'new' | 'renewal';
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  payment_status: 'pending_payment' | 'paid' | 'failed';
  workflow_status: 'new' | 'submitted_to_isp' | 'completed' | 'purged';
  amount_cents: number;
  certificate_filename: string | null;
  created_at: string;
  paid_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  purge_after: string | null;
}

interface RevealAuditEntry {
  id: number;
  field_name: string;
  admin_actor: string;
  revealed_at: string;
  ip_address: string;
}

interface ApplicationDetailResponse {
  application: {
    id: string;
    referenceId: string;
    formType: 'new' | 'renewal';
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    paymentStatus: string;
    workflowStatus: 'new' | 'submitted_to_isp' | 'completed' | 'purged';
    amountUsd: number;
    certificateFilename: string | null;
    certificateMime: string | null;
    createdAt: string;
    paidAt: string | null;
    submittedAt: string | null;
    completedAt: string | null;
    purgeAfter: string | null;
  };
  data: Record<string, any> | null;
  auditLogs: RevealAuditEntry[];
}

export function AdminPage() {
  usePageMeta(
    'Admin Dashboard – EasyApp Processing',
    '2FA-protected administration console for reviewing encrypted Illinois CCL and FOID applications.'
  );

  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [totpConfigured, setTotpConfigured] = useState(true);

  // Login & 2FA Setup state
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [setupQr, setSetupQr] = useState<{ qrDataUrl: string; manualSecret: string } | null>(null);

  // Dashboard list state
  const [applications, setApplications] = useState<SubmissionSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'renewal'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending_payment'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail state
  const [selectedDetail, setSelectedDetail] = useState<ApplicationDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const checkAuthStatus = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/auth-status', { credentials: 'same-origin' });
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      setTotpConfigured(Boolean(data.totpConfigured));
    } catch {
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const fetchApplications = useCallback(async () => {
    if (!authenticated) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (paymentFilter !== 'all') params.set('payment', paymentFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const data = await apiRequest<{ applications: SubmissionSummary[] }>(
        `/api/admin/applications?${params.toString()}`
      );
      setApplications(data.applications);
    } catch {
      // Handled gracefully
    } finally {
      setListLoading(false);
    }
  }, [authenticated, typeFilter, paymentFilter, searchQuery]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleStart2faSetup() {
    setLoginError(null);
    if (!password) {
      setLoginError('Enter your administrator password first to generate the 2FA QR code.');
      return;
    }
    try {
      const data = await apiRequest<{ qrDataUrl: string; manualSecret: string }>(
        '/api/admin/2fa-setup',
        {
          method: 'POST',
          body: JSON.stringify({ password }),
        }
      );
      setSetupQr(data);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Unable to start 2FA setup');
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      await apiRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password, totpCode }),
      });
      setPassword('');
      setTotpCode('');
      setSetupQr(null);
      setAuthenticated(true);
      setTotpConfigured(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleLogout() {
    await apiRequest('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setAuthenticated(false);
    setSelectedDetail(null);
    setRevealedValues({});
  }

  async function openApplicationDetail(id: string, preserveMessage = false) {
    setDetailLoading(true);
    setRevealedValues({});
    if (!preserveMessage) {
      setActionMessage(null);
    }
    setConfirmDeleteOpen(false);
    try {
      const detail = await apiRequest<ApplicationDetailResponse>(
        `/api/admin/applications/${encodeURIComponent(id)}`
      );
      setSelectedDetail(detail);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to load detail');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRevealField(fieldName: string) {
    if (!selectedDetail) return;
    if (revealedValues[fieldName] !== undefined) {
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      return;
    }

    try {
      const res = await apiRequest<{ fieldName: string; value: string; revealedAt: string }>(
        `/api/admin/applications/${encodeURIComponent(selectedDetail.application.id)}/reveal`,
        {
          method: 'POST',
          body: JSON.stringify({ fieldName }),
        }
      );
      setRevealedValues((prev) => ({ ...prev, [fieldName]: res.value || '—' }));
      setSelectedDetail((prev) =>
        prev
          ? {
              ...prev,
              auditLogs: [
                {
                  id: Date.now(),
                  field_name: fieldName,
                  admin_actor: 'Admin (Bob)',
                  revealed_at: res.revealedAt,
                  ip_address: 'current session',
                },
                ...prev.auditLogs,
              ],
            }
          : null
      );
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Unable to reveal field');
    }
  }

  async function handleWorkflowUpdate(nextStatus: 'submitted_to_isp' | 'completed') {
    if (!selectedDetail) return;
    try {
      await apiRequest(
        `/api/admin/applications/${encodeURIComponent(selectedDetail.application.id)}/status`,
        {
          method: 'POST',
          body: JSON.stringify({ workflowStatus: nextStatus }),
        }
      );
      setActionMessage(
        nextStatus === 'submitted_to_isp'
          ? 'Application marked as Submitted to ISP.'
          : 'Application marked as Completed. Sensitive data is scheduled for automatic purge in 30 days.'
      );
      await openApplicationDetail(selectedDetail.application.id, true);
      await fetchApplications();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Status update failed');
    }
  }

  async function handlePermanentDelete() {
    if (!selectedDetail) return;
    try {
      await apiRequest(
        `/api/admin/applications/${encodeURIComponent(selectedDetail.application.id)}`,
        {
          method: 'DELETE',
        }
      );
      setConfirmDeleteOpen(false);
      setSelectedDetail(null);
      await fetchApplications();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function renderSensitiveRow(label: string, fieldKey: string, maskedValue: string) {
    const isRevealed = revealedValues[fieldKey] !== undefined;
    const displayVal = isRevealed ? revealedValues[fieldKey] : maskedValue;

    return (
      <div className="py-2.5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-sm font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
            {displayVal || '—'}
          </p>
        </div>
        {selectedDetail?.application.workflowStatus !== 'purged' && (
          <button
            type="button"
            onClick={() => handleRevealField(fieldKey)}
            className="no-print shrink-0 inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[#0F2744] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            {isRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reveal</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="max-w-[520px] mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/2" />
          <div className="h-10 bg-slate-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-[500px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#0F2744]/10 text-[#0F2744]">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0F2744]">
              Owner Admin Sign In (2FA Required)
            </h1>
            <p className="text-sm text-slate-600">
              Restricted to Bob Sumption / EasyApp Processing. All sensitive applicant records are AES-256-GCM encrypted at rest.
            </p>
          </div>

          {loginError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                Administrator Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                placeholder="Enter admin password"
              />
            </div>

            {!totpConfigured && !setupQr && (
              <div className="p-4 rounded-xl bg-[#FBF5E8] border border-[#D4A64A]/50 space-y-3">
                <p className="text-xs sm:text-sm text-slate-800 font-medium">
                  First-time 2FA Enrollment: Enter your administrator password above, then pair your authenticator app (Google Authenticator, Authy, or 1Password).
                </p>
                <button
                  type="button"
                  onClick={handleStart2faSetup}
                  className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-semibold text-[#0F2744] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  <QrCode className="w-4 h-4" aria-hidden="true" />
                  <span>Generate 2FA QR Code</span>
                </button>
              </div>
            )}

            {setupQr && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-center">
                <p className="text-xs font-semibold text-[#0F2744]">
                  Scan this QR code with your Authenticator App:
                </p>
                <img
                  src={setupQr.qrDataUrl}
                  alt="2FA Authenticator QR Code"
                  className="mx-auto w-44 h-44 border border-slate-200 rounded-lg bg-white p-2"
                />
                <p className="text-xs text-slate-600">
                  Or enter manual key:{' '}
                  <code className="font-mono font-bold text-[#0F2744] break-all">
                    {setupQr.manualSecret}
                  </code>
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="admin-totp"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                6-Digit Authenticator Code (2FA)
              </label>
              <input
                id="admin-totp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-lg tracking-widest tabular-nums"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 bg-[#0F2744] hover:bg-[#17365D] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              <KeyRound className="w-4 h-4" aria-hidden="true" />
              <span>{loginSubmitting ? 'Verifying...' : 'Sign In to Admin Dashboard'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  if (selectedDetail) {
    const app = selectedDetail.application;
    const data = selectedDetail.data;
    const isPurged = app.workflowStatus === 'purged';

    return (
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6 print-container">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setSelectedDetail(null)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-[#0F2744] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Submissions</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-[#0F2744] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
            >
              <Printer className="w-4 h-4" aria-hidden="true" />
              <span>Export Printable PDF</span>
            </button>

            {app.workflowStatus === 'new' && (
              <button
                type="button"
                onClick={() => handleWorkflowUpdate('submitted_to_isp')}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Mark as Submitted to ISP</span>
              </button>
            )}

            {app.workflowStatus !== 'completed' && !isPurged && (
              <button
                type="button"
                onClick={() => handleWorkflowUpdate('completed')}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Mark as Completed</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Permanently Delete Data</span>
            </button>
          </div>
        </div>

        {confirmDeleteOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="no-print p-5 rounded-xl bg-red-50 border border-red-300 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <h2 id="delete-confirm-title" className="font-display font-bold text-red-900">
                  Permanently Delete Application Record?
                </h2>
                <p className="text-sm text-red-800">
                  This will immediately shred all encrypted personal details and permanently delete the encrypted training certificate file for{' '}
                  <strong>{app.applicantName}</strong> ({app.referenceId}). This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <button
                type="button"
                onClick={handlePermanentDelete}
                className="min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
              >
                Confirm Permanent Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="min-h-[40px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {actionMessage && (
          <div className="no-print p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-900">
            {actionMessage}
          </div>
        )}

        {/* Header Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="font-mono text-xs font-semibold text-[#9A6D1B] tabular-nums">
                {app.referenceId} · {app.formType === 'new' ? 'NEW APPLICATION (FORM A)' : 'RENEWAL (FORM B)'}
              </p>
              <h1 className="font-display text-2xl font-bold text-[#0F2744] mt-1">
                {app.applicantName}
              </h1>
              <p className="text-sm text-slate-600">
                {app.applicantEmail} · {app.applicantPhone}
              </p>
            </div>
            <div className="text-right text-xs space-y-1 tabular-nums">
              <p className="font-semibold text-slate-800">
                Payment: {app.paymentStatus === 'paid' ? 'Paid ($35.00)' : 'Pending Payment'}
              </p>
              <p className="font-semibold text-[#0F2744]">
                Workflow: {app.workflowStatus.replace(/_/g, ' ').toUpperCase()}
              </p>
              <p className="text-slate-500">
                Created: {new Date(app.createdAt).toLocaleString()}
              </p>
              {app.purgeAfter && (
                <p className="text-amber-800 font-medium">
                  Auto-Purge Date: {new Date(app.purgeAfter).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {isPurged || !data ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              Sensitive applicant fields and certificate files for this completed record have been permanently purged.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
              {/* Column 1 */}
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2744] mb-2">
                    Personal Information
                  </h2>
                  <div className="text-sm space-y-1.5 text-slate-700">
                    <p>Place of Birth: {data.personalInfo?.placeOfBirth}</p>
                    <p>Retired Police Officer: {data.personalInfo?.retiredPoliceOfficer}</p>
                  </div>
                  {renderSensitiveRow(
                    'Date of Birth',
                    'dateOfBirth',
                    data.personalInfo?.dateOfBirth
                  )}
                </div>

                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2744] mb-2">
                    Driver&apos;s License / ID
                  </h2>
                  {renderSensitiveRow('DL / State ID #', 'dlNumber', data.driversLicense?.dlNumber)}
                  {renderSensitiveRow('DD # (Document Discriminator)', 'ddNumber', data.driversLicense?.ddNumber)}
                  <div className="grid grid-cols-2 gap-2 pt-2 text-sm text-slate-700 tabular-nums">
                    <p>State: {data.driversLicense?.stateIssued}</p>
                    <p>Class: {data.driversLicense?.dlClass}</p>
                    <p>Issued: {data.driversLicense?.dateIssued}</p>
                    <p>Expires: {data.driversLicense?.expirationDate}</p>
                    <p>Sex: {data.driversLicense?.sex}</p>
                    <p>
                      Height/Wt: {data.driversLicense?.heightFeet}&apos;{data.driversLicense?.heightInches}&quot; / {data.driversLicense?.weightLbs} lbs
                    </p>
                    <p>Hair: {data.driversLicense?.hairColor}</p>
                    <p>Eyes: {data.driversLicense?.eyeColor}</p>
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2744] mb-2">
                    FOID &amp; Citizenship
                  </h2>
                  {renderSensitiveRow('FOID Card #', 'foidNumber', data.foidCitizenship?.foidNumber)}
                  {data.foidCitizenship?.tcnNumber &&
                    renderSensitiveRow('Fingerprint TCN #', 'tcnNumber', data.foidCitizenship.tcnNumber)}
                  {data.foidCitizenship?.isUsCitizen === 'No' && (
                    <>
                      {renderSensitiveRow('ARN #', 'arnNumber', data.foidCitizenship.arnNumber)}
                      {renderSensitiveRow('I-94 #', 'i94Number', data.foidCitizenship.i94Number)}
                      {renderSensitiveRow('Exception #', 'exceptionNumber', data.foidCitizenship.exceptionNumber)}
                    </>
                  )}
                  <div className="pt-2 text-sm text-slate-700 tabular-nums">
                    <p>
                      FOID Height/Wt: {data.foidCitizenship?.foidHeightFeet}&apos;{data.foidCitizenship?.foidHeightInches}&quot; / {data.foidCitizenship?.foidWeightLbs} lbs
                    </p>
                    <p>US Citizen: {data.foidCitizenship?.isUsCitizen}</p>
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2744] mb-2">
                    ISP Account Credentials
                  </h2>
                  <div className="text-sm space-y-1 text-slate-700 mb-2">
                    <p>User ID: <span className="font-mono font-semibold">{data.ispAccount?.ispUserId}</span></p>
                    <p>ISP Email: {data.ispAccount?.ispEmail}</p>
                  </div>
                  {renderSensitiveRow('ISP Password', 'ispPassword', data.ispAccount?.ispPassword)}
                  {app.formType === 'new' && (
                    <>
                      {renderSensitiveRow(SECURITY_QUESTIONS[0].label, 'sq1Answer', data.ispAccount?.sq1Answer)}
                      {renderSensitiveRow(SECURITY_QUESTIONS[1].label, 'sq2Answer', data.ispAccount?.sq2Answer)}
                      {renderSensitiveRow(SECURITY_QUESTIONS[2].label, 'sq3Answer', data.ispAccount?.sq3Answer)}
                      {renderSensitiveRow(SECURITY_QUESTIONS[3].label, 'sq4Answer', data.ispAccount?.sq4Answer)}
                    </>
                  )}
                </div>

                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2744] mb-2">
                    10-Year Address History
                  </h2>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200">
                      <p className="font-semibold text-[#0F2744]">Current Address</p>
                      <p>
                        {data.addressHistory?.streetAddress} {data.addressHistory?.aptBldg}
                      </p>
                      <p>
                        {data.addressHistory?.city}, IL {data.addressHistory?.zip} (Moved in{' '}
                        {data.addressHistory?.moveInMonth}/{data.addressHistory?.moveInYear})
                      </p>
                    </div>
                    {(data.addressHistory?.priorAddresses || []).map(
                      (pa: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-white border border-slate-200"
                        >
                          <p className="font-semibold text-slate-800">
                            Prior Address #{idx + 1}
                          </p>
                          <p>
                            {pa.street}, {pa.city} {pa.zip} ({pa.county} County)
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {pa.moveInMonth}/{pa.moveInYear} to {pa.moveOutMonth}/{pa.moveOutYear}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2744] mb-2">
                    Training Certificate &amp; E-Signature
                  </h2>
                  {app.certificateFilename ? (
                    <a
                      href={`/api/admin/applications/${encodeURIComponent(app.id)}/certificate`}
                      target="_blank"
                      rel="noreferrer"
                      className="no-print inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-semibold text-[#0F2744] bg-[#F8FAFC] border border-slate-300 hover:bg-slate-100 rounded-lg mb-3"
                    >
                      <FileText className="w-4 h-4" aria-hidden="true" />
                      <span>Open Decrypted Certificate ({app.certificateFilename})</span>
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500 mb-3">No certificate file attached.</p>
                  )}

                  <div className="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-sm space-y-2">
                    <p>
                      Printed Name: <strong>{data.authorization?.printedName}</strong> · Date:{' '}
                      <span className="tabular-nums">{data.authorization?.signatureDate}</span>
                    </p>
                    {data.authorization?.signatureData?.startsWith('data:image/') ? (
                      <img
                        src={data.authorization.signatureData}
                        alt="Applicant drawn signature"
                        className="h-16 bg-white border border-slate-200 rounded p-1"
                      />
                    ) : (
                      <p className="font-serif italic text-lg text-[#0F2744]">
                        {data.authorization?.signatureData}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 19 Criminal History Questions (Form A) */}
          {data?.criminalAnswers && (
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <h2 className="font-display text-base font-bold text-[#0F2744]">
                Criminal History &amp; Eligibility Responses
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {CRIMINAL_HISTORY_QUESTIONS.map((q) => {
                  const ans = data.criminalAnswers[q.id] || '—';
                  return (
                    <div
                      key={q.id}
                      className="p-2.5 rounded border border-slate-200 flex items-start justify-between gap-2"
                    >
                      <span className="text-slate-700">
                        <strong className="font-mono">{q.number})</strong> {q.text}
                      </span>
                      <span
                        className={`font-bold shrink-0 ${
                          ans === 'Yes' ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {ans}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reveal Audit Log */}
        <div className="no-print bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="font-display text-base font-bold text-[#0F2744]">
            Sensitive Field Reveal Audit Log
          </h2>
          {selectedDetail.auditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No sensitive fields have been revealed for this submission yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Field</th>
                    <th className="py-2 pr-4 font-semibold">Actor</th>
                    <th className="py-2 pr-4 font-semibold">Revealed At</th>
                    <th className="py-2 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {selectedDetail.auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2 pr-4 font-mono text-[#0F2744]">{log.field_name}</td>
                      <td className="py-2 pr-4">{log.admin_actor}</td>
                      <td className="py-2 pr-4">{new Date(log.revealed_at).toLocaleString()}</td>
                      <td className="py-2 font-mono text-slate-500">{log.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SUBMISSIONS LIST VIEW
  const paidCount = applications.filter((a) => a.payment_status === 'paid').length;
  const submittedCount = applications.filter(
    (a) => a.workflow_status === 'submitted_to_isp'
  ).length;
  const completedCount = applications.filter(
    (a) => a.workflow_status === 'completed'
  ).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
            Owner Administration Console
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2744]">
            Submitted Applications
          </h1>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Visible Submissions', value: applications.length },
          { label: 'Paid & Ready', value: paidCount },
          { label: 'Submitted to ISP', value: submittedCount },
          { label: 'Completed', value: completedCount },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5"
          >
            <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
            <p className="font-display text-2xl font-bold text-[#0F2744] tabular-nums mt-1">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'new', 'renewal'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  typeFilter === t
                    ? 'bg-white text-[#0F2744] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'All Types' : t === 'new' ? 'New (Form A)' : 'Renewal (Form B)'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'paid', 'pending_payment'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPaymentFilter(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  paymentFilter === p
                    ? 'bg-white text-[#0F2744] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'all' ? 'All Payments' : p === 'paid' ? 'Paid' : 'Pending Payment'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search applications"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, ref ID..."
            className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {listLoading || detailLoading ? (
          <div className="p-8 space-y-3 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-full" />
            <div className="h-5 bg-slate-100 rounded w-full" />
            <div className="h-5 bg-slate-100 rounded w-3/4" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="font-display font-bold text-[#0F2744]">
              No Matching Applications
            </p>
            <p className="text-sm text-slate-500">
              Adjust your filters or wait for new client submissions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Reference ID</th>
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Workflow</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 tabular-nums">
                {applications.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#0F2744] whitespace-nowrap">
                      {item.reference_id}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{item.applicant_name}</p>
                      <p className="text-xs text-slate-500">{item.applicant_email}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.form_type === 'new' ? 'New (Form A)' : 'Renewal (Form B)'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold text-xs ${
                          item.payment_status === 'paid'
                            ? 'text-emerald-700'
                            : 'text-[#9A6D1B]'
                        }`}
                      >
                        {item.payment_status === 'paid' ? 'Paid ($35)' : 'Pending Payment'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-slate-700">
                      {item.workflow_status.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openApplicationDetail(item.id)}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-md"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
