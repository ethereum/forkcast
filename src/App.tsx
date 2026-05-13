import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import PublicNetworkUpgradePage from './components/PublicNetworkUpgradePage';
import HomePage from './components/HomePage';
import RankPage from './components/RankPage';
import CallsIndexPage from './components/CallsIndexPage';
import CallPage from './components/call/CallPage';
import CallPlanPage from './components/call/CallPlanPage';
import { SchedulePage } from './components/schedule';
import { EipPage } from './components/eip';
import EipsIndexPage from './components/EipsIndexPage';
import DevnetsIndexPage from './components/DevnetsIndexPage';
import UpgradesIndexPage from './components/UpgradesIndexPage';
import GlamsterdamUpgradePage from './components/GlamsterdamUpgradePage';
import EipsTab from './components/glamsterdam/EipsTab';
import OverviewTab from './components/glamsterdam/OverviewTab';
import StakeholdersTab from './components/glamsterdam/StakeholdersTab';
import DevnetSpecPage from './components/DevnetSpecPage';
import DecisionsPage from './components/DecisionsPage';
import { getUpgradeById } from './data/upgrades';
import { useAnalytics } from './hooks/useAnalytics';
import { ThemeProvider } from './contexts/ThemeContext';
import ExternalRedirect from './components/ExternalRedirect';
import SiteNav, { type SiteNavProps } from './components/ui/SiteNav';

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

function SiteLayout({ children, navProps }: { children?: ReactNode; navProps?: SiteNavProps }) {
  return (
    <>
      <SiteNav {...navProps} />
      <main>
        {children ?? <Outlet />}
      </main>
    </>
  );
}

function CallRouteLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchRequestId, setSearchRequestId] = useState(0);
  const openSearch = useCallback(() => setSearchRequestId((id) => id + 1), []);

  return (
    <SiteLayout navProps={{ variant: 'wide', callActions: { onSearch: openSearch } }}>
      <CallPage
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchRequestId={searchRequestId}
      />
    </SiteLayout>
  );
}

function App() {
  const fusakaUpgrade = getUpgradeById('fusaka')!;
  const hegotaUpgrade = getUpgradeById('hegota')!;
  const pectraUpgrade = getUpgradeById('pectra')!;

  return (
    <ThemeProvider>
      <Router basename="">
        <RedirectHandler />
        <AnalyticsTracker />
        <ScrollToTop />
        <div className="scanlines" aria-hidden="true" />
        <Routes>
          <Route path="/calls/*" element={<CallRouteLayout />} />
          <Route element={<SiteLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/upgrades" element={<UpgradesIndexPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/planner" element={<Navigate to="/schedule" replace />} />
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
            <Route path="/upgrade/glamsterdam" element={<GlamsterdamUpgradePage />}>
              <Route index element={<OverviewTab />} />
              <Route path="overview" element={<Navigate to="/upgrade/glamsterdam" replace />} />
              <Route path="eips" element={<EipsTab />} />
              <Route path="stakeholders" element={<StakeholdersTab />} />
              <Route path="devnet-inclusion" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
              <Route path="client-priority" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
              <Route path="test-complexity" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            </Route>
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
            <Route path="/feedback" element={<ExternalRedirect />} />
            <Route path="/eips" element={<EipsIndexPage />} />
            <Route path="/eips/:id" element={<EipPage />} />
            <Route path="/glamsterdam" element={<Navigate to="/upgrade/glamsterdam" replace />} />
            <Route path="/glamsterdam/priority" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/glamsterdam/complexity" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/priority" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/complexity" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            {/* Legacy Glamsterdam metadata URLs now redirect to the consolidated EIPs explorer. */}
            <Route path="/upgrade/glamsterdam/candidates" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/upgrade/glamsterdam/priority" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/upgrade/glamsterdam/complexity" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/upgrade/glamsterdam/devnets" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/upgrade/glamsterdam/devnets/priority" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/upgrade/glamsterdam/devnets/complexity" element={<Navigate to="/upgrade/glamsterdam/eips" replace />} />
            <Route path="/devnets/:id" element={<DevnetSpecPage />} />
            <Route path="/devnets" element={<DevnetsIndexPage />} />
            <Route path="/decisions" element={<DecisionsPage />} />
            {/* Catch-all route that redirects to home page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
