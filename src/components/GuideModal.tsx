import React from 'react';
import { X, CheckCircle, ShieldCheck, Key, Vote } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Dapatkan Kredensial Resmi',
      desc: 'Pastikan Anda telah menerima NISN dan 6 digit Kode Akses / PIN resmi dari panitia TPS kelas masing-masing.',
      icon: Key,
    },
    {
      num: 2,
      title: 'Masuk Bilik Suara Digital',
      desc: 'Klik tombol "Login Pemilih", masukkan NISN dan Kode Akses Anda untuk verifikasi identitas di DPT.',
      icon: ShieldCheck,
    },
    {
      num: 3,
      title: 'Tentukan Pilihan Anda',
      desc: 'Pelajari visi, misi, dan program kerja masing-masing calon. Pilih nomor urut 1 atau 2 sesuai nurani.',
      icon: Vote,
    },
    {
      num: 4,
      title: 'Simpan Bukti Surat Suara',
      desc: 'Setelah konfirmasi, sistem menerbitkan Kode Verifikasi Unik sebagai tanda hak suara Anda telah sah digunakan.',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0B1A30] border border-amber-500/40 rounded-3xl p-6 text-white space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>Panduan Singkat Pemilihan</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div key={st.num} className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#071324] border border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Langkah {st.num}: {st.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};
