import React from 'react';
import { Mail, Phone, User, MessageCircle } from 'lucide-react';
import { ElectionSettings } from '../types';

interface ContactSectionProps {
  settings: ElectionSettings | null;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ settings }) => {
  return (
    <div className="bg-[#0B1A30] border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-black text-white">Pusat Layanan &amp; Pengaduan Panitia</h3>
        <p className="text-xs text-slate-400">
          Ada kendala teknis atau pertanyaan mengenai DPT? Hubungi kontak resmi panitia:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div className="p-4 rounded-2xl bg-[#071324] border border-slate-800 text-center space-y-1">
          <Mail className="w-5 h-5 text-sky-400 mx-auto" />
          <p className="text-[10px] uppercase font-bold text-slate-400">Email Resmi</p>
          <p className="text-xs text-white font-medium truncate">{settings?.contactEmail || 'panitia@sch.id'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#071324] border border-slate-800 text-center space-y-1">
          <Phone className="w-5 h-5 text-emerald-400 mx-auto" />
          <p className="text-[10px] uppercase font-bold text-slate-400">WhatsApp TPS</p>
          <p className="text-xs text-white font-medium truncate">{settings?.contactPhone || '+62 821-2345-6789'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#071324] border border-slate-800 text-center space-y-1">
          <User className="w-5 h-5 text-amber-400 mx-auto" />
          <p className="text-[10px] uppercase font-bold text-slate-400">Penanggung Jawab</p>
          <p className="text-xs text-white font-medium truncate">{settings?.contactPerson || 'Pembina OSIS'}</p>
        </div>
      </div>
    </div>
  );
};
