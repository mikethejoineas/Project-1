import { ApplicationWizard } from './components/forms/ApplicationWizard';
import { SiteFooter } from './components/layout/SiteFooter';
import { SiteHeader } from './components/layout/SiteHeader';
import { RouterProvider, useRouter } from './lib/router';
import { AdminPage } from './pages/AdminPage';
import { ApplyPage } from './pages/ApplyPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { PrivacyPolicyPage, TermsPage } from './pages/LegalPages';
import { PaymentPage } from './pages/PaymentPage';
import { ThankYouPage } from './pages/ThankYouPage';

function PageView() {
  const { pathname, search } = useRouter();
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/') {
    return <HomePage />;
  }
  if (normalized === '/apply') {
    const params = new URLSearchParams(search);
    const type = params.get('type');
    if (type === 'new') return <ApplicationWizard formType="new" />;
    if (type === 'renewal') return <ApplicationWizard formType="renewal" />;
    return <ApplyPage />;
  }
  if (normalized === '/apply/new') {
    return <ApplicationWizard formType="new" />;
  }
  if (normalized === '/renewal' || normalized === '/apply/renewal') {
    return <ApplicationWizard formType="renewal" />;
  }
  if (normalized === '/payment') {
    return <PaymentPage />;
  }
  if (normalized === '/thank-you') {
    return <ThankYouPage />;
  }
  if (normalized === '/contact') {
    return <ContactPage />;
  }
  if (normalized === '/privacy') {
    return <PrivacyPolicyPage />;
  }
  if (normalized === '/terms') {
    return <TermsPage />;
  }
  if (normalized === '/admin') {
    return <AdminPage />;
  }

  return <HomePage />;
}

export default function App() {
  return (
    <RouterProvider>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
        <SiteHeader />
        <main className="flex-1">
          <PageView />
        </main>
        <SiteFooter />
      </div>
    </RouterProvider>
  );
}
