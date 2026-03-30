import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PublicNetworkUpgradePage from './components/PublicNetworkUpgradePage';
import HomePage from './components/HomePage';
import RankPage from './components/RankPage';
import CallsIndexPage from './components/CallsIndexPage';
import CallPage from './components/call/CallPage';
import CallPlanPage from './components/call/CallPlanPage';
import { SchedulePage } from './components/schedule';
import { EipPage } from './components/eip';
import EipsIndexPage from './components/EipsIndexPage';
import { StakeholderUpgradePage } from './components/stakeholder';
import ComplexityPage from './components/ComplexityPage';
import PrioritizationPage from './components/PrioritizationPage';
import DevnetsIndexPage from './components/DevnetsIndexPage';
import DevnetSpecPage from './components/DevnetSpecPage';
import DecisionsPage from './components/DecisionsPage';
import { getUpgradeById } from './data/upgrades';
import { useAnalytics } from './hooks/useAnalytics';
import { ThemeProvider } from './contexts/ThemeContext';
import ExternalRedirect from './components/ExternalRedirect';

const stripTrailingSlashes = (p: string): string =>
  p === '/' ? '/' : p.replace(/\/+$/, '');

const normalizePath = (targetPath: string): string => {
  const url = new URL(targetPath, window.location.origin);
  return `${stripTrailingSlashes(url.pathname)}${url.search}${url.hash}`;
};

const getTrackedPageName = (pathname: string, search: string): string | null => {
  const normalizedPath = stripTrailingSlashes(pathname);
  const searchParams = new URLSearchParams(search);

  if ((pathname !== '/' && /\/+$/.test(pathname)) || searchParams.has('redirect')) {
    return null;
  }

  return normalizedPath;
};

function RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for redirect parameter from 404.html
    const urlParams = new URLSearchParams(location.search);
    const redirect = urlParams.get('redirect');
    const currentPath = `${location.pathname}${location.search}${location.hash}`;
    const normalizedPath = normalizePath(redirect || currentPath);

    if (redirect || normalizedPath !== currentPath) {
      // Use replace to avoid adding to browser history
      navigate(normalizedPath, { replace: true });
    }
  }, [navigate, location.pathname, location.search, location.hash]);

  return null;
}

function AnalyticsTracker() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();
  const pageName = getTrackedPageName(location.pathname, location.search);

  useEffect(() => {
    if (!pageName) {
      return;
    }

    // Track page views when route changes in SPA
    const pageTitle = document.title;

    trackPageView(pageName, pageTitle);
  }, [pageName, trackPageView]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const fusakaUpgrade = getUpgradeById('fusaka')!;
  const glamsterdamUpgrade = getUpgradeById('glamsterdam')!;
  const hegotaUpgrade = getUpgradeById('hegota')!;
  const pectraUpgrade = getUpgradeById('pectra')!;

  return (
    <ThemeProvider>
      <Router basename="">
        <RedirectHandler />
        <AnalyticsTracker />
        <ScrollToTop />
        <div className="scanlines" aria-hidden="true" />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/upgrade/pectra" element={
              <PublicNetworkUpgradePage
                forkName="Pectra"
                displayName={pectraUpgrade.name}
                description={pectraUpgrade.description}
                status={pectraUpgrade.status}
                activationDate={pectraUpgrade.activationDate}
                metaEipLink={pectraUpgrade.metaEipLink}
                activationDetails={pectraUpgrade.activationDetails}
              />
            } />
            <Route path="/upgrade/fusaka" element={
              <PublicNetworkUpgradePage
                forkName="Fusaka"
                displayName={fusakaUpgrade.name}
                description={fusakaUpgrade.description}
                status={fusakaUpgrade.status}
                activationDate={fusakaUpgrade.activationDate}
                metaEipLink={fusakaUpgrade.metaEipLink}
                activationDetails={fusakaUpgrade.activationDetails}
              />
            } />
            <Route path="/upgrade/glamsterdam" element={
              <PublicNetworkUpgradePage
                forkName="Glamsterdam"
                displayName={glamsterdamUpgrade.name}
                description={glamsterdamUpgrade.description}
                status={glamsterdamUpgrade.status}
                activationDate={glamsterdamUpgrade.activationDate}
                metaEipLink={glamsterdamUpgrade.metaEipLink}
                clientTeamPerspectives={glamsterdamUpgrade.clientTeamPerspectives}
              />
            } />
            <Route path="/upgrade/glamsterdam/stakeholders" element={<StakeholderUpgradePage forkName="Glamsterdam" />} />
            <Route path="/upgrade/hegota" element={
              <PublicNetworkUpgradePage
                forkName="Hegota"
                displayName={hegotaUpgrade.name}
                description={hegotaUpgrade.description}
                status={hegotaUpgrade.status}
                activationDate={hegotaUpgrade.activationDate}
                metaEipLink={hegotaUpgrade.metaEipLink}
              />
            } />
            <Route path="/rank" element={<RankPage />} />
            <Route path="/calls" element={<CallsIndexPage />} />
            <Route path="/agenda" element={<CallPlanPage />} />
            <Route path="/calls/*" element={<CallPage />} />
            <Route path="/feedback" element={<ExternalRedirect />} />
            <Route path="/eips" element={<EipsIndexPage />} />
            <Route path="/eips/:id" element={<EipPage />} />
            <Route path="/complexity" element={<ComplexityPage />} />
            <Route path="/priority" element={<PrioritizationPage />} />
            <Route path="/devnets/:id" element={<DevnetSpecPage />} />
            <Route path="/devnets" element={<DevnetsIndexPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            {/* Catch-all route that redirects to home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </Router>
    </ThemeProvider>
  );
}

export default App;
