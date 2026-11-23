import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  onExpire?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  status,
  onExpire,
}) => {
  const expiredNotifiedRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: false });

  useEffect(() => {
    expiredNotifiedRef.current = false;

    const calculateTime = () => {
      const targetMs = new Date(targetDate).getTime();
      const difference = Number.isNaN(targetMs) ? 0 : targetMs - Date.now();

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true });
        if (onExpire && !expiredNotifiedRef.current) {
          expiredNotifiedRef.current = true;
          onExpire();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isFinished: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (status === 'completed' || (status === 'ongoing' && timeLeft.isFinished)) {
    return (
      <div className="inline-flex items-center gap-2.5 bg-[#071324]/90 border border-slate-700/80 px-5 py-3 rounded-2xl text-slate-200 text-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-semibold text-white">Bilik Suara Telah Ditutup</span>
        <span className="text-slate-500" aria-hidden="true">·</span>
        <span className="text-slate-400 text-xs">Pemilihan Selesai</span>
      </div>
    );
  }

  if (status === 'upcoming' && timeLeft.isFinished) {
    return (
      <div className="inline-flex items-center gap-2.5 bg-[#071324]/90 border border-amber-500/35 px-5 py-3 rounded-2xl text-amber-200 text-sm">
        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-semibold text-white">Waktu Pembukaan Telah Tiba</span>
        <span className="text-slate-500" aria-hidden="true">·</span>
        <span className="text-amber-300/90 text-xs">Menunggu Pembukaan Bilik</span>
      </div>
    );
  }

  const segments = [
    { label: 'Hari', value: timeLeft.days, highlight: false },
    { label: 'Jam', value: timeLeft.hours, highlight: false },
    { label: 'Menit', value: timeLeft.minutes, highlight: false },
    { label: 'Detik', value: timeLeft.seconds, highlight: true },
  ];

  return (
    <div className="inline-flex flex-col items-center gap-3 bg-[#071324]/85 backdrop-blur-md border border-amber-500/25 rounded-2xl px-4 py-4 sm:px-6 sm:py-4 shadow-lg">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-300/90">
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          {status === 'upcoming'
            ? 'Menuju Pembukaan Pemungutan Suara'
            : 'Sisa Waktu Pemungutan Suara'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full sm:w-auto">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="flex flex-col items-center justify-center bg-[#0B1A30] border border-slate-800 rounded-xl px-3 py-2 min-w-[60px] sm:min-w-[72px]"
          >
            <span
              className={`text-xl sm:text-2xl font-bold font-mono tabular-nums leading-none ${
                seg.highlight ? 'text-amber-400' : 'text-white'
              }`}
            >
              {String(seg.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium mt-1.5">
              {seg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
