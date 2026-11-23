import React, { useState } from 'react';
import { CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Candidate, Voter, ElectionSettings } from '../types';
import { electionStore } from '../services/store';
import { CandidatePortrait } from '../components/CandidatePortrait';

interface VotingViewProps {
  currentVoter: Voter;
  candidates: Candidate[];
  onVoteSubmitted: () => void;
  onNavigate: (view: string) => void;
  settings: ElectionSettings | null;
}

export const VotingView: React.FC<VotingViewProps> = ({
  currentVoter,
  candidates,
  onVoteSubmitted,
  onNavigate,
  settings,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptCode, setReceiptCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmVote = async () => {
    if (!selectedCandidateId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await electionStore.castVote(selectedCandidateId, currentVoter.id);
      if (res.success) {
        setReceiptCode(res.receiptCode);
        await onVoteSubmitted();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan suara.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (receiptCode) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
        <div className="bg-[#0B1A30] border-2 border-emerald-500/40 rounded-3xl p-8 space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">Suara Anda Sah Terkirim!</h2>
            <p className="text-xs text-slate-300">
              Terima kasih telah menggunakan hak suara Anda dalam Pemilihan Ketua OSIS.
            </p>
          </div>

          <div className="bg-[#071324] border border-slate-800 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kode Verifikasi Surat Suara:</p>
            <p className="text-xl font-mono font-black text-amber-400">{receiptCode}</p>
          </div>

          <button
            onClick={() => onNavigate('results')}
            className="w-full min-h-[48px] py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-colors"
          >
            Lihat Rekapitulasi Suara
          </button>
        </div>
      </div>
    );
  }

  if (currentVoter.hasVoted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
        <div className="bg-[#0B1A30] border border-emerald-500/35 rounded-3xl p-8 space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white">Hak Suara Sudah Digunakan</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pemilih atas nama <strong>{currentVoter.fullName}</strong> ({currentVoter.className}) telah tercatat menggunakan hak suara.
            </p>
          </div>
          {currentVoter.receiptCode && (
            <div className="bg-[#071324] border border-slate-800 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Kode Verifikasi Anda:</p>
              <p className="text-xl font-mono font-black text-amber-400">{currentVoter.receiptCode}</p>
            </div>
          )}
          <button
            onClick={() => onNavigate('results')}
            className="w-full min-h-[48px] py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-colors"
          >
            Lihat Rekapitulasi Suara
          </button>
        </div>
      </div>
    );
  }

  if (settings?.status && settings.status !== 'ongoing') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
        <div className="bg-[#0B1A30] border border-amber-500/35 rounded-3xl p-8 space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/35">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-white">
              {settings.status === 'upcoming' ? 'Bilik Suara Belum Dibuka' : 'Pemungutan Suara Telah Ditutup'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {settings.status === 'upcoming'
                ? 'Akun Anda valid, namun bilik suara saat ini masih dalam status persiapan oleh panitia.'
                : 'Sesi pemungutan suara telah berakhir. Anda dapat memantau rekapitulasi hasil suara.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => onNavigate('landing')}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-[#071324] hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 cursor-pointer"
            >
              Kembali ke Beranda
            </button>
            <button
              onClick={() => onNavigate('results')}
              className="flex-1 min-h-[44px] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Lihat Hasil Suara
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-[#0B1A30] border border-slate-800/90 rounded-3xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            Bilik Suara Digital · {settings?.schoolName || 'OSIS'}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Pilih Calon Ketua OSIS Anda</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Pemilih: <strong className="text-slate-200">{currentVoter.fullName}</strong> ({currentVoter.className})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#071324] px-3.5 py-2 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Pilihan Anda Anonim &amp; Terenkripsi</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {candidates.map((cand) => {
          const isSelected = selectedCandidateId === cand.id;
          return (
            <div
              key={cand.id}
              onClick={() => setSelectedCandidateId(cand.id)}
              className={`rounded-3xl border-2 transition-all p-6 cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-400 shadow-xl shadow-amber-500/10'
                  : 'bg-[#0B1A30] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                <div className="relative h-60 rounded-2xl overflow-hidden border border-slate-800 bg-[#071324]">
                  <CandidatePortrait src={cand.photoUrl} alt={cand.chairmanName} />
                  <div className="absolute top-3 left-3 bg-[#081525]/90 backdrop-blur-sm border border-amber-500/40 text-amber-300 font-bold text-sm px-3 py-1 rounded-xl tabular-nums">
                    No. 0{cand.candidateNumber}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-white">{cand.chairmanName}</h3>
                  <p className="text-xs text-slate-400 font-semibold">Kelas {cand.chairmanClass}</p>
                  <p className="font-serif italic text-xs sm:text-sm text-amber-300/90 mt-1">"{cand.tagline}"</p>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-bold text-slate-400 uppercase text-[10px]">Visi:</p>
                  <p className="line-clamp-2 leading-relaxed">{cand.vision}</p>
                </div>
              </div>

              <button
                type="button"
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-[#071324] text-slate-300 border border-slate-700'
                }`}
              >
                {isSelected ? '✓ Calon Ini Dipilih' : 'Pilih Calon Ini'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleConfirmVote}
          disabled={!selectedCandidateId || isSubmitting}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          {isSubmitting ? 'Memproses Surat Suara...' : 'Konfirmasi & Masukkan Surat Suara'}
        </button>
      </div>
    </div>
  );
};
