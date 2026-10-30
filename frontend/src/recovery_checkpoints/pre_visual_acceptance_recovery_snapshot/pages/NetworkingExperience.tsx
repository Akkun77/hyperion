import { useEffect, useState } from 'react';
import { Link } from '../router';
import api from '../api';
import { RequestJourneyExperience } from './experience/RequestJourneyExperience';
import './experience/experience.css';

export default function NetworkingExperience() {
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const probe = async () => {
      try {
        const health = await api.health();
        if (active && health.status === 'ok') {
          setIsBackendOnline(true);
        }
      } catch {
        if (active) {
          setIsBackendOnline(false);
        }
      }
    };
    probe();
    return () => { active = false; };
  }, []);

  return (
    <div className="experience-page-root">
      {/* Top Header Rail */}
      <header className="experience-top-nav" role="banner">
        <div className="experience-brand">
          <Link href="/" className="brand-link" aria-label="Hyperion Home">
            <span className="brand-symbol">H</span>
            <span className="brand-title">HYPERION</span>
          </Link>
          <span className="experience-badge">INTERACTIVE NETWORKING ARCHITECTURE</span>
          <span className="experience-health-indicator">
            <span className={`dot ${isBackendOnline ? 'online' : 'offline'}`} />
            <span>{isBackendOnline ? 'LIVE API ATTACHED (:8000)' : 'SYNTHESIZED SIMULATION'}</span>
          </span>
        </div>

        <nav className="experience-nav-links" aria-label="Platform Navigation">
          <Link href="/" className="nav-pill">
            Cinematic Home
          </Link>
          <Link href="/experience" className="nav-pill active">
            Explore
          </Link>
          <Link href="/watch" className="nav-pill">
            Watch
          </Link>
          <Link href="/command-center" className="nav-btn-command">
            Enter Command Center ↗
          </Link>
        </nav>
      </header>

      {/* Main Request Journey Experience */}
      <main className="experience-main-content">
        <RequestJourneyExperience isEmbedded={false} />
      </main>
    </div>
  );
}
