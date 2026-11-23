export type DelimiterType = 'auto' | 'tab' | 'semicolon' | 'comma';

export interface ParsedVoterItem {
  nisn: string;
  fullName: string;
  className: string;
  gender: 'L' | 'P';
  passcode: string;
  isValid: boolean;
  error?: string;
  rawLine?: string;
  lineNumber?: number;
}

export function normalizeDptIdentifier(raw: string): string {
  return (raw || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim();
}

export function parseAllVoterLines(
  rawText: string,
  delimiter: DelimiterType = 'auto',
  defaultClass: string = 'X A 1'
): ParsedVoterItem[] {
  if (!rawText || !rawText.trim()) return [];

  const cleanText = rawText.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedVoterItem[] = [];

  lines.forEach((line, index) => {
    let parts: string[] = [];

    if (delimiter === 'tab' || (delimiter === 'auto' && line.includes('\t'))) {
      parts = line.split('\t').map((p) => normalizeDptIdentifier(p));
    } else if (delimiter === 'semicolon' || (delimiter === 'auto' && line.includes(';'))) {
      parts = line.split(';').map((p) => normalizeDptIdentifier(p));
    } else {
      const matches: string[] = [];
      let current = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          matches.push(normalizeDptIdentifier(current));
          current = '';
        } else {
          current += c;
        }
      }
      matches.push(normalizeDptIdentifier(current));
      parts = matches;
    }

    if (parts.length >= 2) {
      const firstColLower = parts[0].toLowerCase();
      const secondColLower = parts[1].toLowerCase();
      if (
        index === 0 &&
        (firstColLower === 'nisn' ||
          firstColLower === 'username' ||
          firstColLower === 'id' ||
          firstColLower === 'nip') &&
        (secondColLower.includes('nama') || secondColLower.includes('name'))
      ) {
        return;
      }

      const cleanUsername = normalizeDptIdentifier(parts[0]);
      const fullName = normalizeDptIdentifier(parts[1] || '');
      const className = parts[2]
        ? normalizeDptIdentifier(parts[2]).replace(/\bMIPA\b/g, 'A').replace(/\bIPS\b/g, 'B')
        : defaultClass || 'X A 1';
      const genderRaw = parts[3]?.toUpperCase();
      const gender: 'L' | 'P' = genderRaw === 'P' || genderRaw === 'PEREMPUAN' ? 'P' : 'L';
      const rawPass = normalizeDptIdentifier(parts[4] || '');
      const passcode = rawPass || Math.floor(100000 + Math.random() * 900000).toString();

      const isValid = cleanUsername.length >= 2 && fullName.length > 0;
      results.push({
        nisn: cleanUsername,
        fullName,
        className,
        gender,
        passcode,
        isValid,
        error: isValid ? undefined : 'Username/NISN atau Nama tidak valid',
        rawLine: line,
        lineNumber: index + 1,
      });
    }
  });

  return results;
}
