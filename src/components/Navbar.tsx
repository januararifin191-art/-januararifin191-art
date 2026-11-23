import React, { useState } from 'react';
import {
  Shield,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Voter, ElectionSettings } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentVoter: Voter | null;
  onLogoutVoter: () => void;
  settings: ElectionSettings | null;
  adminLoggedIn: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentVoter,
  onLogoutVoter,
  settings,
  adminLoggedIn,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'landing', label: 'Beranda' },
    { id: 'candidates', label: 'Calon Ketua' },
    { id: 'results', label: 'Hasil Suara' },
    { id: 'guide', label: 'Panduan' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#081525]/92 backdrop-blur-md border-b border-slate-800/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16 sm:h-[72px]">
          {/* Zone 1: School Crest + Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer text-left shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
          >
            <SchoolLogo
              src={settings?.schoolLogo}
              alt={settings?.schoolName || 'Logo Sekolah'}
              sizeClass="w-9 h-9 sm:w-10 sm:h-10"
              iconClass="w-5 h-5 text-amber-400"
            />
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap">
              OSIS VOTE
            </span>
          </button>

          {/* Zone 2: Clean Typographic Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = currentView === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => onNavigate(link.id)}
                  className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    isActive
                      ? 'text-amber-300 border-amber-400 font-semibold'
                      : 'text-slate-300 border-transparent hover:text-white hover:border-slate-700'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {currentVoter ? (
              <div className="flex items-center gap-2.5 bg-[#0B1A30] border border-slate-800 rounded-xl px-3 py-1.5">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white leading-tight max-w-[130px] truncate">
                    {currentVoter.fullName}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-tight">{currentVoter.className}</p>
                </div>
                {!currentVoter.hasVoted && settings?.status === 'ongoing' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('voting')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  >
                    Bilik Suara
                  </button>
                )}
                <button
                  type="button"
                  onClick={onLogoutVoter}
                  title="Keluar Pemilih"
                  className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              >
                Masuk Pemilih
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate(adminLoggedIn ? 'admin-dashboard' : 'admin-login')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                adminLoggedIn
                  ? 'bg-amber-500/15 border-amber-400/60 text-amber-300'
                  : 'bg-[#0B1A30] border-slate-700/90 hover:border-amber-500/40 text-slate-200 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{adminLoggedIn ? 'Dashboard Admin' : 'Admin'}</span>
            </button>
          </div>

          {/* Mobile Bar */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(adminLoggedIn ? 'admin-dashboard' : 'admin-login')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                adminLoggedIn
                  ? 'bg-amber-500/15 border-amber-400/60 text-amber-300'
                  : 'bg-[#0B1A30] border-slate-700 text-slate-200'
              }`}
              title={adminLoggedIn ? 'Buka Dashboard Admin' : 'Login Admin'}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{adminLoggedIn ? 'Admin' : 'Login'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-[#0B1A30] border border-slate-800 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#081525] border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => {
                  onNavigate(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === link.id
                    ? 'text-amber-400 bg-amber-500/10 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            {currentVoter ? (
              <div className="bg-[#0B1A30] p-3 rounded-xl border border-slate-800">
                <div className="mb-2">
                  <p className="text-sm font-bold text-white">{currentVoter.fullName}</p>
                  <p className="text-xs text-slate-400">{currentVoter.className} · NISN {currentVoter.nisn}</p>
                </div>
                <div className="flex gap-2">
                  {!currentVoter.hasVoted && settings?.status === 'ongoing' && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('voting');
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      Bilik Suara
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onLogoutVoter();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onNavigate('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Login Pemilih (Siswa)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onNavigate(adminLoggedIn ? 'admin-dashboard' : 'admin-login');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 bg-[#0B1A30] border border-slate-700 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>{adminLoggedIn ? 'Buka Dashboard Admin' : 'Login Administrator (Panitia)'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
