import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PublicNetworkUpgradePage from './components/PublicNetworkUpgradePage';
import HomePage from './components/HomePage';
import RankPage from './components/RankPage';
import CallsIndexPage from './components/CallsIndexPage';
import CallPage from './components/call/CallPage';
import { getUpgradeById } from './data/upgrades';
import { useAnalytics } from './hooks/useAnalytics';
import { ThemeProvider } from './contexts/ThemeContext';
import ExternalRedirect from './components/ExternalRedirect';
import EipPage from './components/EipPage';

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

function App() {
  const fusakaUpgrade = getUpgradeById('fusaka')!;
  const glamsterdamUpgrade = getUpgradeById('glamsterdam')!;
  // const hekotaUpgrade = getUpgradeById('hekota')!;
  const pectraUpgrade = getUpgradeById('pectra')!;

  return (
    <ThemeProvider>
      <Router basename="">
        <RedirectHandler />
        <AnalyticsTracker />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upgrade/pectra" element={
            <PublicNetworkUpgradePage
              forkName="Pectra"
              displayName={pectraUpgrade.name}
              description={pectraUpgrade.description}
              status={pectraUpgrade.status}
              activationDate={pectraUpgrade.activationDate}
              metaEipLink={pectraUpgrade.metaEipLink}
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
          {/* <Route path="/upgrade/hekota" element={
            <PublicNetworkUpgradePage
              forkName="Hekotá"
              displayName={hekotaUpgrade.name}
              description={hekotaUpgrade.description}
              status={hekotaUpgrade.status}
              metaEipLink={hekotaUpgrade.metaEipLink}
            />
          } /> */}
          <Route path="/rank" element={<RankPage />} />
          <Route path="/calls" element={<CallsIndexPage />} />
          <Route path="/calls/*" element={<CallPage />} />
          <Route path="/feedback" element={<ExternalRedirect />} />
          <Route path="/eips/:id" element={<EipPage />} />
          {/* Catch-all route that redirects to home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;