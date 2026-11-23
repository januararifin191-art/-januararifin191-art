import React, { useState } from 'react';
import { Vote, Key, User, AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { electionStore } from '../services/store';
import { Voter } from '../types';

interface VoterLoginViewProps {
  onLoginSuccess: (voter: Voter) => void;
  onNavigate: (view: string) => void;
}

export const VoterLoginView: React.FC<VoterLoginViewProps> = ({ onLoginSuccess, onNavigate }) => {
  const [nisn, setNisn] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!nisn.trim() || !passcode.trim()) {
      setError('Silakan isi Username / NISN dan Kode Akses Anda.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await electionStore.verifyVoter(nisn, passcode);
      if (res.success && res.voter) {
        onLoginSuccess(res.voter);
      } else {
        setError(res.error || 'Username / NISN atau Kode Akses tidak valid. Hubungi panitia kelas.');
      }
    } catch {
      setError('Terjadi kendala jaringan saat verifikasi. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-14 space-y-6">
      <div className="bg-[#0B1A30] border border-slate-800/90 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <Vote className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Login Pemilih</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Masukkan Username / NISN terdaftar di DPT dan Kode Akses dari panitia TPS
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="voter-username-input"
              className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider"
            >
              Username / NISN Pemilih
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="voter-username-input"
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                enterKeyHint="next"
                placeholder="Masukkan Username atau NISN"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                disabled={isLoading}
                className="w-full min-h-[48px] bg-[#071324] border border-slate-700 rounded-xl pl-10 pr-3.5 py-3 text-base text-white font-mono outline-none focus:border-amber-400 disabled:opacity-60"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="voter-passcode-input"
              className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider"
            >
              Kode Akses / PIN Bilik Suara
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="voter-passcode-input"
                type={showPasscode ? 'text' : 'password'}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="Masukkan Kode Akses / PIN"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isLoading}
                className="w-full min-h-[48px] bg-[#071324] border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-base text-white font-mono outline-none focus:border-amber-400 disabled:opacity-60"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label={showPasscode ? 'Sembunyikan kode akses' : 'Tampilkan kode akses'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi Data DPT...</span>
              </>
            ) : (
              <span>Masuk ke Bilik Suara</span>
            )}
          </button>
        </form>

        <div className="border-t border-slate-800 pt-3 text-center">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="min-h-[40px] text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Depan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
