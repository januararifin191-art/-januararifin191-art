import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Bagaimana jika kode akses saya hilang atau lupa?',
      a: 'Segera temui Panitia Pemilihan Organisasi (PPO) atau wali kelas di TPS terdekat. Panitia dapat memeriksa identitas Anda dan menerbitkan kode akses baru melalui dashboard admin.',
    },
    {
      q: 'Apakah pilihan suara saya dapat diketahui oleh guru atau panitia?',
      a: 'Sama sekali tidak. Surat suara diproses secara anonim dengan hashing satu arah. Sistem hanya mencatat bahwa NISN Anda telah menggunakan hak pilih, tanpa menghubungkan identitas Anda dengan nomor calon yang dipilih (prinsip Rahasia).',
    },
    {
      q: 'Dapatkah saya mengganti pilihan setelah menekan tombol konfirmasi?',
      a: 'Tidak bisa. Setiap pemilih hanya memiliki 1 (satu) kesempatan memberikan suara sah demi menjamin kejujuran dan keabsahan hasil pemilihan.',
    },
    {
      q: 'Kapan hasil perolehan suara dapat dilihat?',
      a: 'Rekapitulasi resmi akan dipublikasikan secara langsung setelah jam pemungutan suara resmi ditutup oleh panitia.',
    },
  ];

  return (
    <section className="space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <span>Pertanyaan Umum (FAQ)</span>
        </h2>
        <p className="text-xs text-slate-400">Informasi seputar teknis dan keabsahan sistem e-voting</p>
      </div>

      <div className="space-y-2.5 max-w-3xl mx-auto">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-[#0B1A30] border border-slate-800 overflow-hidden transition-all"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full text-left p-4 flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-white hover:text-amber-400"
            >
              <span>{faq.q}</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  openIdx === idx ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>
            {openIdx === idx && (
              <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
