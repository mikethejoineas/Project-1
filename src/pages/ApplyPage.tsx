import { ArrowRight, FileCheck2, RefreshCw } from 'lucide-react';
import { Link, usePageMeta } from '../lib/router';
import { SERVICE_FEE_USD } from '../shared/config';

export function ApplyPage() {
  usePageMeta(
    'Start Application – EasyApp Processing | Illinois CCL & FOID',
    'Choose between a New Illinois Concealed Carry & FOID application or a CCL & FOID renewal with EasyApp Processing.'
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold text-[#9A6D1B]">
          Step 1 of Your Application
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F2744]">
          Choose Your Application Type
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Select the option that matches your current Illinois Concealed Carry License and FOID status. Both applications include our ${SERVICE_FEE_USD} preparation, verification, and ISP submission service.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#0F2744]/10 text-[#0F2744]">
              <FileCheck2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
                Form A · First-Time CCL / FOID
              </p>
              <h2 className="font-display text-xl font-bold text-[#0F2744]">
                New Concealed Carry &amp; New FOID Applicant
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                For Illinois residents applying for a new Concealed Carry License or new FOID Card. Includes ISP account setup, 4 security questions, 10-year address history check, 19 eligibility questions, and training certificate upload.
              </p>
            </div>
          </div>
          <Link
            to="/apply/new"
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg transition-colors w-full"
          >
            <span>Start New Application (Form A)</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#0F2744]/10 text-[#0F2744]">
              <RefreshCw className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#9A6D1B] uppercase tracking-wider">
                Form B · Existing Licensees
              </p>
              <h2 className="font-display text-xl font-bold text-[#0F2744]">
                Renewal: Concealed Carry &amp; FOID
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Streamlined renewal form for renewing your Illinois Concealed Carry License and FOID Card, including FOID address changes if needed, 10-year address verification, and renewal training certificate upload.
              </p>
            </div>
          </div>
          <Link
            to="/renewal"
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 text-sm font-semibold text-[#0F2744] bg-white border border-slate-300 hover:border-[#0F2744] hover:bg-slate-50 rounded-lg transition-colors w-full"
          >
            <span>Start Renewal Application (Form B)</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 leading-relaxed">
        <strong>Important Reminder:</strong> Enter your personal information exactly as registered on your valid Illinois Driver&apos;s License/ID and FOID Card. If your Driver&apos;s License address is outdated, update it with the Illinois Secretary of State before submitting your CCL application.
      </div>
    </div>
  );
}
