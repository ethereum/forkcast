import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PublicNetworkUpgradePage from './components/PublicNetworkUpgradePage';
import HomePage from './components/HomePage';
import RankPage from './components/RankPage';
import CallsIndexPage from './components/CallsIndexPage';
import CallPage from './components/call/CallPage';
import { SchedulePage } from './components/schedule';
import { EipPage } from './components/eip';
import EipsIndexPage from './components/EipsIndexPage';
import { StakeholderUpgradePage } from './components/stakeholder';
import ComplexityPage from './components/ComplexityPage';
import PrioritizationPage from './components/PrioritizationPage';
import DevnetPrioritizationPage from './components/DevnetPrioritizationPage';
import DecisionsPage from './components/DecisionsPage';
import { getUpgradeById } from './data/upgrades';
import { useAnalytics } from './hooks/useAnalytics';
import { ThemeProvider } from './contexts/ThemeContext';
import ExternalRedirect from './components/ExternalRedirect';
import AnnouncementBanner from './components/ui/AnnouncementBanner';

function RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for redirect parameter from 404.html
    const urlParams = new URLSearchParams(location.search);
    const redirect = urlParams.get('redirect');

    if (redirect) {
      // Remove the redirect parameter and navigate to the target path
      urlParams.delete('redirect');
      const newSearch = urlParams.toString();
      const newPath = redirect + (newSearch ? '?' + newSearch : '');

      // Use replace to avoid adding to browser history
      navigate(newPath, { replace: true });
    }
  }, [navigate, location.search]);

  return null;
}

function AnalyticsTracker() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Track page views when route changes in SPA
    const pageName = location.pathname === '/' ? 'homepage' : location.pathname;
    const pageTitle = document.title;

    trackPageView(pageName, pageTitle);
  }, [location.pathname, trackPageView]);

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
        <AnnouncementBanner
          storageKey="gas-repricing-banner-dismissed"
          title="Glamsterdam gas repricing: how do proposed changes affect you?"
          links={[
            {
              url: 'https://docs.google.com/forms/d/e/1FAIpQLScmhDCX1I8-RPFL-AEEBJkBkAtbCq_M9quXHspF_OltTbGCGw/viewform',
              label: 'Take Survey',
              primary: true,
            },
            {
              url: 'https://gasrepricing.com',
              label: 'gasrepricing.com',
            },
          ]}
        />
        <div className="scanlines" />
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
          <Route path="/calls/*" element={<CallPage />} />
          <Route path="/feedback" element={<ExternalRedirect />} />
          <Route path="/eips" element={<EipsIndexPage />} />
          <Route path="/eips/:id" element={<EipPage />} />
          <Route path="/complexity" element={<ComplexityPage />} />
          <Route path="/priority" element={<PrioritizationPage />} />
          <Route path="/devnets" element={<DevnetPrioritizationPage />} />
          <Route path="/decisions" element={<DecisionsPage />} />
          {/* Catch-all route that redirects to home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;