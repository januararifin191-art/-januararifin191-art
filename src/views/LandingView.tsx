import React, { useState } from 'react';
import { Vote, Users, ArrowRight, Calendar, Award, Bell, User } from 'lucide-react';
import { Candidate, ElectionSettings, Announcement, Voter } from '../types';
import { SchoolLogo } from '../components/SchoolLogo';
import { CountdownTimer } from '../components/CountdownTimer';

interface LandingViewProps {
  settings: ElectionSettings | null;
  candidates: Candidate[];
  announcements: Announcement[];
  onNavigate: (view: string) => void;
  currentVoter: Voter | null;
  totalVoters: number;
}

const CandidatePortrait: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#0F2744] via-[#0B1A30] to-[#071324] flex flex-col items-center justify-center text-slate-500 gap-2">
        <User className="w-12 h-12 text-amber-400/60" />
        <span className="text-xs font-medium text-slate-400">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
    />
  );
};

export const LandingView: React.FC<LandingViewProps> = ({
  settings,
  candidates,
  announcements,
  onNavigate,
  currentVoter,
  totalVoters,
}) => {
  const statusLabel =
    settings?.status === 'ongoing'
      ? 'Pemungutan Suara Berlangsung'
      : settings?.status === 'completed'
      ? 'Pemilihan Selesai'
      : 'Menjelang Pemungutan Suara';

  const countdownTarget =
    settings?.status === 'upcoming'
      ? settings.startTime
      : settings?.endTime || new Date().toISOString();

  const formatSchedule = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-14 py-6 sm:py-10">
      {/* Institutional Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0E2340] via-[#0B1A30] to-[#081525] border border-slate-800/90 px-6 py-10 sm:px-12 sm:py-14 text-center text-white shadow-2xl">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* School Emblem & Unboxed Metadata */}
          <div className="flex flex-col items-center gap-3.5">
            <SchoolLogo
              src={settings?.schoolLogo}
              alt={settings?.schoolName || 'Logo Sekolah'}
              sizeClass="w-16 h-16 sm:w-20 sm:h-20"
              iconClass="w-8 h-8 text-amber-400"
              roundedClass="rounded-2xl"
            />
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-300 tracking-wide">
              <span className="text-amber-300 font-semibold">
                {settings?.schoolName || 'SMA NEGERI 1 RAHAYU'}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span>Periode {settings?.academicYear || '2026/2027'}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span>{statusLabel}</span>
            </div>
          </div>

          {/* Balanced Headline & Serif Motto */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-balance text-white">
              {settings?.title || 'PEMILIHAN KETUA OSIS'}
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              "{settings?.tagline || 'Satu Suara, Satu Perubahan, Masa Depan Sekolah, RAHAYU'}"
            </p>
          </div>

          {/* Hairline Divider */}
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto" />

          {/* Live Election Countdown */}
          <div className="flex flex-col items-center gap-2.5">
            <CountdownTimer
              targetDate={countdownTarget}
              status={settings?.status || 'ongoing'}
            />
            {settings?.startTime && settings?.endTime && (
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                <span>
                  Jadwal: {formatSchedule(settings.startTime)} — {formatSchedule(settings.endTime)}
                </span>
              </p>
            )}
          </div>

          {/* Primary & Secondary Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentVoter ? (
              <button
                onClick={() => onNavigate(currentVoter.hasVoted ? 'results' : 'voting')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Vote className="w-4 h-4" />
                <span>{currentVoter.hasVoted ? 'Lihat Rekapitulasi' : 'Buka Bilik Suara'}</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Vote className="w-4 h-4" />
                <span>Masuk &amp; Berikan Suara</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('candidates')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#071324]/90 hover:bg-slate-800/80 text-slate-100 font-semibold text-sm border border-slate-700/90 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Lihat Visi &amp; Misi Calon</span>
            </button>
          </div>
        </div>
      </section>

      {/* Operational Institutional Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0B1A30] border border-slate-800/80 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Pemilih Terdaftar (DPT)</p>
          <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums mt-1">
            {totalVoters.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-[#0B1A30] border border-slate-800/80 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Kandidat Ketua OSIS</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums mt-1">
            {candidates.length}
          </p>
        </div>
        <div className="bg-[#0B1A30] border border-slate-800/80 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Status Bilik Suara</p>
          <p className="text-sm sm:text-base font-bold text-white mt-2">
            {settings?.status === 'ongoing'
              ? 'Dibuka'
              : settings?.status === 'completed'
              ? 'Ditutup'
              : 'Persiapan'}
          </p>
        </div>
        <div className="bg-[#0B1A30] border border-slate-800/80 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-slate-400 font-medium">Asas Pemilihan</p>
          <p className="text-sm sm:text-base font-bold text-emerald-400 mt-2">
            LUBER &amp; JURDIL
          </p>
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-amber-400" />
              <span>Pengumuman Panitia</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.slice(0, 2).map((ann) => (
              <article
                key={ann.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#0B1A30] border border-slate-800/80 space-y-2.5"
              >
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 font-medium">{ann.date}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{ann.priority === 'urgent' ? 'Mendesak' : ann.priority === 'important' ? 'Penting' : 'Informasi'}</span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{ann.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Candidates Preview */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Kandidat Calon Ketua OSIS</span>
          </h2>
          <button
            onClick={() => onNavigate('candidates')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="group rounded-2xl bg-[#0B1A30] border border-slate-800/80 overflow-hidden hover:border-amber-500/40 transition-colors flex flex-col"
            >
              <div className="relative h-60 overflow-hidden bg-[#071324]">
                <CandidatePortrait src={cand.photoUrl} alt={cand.chairmanName} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A30] via-transparent to-black/30" />
                <div className="absolute top-3.5 left-3.5 bg-[#081525]/90 backdrop-blur-sm border border-amber-500/40 text-amber-300 font-bold text-sm px-3 py-1 rounded-lg tabular-nums">
                  No. 0{cand.candidateNumber}
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="text-xs text-slate-400 font-medium">
                    Kelas {cand.chairmanClass}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    {cand.chairmanName}
                  </h3>
                  <p className="font-serif italic text-xs sm:text-sm text-amber-300/90">
                    "{cand.tagline}"
                  </p>
                  <p className="text-xs text-slate-400 pt-1 line-clamp-2 leading-relaxed">
                    {cand.vision}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('candidates')}
                  className="w-full py-2.5 rounded-xl bg-[#071324] hover:bg-slate-800/90 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700/80 cursor-pointer transition-colors"
                >
                  Detail Visi, Misi &amp; Program
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
