import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { electionStore } from '../services/store';

interface AdminLoginViewProps {
  onLoginSuccess: () => void;
  onNavigate: (view: string) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess, onNavigate }) => {
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [needsFirstSetup, setNeedsFirstSetup] = useState(false);

  // Standard login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First-run Super Admin claim states (only shown when zero admins exist)
  const [setupFullName, setSetupFullName] = useState('');
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      setIsCheckingStatus(true);
      try {
        const res = await electionStore.hasAnyAdmin();
        if (active) {
          setNeedsFirstSetup(!res.hasAdmin);
        }
      } catch {
        if (active) {
          setNeedsFirstSetup(false);
        }
      } finally {
        if (active) {
          setIsCheckingStatus(false);
        }
      }
    };
    checkStatus();
    return () => {
      active = false;
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Silakan lengkapi username dan kata sandi Anda.');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const result = await electionStore.verifyAdmin(username, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Username atau kata sandi tidak cocok. Gunakan akun yang aktif pada Dashboard Admin.');
      }
    } catch {
      setError('Terjadi kendala saat memeriksa kredensial. Silakan periksa koneksi dan coba kembali.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupFullName.trim() || !setupUsername.trim() || !setupPassword.trim()) {
      setError('Silakan lengkapi seluruh kolom aktivasi Super Admin.');
      return;
    }
    if (setupPassword.trim().length < 6) {
      setError('Kata sandi minimal harus 6 karakter.');
      return;
    }
    if (setupPassword.trim() !== setupConfirmPassword.trim()) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      const result = await electionStore.bootstrapFirstAdmin(
        setupFullName,
        setupUsername,
        setupPassword
      );
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Gagal mengaktifkan akun Super Admin.');
        const status = await electionStore.hasAnyAdmin();
        if (status.hasAdmin) {
          setNeedsFirstSetup(false);
        }
      }
    } catch {
      setError('Terjadi kendala saat menyimpan akun Super Admin ke database. Silakan coba kembali.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-16 space-y-6">
      <div className="bg-[#0B1A30] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 mx-auto shadow-xl shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#081525] rounded-[14px] flex items-center justify-center">
              {needsFirstSetup ? (
                <UserPlus className="w-8 h-8 text-amber-400" />
              ) : (
                <Shield className="w-8 h-8 text-amber-400" />
              )}
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">
            {needsFirstSetup ? 'Aktivasi Super Admin Pertama' : 'Portal Administrator OSIS'}
          </h2>
          <p className="text-xs text-slate-400">
            {needsFirstSetup
              ? 'Buat akun Super Admin resmi untuk mengunci akses Dashboard Admin.'
              : 'Khusus Panitia Pemilihan Organisasi (PPO) dan Pembina OSIS'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {isCheckingStatus ? (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
            <p className="text-xs font-medium">Memeriksa status keamanan portal...</p>
          </div>
        ) : needsFirstSetup ? (
          <form onSubmit={handleBootstrapSubmit} className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Belum ada akun administrator di database. Akun default/uji coba telah dinonaktifkan—buat kredensial khusus sekolah Anda sekarang.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nama Lengkap Pengelola
              </label>
              <input
                type="text"
                placeholder="Contoh: Pembina OSIS / Ketua Panitia"
                value={setupFullName}
                onChange={(e) => setSetupFullName(e.target.value)}
                disabled={isVerifying}
                className="w-full bg-[#071324] border border-slate-700 focus:border-amber-400 text-white text-sm rounded-xl px-4 py-3 outline-none transition-colors disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Username Super Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pilih username unik (min. 3 karakter)"
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-[#071324] border border-slate-700 focus:border-amber-400 text-white text-sm rounded-xl pl-10 pr-4 py-3 outline-none transition-colors disabled:opacity-50"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Kata Sandi (Min. 6 Karakter)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  placeholder="Buat kata sandi yang kuat"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-[#071324] border border-slate-700 focus:border-amber-400 text-white text-sm rounded-xl pl-10 pr-11 py-3 outline-none transition-colors disabled:opacity-50 font-mono"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSetupPassword(!showSetupPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                >
                  {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi"
                  value={setupConfirmPassword}
                  onChange={(e) => setSetupConfirmPassword(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-[#071324] border border-slate-700 focus:border-amber-400 text-white text-sm rounded-xl pl-10 pr-4 py-3 outline-none transition-colors disabled:opacity-50 font-mono"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Mengaktifkan Super Admin...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Aktifkan &amp; Masuk Dashboard</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Username Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-[#071324] border border-slate-700 focus:border-amber-400 text-white text-sm rounded-xl pl-10 pr-4 py-3 outline-none transition-colors disabled:opacity-50"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Kata Sandi Admin
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isVerifying}
                  className="w-full bg-[#071324] border border-slate-700 focus:border-amber-400 text-white text-sm rounded-xl pl-10 pr-11 py-3 outline-none transition-colors disabled:opacity-50 font-mono"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Masuk Dashboard Admin</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="border-t border-slate-800 pt-3 text-center">
          <button
            onClick={() => onNavigate('landing')}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Kembali ke Halaman Utama Pemilih
          </button>
        </div>
      </div>

      <div className="bg-[#071324]/80 border border-slate-800/80 rounded-2xl p-4 text-xs text-center space-y-1 text-slate-400">
        <p className="font-semibold text-slate-300">
          Keamanan Kredensial Resmi Administrator
        </p>
        <p className="text-[11px] text-slate-500">
          Akun bawaan uji coba telah dihapus permanen. Autentikasi diverifikasi langsung dengan akun aktif pada menu <strong>Kelola Admin</strong>.
        </p>
      </div>
    </div>
  );
};
