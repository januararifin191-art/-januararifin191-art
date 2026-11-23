import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Vote, RefreshCw, Trophy, ArrowLeft } from 'lucide-react';
import { electionStore } from '../services/store';
import { ElectionSettings } from '../types';

interface ResultsViewProps {
  onNavigate: (view: string) => void;
  settings: ElectionSettings | null;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ onNavigate, settings }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await electionStore.getResults();
      setData(res);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    const unsubscribe = electionStore.subscribeToResultsChanges(() => {
      fetchResults(true);
    });
    const interval = setInterval(() => {
      fetchResults(true);
    }, 5000);
    const onVisibleOrOnline = () => {
      if (document.visibilityState === 'visible') {
        fetchResults(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibleOrOnline);
    window.addEventListener('online', onVisibleOrOnline);
    return () => {
      unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibleOrOnline);
      window.removeEventListener('online', onVisibleOrOnline);
    };
  }, []);

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
            Rekapitulasi Hasil Suara
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {settings?.schoolName || 'OSIS'} · Pemilihan Ketua OSIS {settings?.academicYear || '2026/2027'}
            {data?.lastUpdatedAt && (
              <span className="text-emerald-400/90 tabular-nums">
                {' '}· Live ({new Date(data.lastUpdatedAt).toLocaleTimeString('id-ID')})
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => fetchResults(false)}
          className="px-4 py-2.5 rounded-xl bg-[#0B1A30] hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/90 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1A30] border border-slate-800/90 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total DPT Siswa</span>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {data.totalVoters.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1A30] border border-slate-800/90 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Suara Sah Masuk</span>
              <p className="text-2xl sm:text-3xl font-bold text-amber-400 tabular-nums">
                {data.totalVotes.toLocaleString('id-ID')}
              </p>
              {typeof data.votedVotersCount === 'number' && data.votedVotersCount !== data.totalVotes && (
                <p className="text-[11px] text-slate-400 tabular-nums">
                  DPT terpakai: {data.votedVotersCount.toLocaleString('id-ID')}
                </p>
              )}
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1A30] border border-slate-800/90 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Menunggu Giliran</span>
              <p className="text-2xl sm:text-3xl font-bold text-slate-300 tabular-nums">
                {data.unvotedCount.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1A30] border border-slate-800/90 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Partisipasi DPT</span>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums">
                {data.participationRate}%
              </p>
            </div>
          </div>

          {/* Candidate Bars */}
          <div className="space-y-4">
            {data.candidates.map((c: any) => (
              <div key={c.id} className="p-6 rounded-2xl bg-[#0B1A30] border border-slate-800/90 space-y-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#071324] border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                      0{c.candidateNumber}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{c.chairmanName}</h3>
                      <p className="text-xs text-slate-400 truncate">
                        Kelas {c.chairmanClass} · <span className="font-serif italic text-amber-300/80">"{c.tagline}"</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold text-amber-400 tabular-nums">{c.percentage}%</span>
                    <p className="text-[11px] text-slate-400 tabular-nums">{c.voteCount} Suara Sah</p>
                  </div>
                </div>

                <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
