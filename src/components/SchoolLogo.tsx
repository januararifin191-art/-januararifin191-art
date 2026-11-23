import React, { useState, useEffect } from 'react';
import { Vote } from 'lucide-react';

interface SchoolLogoProps {
  src?: string | null;
  alt?: string;
  sizeClass?: string;
  iconClass?: string;
  roundedClass?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  src,
  alt = 'Logo Sekolah',
  sizeClass = 'w-10 h-10',
  iconClass = 'w-5 h-5 text-amber-400',
  roundedClass = 'rounded-xl',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = (src || '').trim();

  if (cleanSrc && !hasError) {
    return (
      <div
        className={`${sizeClass} ${roundedClass} bg-[#071324] border border-amber-500/35 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm`}
      >
        <img
          key={cleanSrc}
          src={cleanSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-gradient-to-br from-[#0F2744] to-[#071324] border border-amber-500/35 flex items-center justify-center shrink-0 shadow-sm`}
    >
      <Vote className={iconClass} />
    </div>
  );
};
