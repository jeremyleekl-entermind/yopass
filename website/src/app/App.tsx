import { useState } from 'react';
import CreateSecret from '@features/CreateSecret';
import PasswordGenerator from '@features/PasswordGenerator';
import { Routes, Route, HashRouter, useLocation } from 'react-router-dom';
import { useConfig } from '@shared/hooks/useConfig';
import { useAuth } from '@shared/hooks/useAuth';
import Navbar from '@shared/components/Navbar';
import Prefetcher from '@features/display-secret/Prefetcher';
import StreamingUpload from '@features/StreamingUpload';
import ReadOnlyLanding from '@features/ReadOnlyLanding';
import LoginRequired from '@features/LoginRequired';
import CreateRequest from '@features/request-secret/CreateRequest';
import RequestList from '@features/request-secret/RequestList';
import ProvideSecret from '@features/request-secret/ProvideSecret';
import ReceiptList from '@features/receipts/ReceiptList';
import { useTranslation } from 'react-i18next';
import { Barcode, HeroField } from '../enterpass/Hero';
import {
  Board,
  HowItWorks,
  PasswordCta,
  TicketHistory,
} from '../enterpass/Sections';
import { EnterFooter } from '../enterpass/Footer';
import { useMotionReady } from '../enterpass/motion';

// The landing sections belong to the home page only.
function HomeSections() {
  const { pathname } = useLocation();
  if (pathname !== '/') return null;
  return (
    <>
      <HowItWorks />
      <TicketHistory />
      <Board />
      <PasswordCta />
    </>
  );
}

export default function App() {
  const {
    DISABLE_UPLOAD,
    READ_ONLY,
    PRIVACY_NOTICE_URL,
    IMPRINT_URL,
    REQUIRE_AUTH,
    SECRET_REQUESTS,
    READ_RECEIPTS,
  } = useConfig();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  useMotionReady();

  const [loginUnavailable, setLoginUnavailable] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('login_error')) {
      window.history.replaceState(
        {},
        '',
        window.location.pathname + window.location.hash,
      );
      return true;
    }
    return false;
  });

  // Whether creation pages must show the login gate instead of their content.
  const needsLogin = REQUIRE_AUTH && !authLoading && !isAuthenticated;
  return (
    <div className="min-h-svh bg-base-200 flex flex-col overflow-x-hidden">
      <button
        onClick={() => {
          const main = document.getElementById('main-content');
          main?.focus({ preventScroll: true });
          main?.scrollIntoView({ block: 'start' });
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-content focus:rounded-md"
      >
        {t('accessibility.skipToContent')}
      </button>
      <HashRouter>
        <Navbar />

        {/* Main Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full mb-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div className="ep-shell">
            <div className="ep-card ep-pass" data-theme="enterpass-light">
              <Barcode />
              {loginUnavailable && (
                <div role="alert" className="alert alert-warning mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 shrink-0 stroke-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>{t('auth.loginUnavailable')}</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setLoginUnavailable(false)}
                    aria-label={t('accessibility.dismiss')}
                  >
                    &times;
                  </button>
                </div>
              )}
              <Routes>
                <Route
                  path="/"
                  element={
                    READ_ONLY ? (
                      <ReadOnlyLanding />
                    ) : needsLogin ? (
                      <LoginRequired />
                    ) : (
                      <CreateSecret />
                    )
                  }
                />
                {READ_ONLY ? (
                  <Route path="/upload" element={<ReadOnlyLanding />} />
                ) : needsLogin ? (
                  <Route path="/upload" element={<LoginRequired />} />
                ) : (
                  !DISABLE_UPLOAD && (
                    <Route path="/upload" element={<StreamingUpload />} />
                  )
                )}
                <Route
                  path="/generate"
                  element={
                    needsLogin ? <LoginRequired /> : <PasswordGenerator />
                  }
                />
                {SECRET_REQUESTS && (
                  <>
                    <Route
                      path="/request"
                      element={
                        needsLogin ? <LoginRequired /> : <CreateRequest />
                      }
                    />
                    <Route path="/requests" element={<RequestList />} />
                    <Route path="/r/:key" element={<ProvideSecret />} />
                    <Route path="/r/:key/:fp" element={<ProvideSecret />} />
                  </>
                )}
                {READ_RECEIPTS && (
                  <Route path="/receipts" element={<ReceiptList />} />
                )}
                <Route
                  path="/:format/:key/:password"
                  element={<Prefetcher />}
                />
                <Route path="/:format/:key" element={<Prefetcher />} />
              </Routes>
            </div>
            <HeroField />
          </div>
          <HomeSections />
        </main>
        <EnterFooter
          privacyUrl={PRIVACY_NOTICE_URL}
          imprintUrl={IMPRINT_URL}
          privacyLabel={t('footer.privacyNotice')}
          imprintLabel={t('footer.imprint')}
        />
      </HashRouter>
    </div>
  );
}
