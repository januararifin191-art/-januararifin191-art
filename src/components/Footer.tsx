import React from 'react';
import { Shield } from 'lucide-react';
import { ElectionSettings } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface FooterProps {
  settings: ElectionSettings | null;
  onNavigate: (view: string) => void;
  adminLoggedIn: boolean;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate, adminLoggedIn }) => {
  return (
    <footer className="bg-[#050E1A] border-t border-slate-800/80 text-slate-400 py-10 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-3.5">
          <SchoolLogo
            src={settings?.schoolLogo}
            alt={settings?.schoolName || 'Logo Sekolah'}
            sizeClass="w-11 h-11"
            iconClass="w-5 h-5 text-amber-400"
          />
          <div className="space-y-0.5">
            <span className="font-bold text-white tracking-wide text-sm block">
              OSIS VOTE · {settings?.schoolName || 'SMA NEGERI 1 RAHAYU'}
            </span>
            <p className="text-xs text-slate-400">
              Sistem Pemilihan Ketua OSIS Periode {settings?.academicYear || '2026/2027'}
            </p>
            {settings?.schoolAddress && (
              <p className="text-[11px] text-slate-500">{settings.schoolAddress}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium">
          <button onClick={() => onNavigate('landing')} className="hover:text-amber-300 transition-colors cursor-pointer">
            Beranda
          </button>
          <button onClick={() => onNavigate('candidates')} className="hover:text-amber-300 transition-colors cursor-pointer">
            Calon Ketua
          </button>
          <button onClick={() => onNavigate('results')} className="hover:text-amber-300 transition-colors cursor-pointer">
            Rekap Suara
          </button>
          <button onClick={() => onNavigate('guide')} className="hover:text-amber-300 transition-colors cursor-pointer">
            Panduan
          </button>
          <button
            onClick={() => onNavigate(adminLoggedIn ? 'admin-dashboard' : 'admin-login')}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{adminLoggedIn ? 'Dashboard Admin' : 'Portal Panitia'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-900 text-center text-[11px] text-slate-500">
        Demokrasi Sekolah yang Langsung, Umum, Bebas, Rahasia, Jujur, dan Adil.
      </div>
    </footer>
  );
};
