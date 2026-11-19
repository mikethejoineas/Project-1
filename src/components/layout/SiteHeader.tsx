import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useRouter } from '../../lib/router';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'New Application', to: '/apply/new' },
  { label: 'Renewal', to: '/renewal' },
  { label: 'Contact', to: '/contact' },
] as const;

export function SiteHeader() {
  const { pathname } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean wordmark */}
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-[#0F2744] whitespace-nowrap shrink-0"
        >
          EasyApp Processing
        </Link>

        {/* Zone 2: 4 concise single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {NAV_LINKS.map((item) => {
            const active =
              item.to === '/'
                ? pathname === '/'
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'border-[#0F2744] text-[#0F2744] font-semibold'
                    : 'border-transparent hover:text-[#0F2744] hover:border-slate-300'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA button + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/apply"
            className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-4 py-2 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Start Application
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1"
        >
          {NAV_LINKS.map((item) => {
            const active =
              item.to === '/'
                ? pathname === '/'
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center min-h-[44px] px-3 rounded-lg text-base font-medium ${
                  active
                    ? 'bg-slate-100 text-[#0F2744] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2">
            <Link
              to="/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-full min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2744] hover:bg-[#17365D] rounded-lg"
            >
              Start Application
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
