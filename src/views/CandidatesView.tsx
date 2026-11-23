import React from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Candidate, Voter, ElectionSettings } from '../types';
import { CandidatePortrait } from '../components/CandidatePortrait';

interface CandidatesViewProps {
  candidates: Candidate[];
  onNavigate: (view: string) => void;
  currentVoter: Voter | null;
  settings: ElectionSettings | null;
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({
  candidates,
  onNavigate,
  currentVoter,
  settings,
}) => {
  return (
    <div className="space-y-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <button
            onClick={() => onNavigate('landing')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Depan</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Profil Calon Ketua OSIS
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {settings?.schoolName || 'OSIS'} · Periode {settings?.academicYear || '2026/2027'}
          </p>
        </div>

        {currentVoter && !currentVoter.hasVoted && settings?.status === 'ongoing' && (
          <button
            onClick={() => onNavigate('voting')}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-colors"
          >
            Masuk Bilik Suara
          </button>
        )}
      </div>

      <div className="space-y-8">
        {candidates.map((cand) => (
          <div
            key={cand.id}
            className="bg-[#0B1A30] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
          >
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative w-full md:w-72 h-64 rounded-2xl overflow-hidden shrink-0 border border-slate-700/80 bg-[#071324]">
                <CandidatePortrait src={cand.photoUrl} alt={cand.chairmanName} />
                <div className="absolute top-3 left-3 bg-[#081525]/90 backdrop-blur-sm border border-amber-500/40 text-amber-300 font-bold text-sm px-3 py-1 rounded-xl tabular-nums">
                  Nomor Urut 0{cand.candidateNumber}
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {cand.chairmanName}
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Calon Ketua OSIS · Kelas {cand.chairmanClass}
                  </p>
                  <p className="font-serif italic text-sm text-amber-300/95 mt-1.5">
                    "{cand.tagline}"
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Visi:</h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#071324] p-4 rounded-xl border border-slate-800/80">
                    {cand.vision}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Misi Utama:</h3>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                    {cand.missions.map((m, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
