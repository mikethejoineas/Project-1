import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { Link } from '../../lib/router';
import { BUSINESS_INFO } from '../../shared/config';

export function SiteFooter() {
  return (
    <footer className="bg-[#0B1D33] text-slate-200 border-t border-[#17365D]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-700/60">
          <div className="md:col-span-5 space-y-3">
            <p className="font-display text-lg font-bold text-white">
              {BUSINESS_INFO.name}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              {BUSINESS_INFO.tagline} Independent paperwork preparation and submission assistance for Illinois residents.
            </p>
            <div className="pt-2 space-y-2 text-sm">
              <a
                href={BUSINESS_INFO.emailHref}
                className="inline-flex items-center gap-2 text-slate-200 hover:text-white transition-colors mr-6"
              >
                <Mail className="w-4 h-4 text-[#D4A64A]" aria-hidden="true" />
                <span>{BUSINESS_INFO.email}</span>
              </a>
              <a
                href={BUSINESS_INFO.phoneHref}
                className="inline-flex items-center gap-2 text-slate-200 hover:text-white transition-colors tabular-nums"
              >
                <Phone className="w-4 h-4 text-[#D4A64A]" aria-hidden="true" />
                <span>{BUSINESS_INFO.phoneDisplay}</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-3 space-y-2.5">
            <h2 className="text-sm font-semibold text-white">Applications</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/apply" className="hover:text-white transition-colors">
                  Start Application
                </Link>
              </li>
              <li>
                <Link to="/apply/new" className="hover:text-white transition-colors">
                  New CCL & FOID (Form A)
                </Link>
              </li>
              <li>
                <Link to="/renewal" className="hover:text-white transition-colors">
                  CCL & FOID Renewal (Form B)
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <h2 className="text-sm font-semibold text-white">Legal & Administration</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms & Disclaimer
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D4A64A]" aria-hidden="true" />
                  <span>Owner Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 space-y-3 text-xs text-slate-300 leading-relaxed">
          <p className="font-medium text-slate-200">
            {BUSINESS_INFO.disclaimer}
          </p>
          <p className="text-slate-400">
            © {new Date().getFullYear()} {BUSINESS_INFO.name}. {BUSINESS_INFO.serviceArea}.
          </p>
        </div>
      </div>
    </footer>
  );
}
