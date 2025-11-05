import { useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

const FEEDBACK_URL = 'https://ethereum-magicians.org/t/community-feedback-on-non-headlining-features-in-glamsterdam/26410';

const spinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: '5px solid #2a3550',
  borderTop: '5px solid #5b7fff',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto',
  display: 'block',
};

const cardStyle: React.CSSProperties = {
  background: '#1a2236',
  borderRadius: 12,
  boxShadow: '0 4px 24px rgba(16, 22, 36, 0.40)',
  padding: '28px 20px',
  minWidth: 220,
  maxWidth: 340,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#101624',
  fontFamily: 'Inter, system-ui, sans-serif',
};

// Add keyframes for spinner animation globally (only once)
if (typeof document !== 'undefined' && !document.getElementById('external-redirect-spinner-keyframes')) {
  const style = document.createElement('style');
  style.id = 'external-redirect-spinner-keyframes';
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

const ExternalRedirect = () => {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView('/feedback', 'Feedback Redirect');
    const timeout = setTimeout(() => {
      window.location.replace(FEEDBACK_URL);
    }, 500);
    return () => clearTimeout(timeout);
  }, [trackPageView]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={spinnerStyle} aria-label="Loading" />
        <h2 style={{ marginTop: 20, fontWeight: 500, fontSize: 18, color: '#fff', lineHeight: 1.3 }}>
          Taking you to the forum...
        </h2>
        <p style={{ marginTop: 10, color: '#b0b8c9', fontSize: 14, fontWeight: 400 }}>
          If you are not redirected,{' '}
          <a href={FEEDBACK_URL} style={{ color: '#5b7fff', textDecoration: 'underline' }}>click here</a>.
        </p>
      </div>
    </div>
  );
};

export default ExternalRedirect;