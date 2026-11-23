import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://swxnpzppeuvnlzupixwd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_Py_kcGTyltYxwxrCdmSLeg_zSxMYF_e';

function cleanEnvValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const localUrl = typeof window !== 'undefined' ? cleanEnvValue(localStorage.getItem('osis_custom_supabase_url')) : '';
  const localKey = typeof window !== 'undefined' ? cleanEnvValue(localStorage.getItem('osis_custom_supabase_anon_key')) : '';

  if (typeof window !== 'undefined' && localUrl && localUrl.includes('egdmzrjeenpfzdlxpowe')) {
    localStorage.removeItem('osis_custom_supabase_url');
    localStorage.removeItem('osis_custom_supabase_anon_key');
  }

  const envUrl = cleanEnvValue(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '');
  const envKey = cleanEnvValue(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : '');

  const resolvedUrl = (localUrl && !localUrl.includes('egdmzrjeenpfzdlxpowe') ? localUrl : '') || envUrl || DEFAULT_SUPABASE_URL;
  const resolvedKey = (localKey && !localKey.includes('egdmzrjeenpfzdlxpowe') ? localKey : '') || envKey || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: resolvedUrl,
    anonKey: resolvedKey,
  };
}

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: 'no-store',
  });

const currentConfig = getSupabaseConfig();
export let supabase = createClient(currentConfig.url, currentConfig.anonKey, {
  global: { fetch: noStoreFetch },
});

export function updateSupabaseConfig(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('osis_custom_supabase_url', url.trim());
    localStorage.setItem('osis_custom_supabase_anon_key', anonKey.trim());
  }
  supabase = createClient(url.trim(), anonKey.trim(), {
    global: { fetch: noStoreFetch },
  });
}

export async function checkSupabaseConnection(): Promise<{ ok: boolean; message: string; tablesExist?: boolean }> {
  try {
    const [candCheck, adminCheck] = await Promise.all([
      supabase.from('candidates').select('id').limit(1),
      supabase.from('admin_users').select('id').limit(1),
    ]);

    const error = candCheck.error || adminCheck.error;
    if (!error) {
      let hostLabel = 'Supabase';
      try {
        hostLabel = new URL(getSupabaseConfig().url).host;
      } catch {
        // Keep fallback label
      }
      return { ok: true, message: `Terhubung ke Supabase (${hostLabel}) & seluruh tabel siap digunakan.`, tablesExist: true };
    }
    if (error.code === '42P01' || error.code === 'PGRST205' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
      return {
        ok: true,
        message: 'Koneksi ke Supabase berhasil! Namun tabel database belum dibuat. Silakan jalankan script SQL skema di Supabase SQL Editor.',
        tablesExist: false
      };
    }
    return { ok: false, message: `Koneksi Supabase error (${error.code || 'UNKNOWN'}): ${error.message}`, tablesExist: false };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Koneksi ke Supabase gagal';
    return { ok: false, message, tablesExist: false };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- SKEMA DATABASE E-VOTING RESMI (SESUAI STRUKTUR LIVE SUPABASE)
CREATE TABLE IF NOT EXISTS public.elections (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    school_name TEXT NOT NULL,
    school_address TEXT,
    school_logo TEXT,
    status TEXT NOT NULL DEFAULT 'ongoing',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_results_published BOOLEAN DEFAULT false,
    allow_realtime_before_end BOOLEAN DEFAULT false,
    tagline TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_person TEXT
);

CREATE TABLE IF NOT EXISTS public.candidates (
    id TEXT PRIMARY KEY,
    candidate_number INT NOT NULL,
    chairman_name TEXT NOT NULL,
    vice_chairman_name TEXT NOT NULL,
    chairman_class TEXT,
    vice_chairman_class TEXT,
    photo_url TEXT,
    chairman_photo_url TEXT,
    vice_chairman_photo_url TEXT,
    tagline TEXT,
    vision TEXT NOT NULL,
    missions JSONB DEFAULT '[]'::jsonb,
    work_programs JSONB DEFAULT '[]'::jsonb,
    color_theme TEXT DEFAULT '#1E3E62'
);

CREATE TABLE IF NOT EXISTS public.voters (
    id TEXT PRIMARY KEY,
    nisn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    gender TEXT DEFAULT 'L',
    passcode TEXT NOT NULL,
    has_voted BOOLEAN DEFAULT false,
    voted_at TIMESTAMPTZ,
    receipt_code TEXT,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.votes (
    id TEXT PRIMARY KEY,
    election_id TEXT NOT NULL DEFAULT 'election-2026-2027',
    candidate_id TEXT NOT NULL,
    verification_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT,
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_logs (
    id TEXT PRIMARY KEY,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'panitia',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select elections" ON public.elections FOR SELECT USING (true);
CREATE POLICY "Allow manage elections" ON public.elections FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Allow manage candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select voters" ON public.voters FOR SELECT USING (true);
CREATE POLICY "Allow manage and update voters" ON public.voters FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select votes summary" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Allow insert votes" ON public.votes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow manage announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow insert admin_logs" ON public.admin_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select admin_logs" ON public.admin_logs FOR SELECT USING (true);

CREATE POLICY "Allow select and manage admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);

-- Pastikan kolom election_id pada tabel votes memiliki default agar semua klien tetap aman:
ALTER TABLE public.votes ALTER COLUMN election_id SET DEFAULT 'election-2026-2027';

-- Aktifkan Realtime agar perubahan data & hasil suara tersinkron langsung di seluruh perangkat:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.votes, public.voters, public.elections, public.candidates;
`;
