import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingView } from './views/LandingView';
import { CandidatesView } from './views/CandidatesView';
import { VoterLoginView } from './views/VoterLoginView';
import { VotingView } from './views/VotingView';
import { ResultsView } from './views/ResultsView';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { GuideModal } from './components/GuideModal';
import { FAQSection } from './components/FAQSection';
import { ContactSection } from './components/ContactSection';
import { Candidate, Voter, ElectionSettings, Announcement } from './types';
import { electionStore } from './services/store';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [votersCount, setVotersCount] = useState<number>(0);
  const [currentVoter, setCurrentVoter] = useState<Voter | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(false);
  const [showStandaloneGuide, setShowStandaloneGuide] = useState<boolean>(false);
  const [isLoadingApp, setIsLoadingApp] = useState<boolean>(true);

  useEffect(() => {
    initializeApp();
    const unsubscribe = electionStore.subscribeToResultsChanges(() => {
      Promise.all([
        electionStore.getSettings(),
        electionStore.getCandidates(),
        electionStore.getAnnouncements(),
        electionStore.getVoters(),
      ])
        .then(([st, cd, an, vt]) => {
          setSettings(st);
          setCandidates(cd);
          setAnnouncements(an);
          setVotersCount(vt.length);
          const voterSession = electionStore.getCurrentVoter();
          if (voterSession) {
            const fresh = vt.find((v) => v.id === voterSession.id);
            if (fresh) setCurrentVoter(fresh);
          }
        })
        .catch(() => {});
    });
    return () => unsubscribe();
  }, []);

  const initializeApp = async () => {
    setIsLoadingApp(true);
    try {
      await electionStore.checkConnection();
      const [st, cd, an, vt] = await Promise.all([
        electionStore.getSettings(),
        electionStore.getCandidates(),
        electionStore.getAnnouncements(),
        electionStore.getVoters(),
      ]);
      setSettings(st);
      setCandidates(cd);
      setAnnouncements(an);
      setVotersCount(vt.length);

      const voterSession = electionStore.getCurrentVoter();
      if (voterSession) {
        const fresh = vt.find((v) => v.id === voterSession.id);
        setCurrentVoter(fresh || voterSession);
      }

      const adminSession = electionStore.getAdminSession();
      if (adminSession) {
        const activeAdmins = await electionStore.getAdmins();
        const valid = activeAdmins.find((a) => a.id === adminSession.id && a.status === 'active');
        if (valid) {
          setAdminLoggedIn(true);
        } else {
          electionStore.logoutAdmin();
          setAdminLoggedIn(false);
        }
      }
    } catch (e) {
      console.warn('Initialization error:', e);
    } finally {
      setIsLoadingApp(false);
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'guide') {
      setShowStandaloneGuide(true);
      return;
    }
    if (view === 'faq') {
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.getElementById('faq-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'landing' || view === 'voting' || view === 'candidates') {
      Promise.all([
        electionStore.getSettings(),
        electionStore.getCandidates(),
        electionStore.getVoters(),
      ])
        .then(([st, cd, vt]) => {
          setSettings(st);
          setCandidates(cd);
          setVotersCount(vt.length);
          const sessionVoter = electionStore.getCurrentVoter();
          if (sessionVoter) {
            const fresh = vt.find((v) => v.id === sessionVoter.id);
            if (fresh) setCurrentVoter(fresh);
          }
        })
        .catch(() => {});
    }
  };

  const handleLogoutVoter = () => {
    electionStore.setCurrentVoter(null);
    setCurrentVoter(null);
    setCurrentView('landing');
  };

  const handleLogoutAdmin = () => {
    electionStore.logoutAdmin();
    setAdminLoggedIn(false);
    setCurrentView('landing');
  };

  if (isLoadingApp) {
    return (
      <div className="min-h-screen bg-[#081525] flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-semibold">Memuat E-Voting OSIS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#081525] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentVoter={currentVoter}
        onLogoutVoter={handleLogoutVoter}
        settings={settings}
        adminLoggedIn={adminLoggedIn}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {currentView === 'landing' && (
          <>
            <LandingView
              settings={settings}
              candidates={candidates}
              announcements={announcements}
              onNavigate={handleNavigate}
              currentVoter={currentVoter}
              totalVoters={votersCount}
            />
            <div id="faq-section" className="py-8 space-y-12">
              <FAQSection />
              <ContactSection settings={settings} />
            </div>
          </>
        )}

        {currentView === 'candidates' && (
          <CandidatesView
            candidates={candidates}
            onNavigate={handleNavigate}
            currentVoter={currentVoter}
            settings={settings}
          />
        )}

        {currentView === 'login' && (
          <VoterLoginView
            onLoginSuccess={(voter) => {
              setCurrentVoter(voter);
              handleNavigate('voting');
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'voting' && currentVoter && (
          <VotingView
            currentVoter={currentVoter}
            candidates={candidates}
            onVoteSubmitted={async () => {
              const vt = await electionStore.getVoters();
              setVotersCount(vt.length);
              const fresh = vt.find((v) => v.id === currentVoter.id);
              if (fresh) setCurrentVoter(fresh);
            }}
            onNavigate={handleNavigate}
            settings={settings}
          />
        )}

        {currentView === 'results' && (
          <ResultsView onNavigate={handleNavigate} settings={settings} />
        )}

        {currentView === 'admin-login' && (
          <AdminLoginView
            onLoginSuccess={() => {
              setAdminLoggedIn(true);
              handleNavigate('admin-dashboard');
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'admin-dashboard' && adminLoggedIn && (
          <AdminDashboardView
            settings={settings}
            onSettingsUpdate={(st) => setSettings(st)}
            onLogoutAdmin={handleLogoutAdmin}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'admin-dashboard' && !adminLoggedIn && (
          <AdminLoginView
            onLoginSuccess={() => {
              setAdminLoggedIn(true);
              handleNavigate('admin-dashboard');
            }}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer settings={settings} onNavigate={handleNavigate} adminLoggedIn={adminLoggedIn} />

      <GuideModal isOpen={showStandaloneGuide} onClose={() => setShowStandaloneGuide(false)} />
    </div>
  );
}
