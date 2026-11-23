import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

interface CandidatePortraitProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
}

export const CandidatePortrait: React.FC<CandidatePortraitProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover object-top',
  iconClassName = 'w-12 h-12 text-amber-400/60',
  showLabel = true,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const cleanSrc = (src || '').trim();

  if (!cleanSrc || failed) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#0F2744] via-[#0B1A30] to-[#071324] flex flex-col items-center justify-center text-slate-500 gap-2 p-2 text-center">
        <User className={iconClassName} />
        {showLabel && (
          <span className="text-xs font-medium text-slate-400 line-clamp-1">{alt}</span>
        )}
      </div>
    );
  }

  return (
    <img
      key={cleanSrc}
      src={cleanSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
