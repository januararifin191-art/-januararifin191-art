export async function compressImageFile(file: File, maxDimension = 360): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan gambar yang valid (gunakan PNG, JPG, WebP, atau SVG).');
  }

  // Keep small SVGs directly as Data URL
  if (file.type === 'image/svg+xml') {
    if (file.size > 250 * 1024) {
      throw new Error('Ukuran file SVG terlalu besar (maksimal 250 KB).');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Gagal membaca file SVG.'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Dimensi gambar tidak valid.'));
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Browser tidak mendukung pemrosesan gambar.'));
          return;
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const preserveTransparency = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
        let dataUrl = preserveTransparency
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.86);

        // If transparent PNG is still quite large, fallback to WebP to keep payload lightweight for Supabase & localStorage
        if (dataUrl.length > 180000 && preserveTransparency) {
          const webpUrl = canvas.toDataURL('image/webp', 0.85);
          if (webpUrl.startsWith('data:image/webp') && webpUrl.length < dataUrl.length) {
            dataUrl = webpUrl;
          }
        }

        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err instanceof Error ? err : new Error('Gagal memproses gambar.'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('File gambar tidak dapat dimuat atau format rusak.'));
    };

    img.src = objectUrl;
  });
}

export const PRESET_SCHOOL_LOGOS = {
  osisCrest:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='g1' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23fbbf24'/><stop offset='100%25' stop-color='%23b45309'/></linearGradient></defs><rect width='120' height='120' rx='24' fill='%23071324'/><path d='M60 16 L96 30 V58 C96 81 79 98 60 105 C41 98 24 81 24 58 V30 Z' fill='%230B1A30' stroke='url(%23g1)' stroke-width='4'/><circle cx='60' cy='54' r='16' fill='none' stroke='%23fbbf24' stroke-width='3'/><path d='M60 32 L64 42 L74 42 L66 48 L69 58 L60 52 L51 58 L54 48 L46 42 L56 42 Z' fill='%23fbbf24'/><text x='60' y='88' text-anchor='middle' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23fde68a'>OSIS</text></svg>",
  schoolShield:
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' rx='24' fill='%23071324'/><path d='M60 16 L94 28 V57 C94 79 78 96 60 104 C42 96 26 79 26 57 V28 Z' fill='%23102644' stroke='%23f59e0b' stroke-width='4'/><path d='M42 54 L60 44 L78 54 L60 64 Z' fill='%23fbbf24'/><path d='M48 60 V72 C48 76 72 76 72 72 V60' fill='none' stroke='%23fde68a' stroke-width='3' stroke-linecap='round'/><text x='60' y='90' text-anchor='middle' font-family='sans-serif' font-size='10' font-weight='bold' fill='%23f8fafc'>E-VOTE</text></svg>",
};
