import { supabase, checkSupabaseConnection } from '../lib/supabase';
import { Candidate, Voter, VoteRecord, ElectionSettings, Announcement, AdminLog, AdminUser } from '../types';
import { INITIAL_SETTINGS, INITIAL_CANDIDATES, INITIAL_VOTERS, INITIAL_ANNOUNCEMENTS, INITIAL_ADMIN_LOGS, INITIAL_ADMINS } from './seedData';

const STORAGE_KEYS = {
  SETTINGS: 'osis_vote_settings_v1',
  CANDIDATES: 'osis_vote_candidates_v1',
  VOTERS: 'osis_vote_voters_v1',
  VOTES: 'osis_vote_votes_v1',
  ANNOUNCEMENTS: 'osis_vote_announcements_v1',
  LOGS: 'osis_vote_logs_v1',
  ADMINS: 'osis_vote_admins_v1',
  CURRENT_VOTER: 'osis_vote_session_voter',
  ADMIN_SESSION: 'osis_vote_session_admin',
};

function safeSetLocalStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(value);
  try {
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.warn(`LocalStorage write failed for ${key}:`, e);
  }
  if (key === STORAGE_KEYS.CURRENT_VOTER || key === STORAGE_KEYS.ADMIN_SESSION) {
    try {
      sessionStorage.setItem(key, serialized);
    } catch {
      // Ignore strict mobile WebView sessionStorage restrictions
    }
  }
}

function safeGetLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Fallback to sessionStorage below
  }
  if (key === STORAGE_KEYS.CURRENT_VOTER || key === STORAGE_KEYS.ADMIN_SESSION) {
    try {
      const sessionRaw = sessionStorage.getItem(key);
      if (sessionRaw) return JSON.parse(sessionRaw) as T;
    } catch {
      // Ignore
    }
  }
  return fallback;
}

function normalizeDptText(val: string): string {
  return (val || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function escapeSupabaseLike(val: string): string {
  return val.replace(/[\\%_]/g, '\\$&');
}

function generateVoterId(): string {
  return 'voter-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

function mapSupabaseVoter(v: any): Voter {
  return {
    id: v.id,
    nisn: v.nisn,
    fullName: v.full_name,
    className: v.class_name,
    gender: v.gender === 'P' ? 'P' : 'L',
    passcode: v.passcode,
    hasVoted: !!v.has_voted,
    votedAt: v.voted_at || null,
    receiptCode: v.receipt_code || undefined,
    status: v.status === 'suspended' ? 'suspended' : 'active',
  };
}

function parseJsonArray<T>(val: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return val.split('\n').filter(Boolean) as unknown as T[];
    }
  }
  return fallback;
}

const LEGACY_DEFAULT_ADMIN_IDS = new Set(['adm-01', 'adm-02', 'adm-03']);
const LEGACY_DEFAULT_USERNAMES = new Set(['admin', 'panitia', 'pembina']);

function isLegacyUncustomizedDefaultAdmin(adm: AdminUser): boolean {
  return (
    LEGACY_DEFAULT_ADMIN_IDS.has(adm.id) &&
    LEGACY_DEFAULT_USERNAMES.has((adm.username || '').toLowerCase()) &&
    !(adm.password || '').startsWith('pbkdf2$')
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function derivePbkdf2Hex(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(derived));
}

async function hashPassword(plain: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return plain;
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await derivePbkdf2Hex(plain, salt);
  return `pbkdf2$${toHex(salt)}$${hashHex}`;
}

async function verifyPassword(plain: string, stored?: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, saltHex, expectedHex] = parts;
    if (!saltHex || !expectedHex || typeof window === 'undefined' || !window.crypto?.subtle) {
      return false;
    }
    const candidateHex = await derivePbkdf2Hex(plain, fromHex(saltHex));
    if (candidateHex.length !== expectedHex.length) return false;
    let diff = 0;
    for (let i = 0; i < candidateHex.length; i++) {
      diff |= candidateHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
    }
    return diff === 0;
  }
  return stored.trim() === plain;
}

class ElectionStore {
  private useSupabase: boolean = false;
  private isSupabaseChecked: boolean = false;
  private memoryCurrentVoter: Voter | null = null;
  private memoryAdminSession: AdminUser | null = null;

  constructor() {
    this.initLocalStorageFallback();
  }

  private initLocalStorageFallback() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      safeSetLocalStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    } else {
      const existingSettings = safeGetLocalStorage<ElectionSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
      const normalizedTitle = (existingSettings.title || '').replace(/\s*&\s*WAKIL\s+KETUA\s+OSIS/i, ' KETUA OSIS').replace(/KETUA\s+KETUA/i, 'KETUA').trim();
      if (normalizedTitle !== existingSettings.title) {
        safeSetLocalStorage(STORAGE_KEYS.SETTINGS, { ...existingSettings, title: normalizedTitle || 'PEMILIHAN KETUA OSIS' });
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.CANDIDATES)) {
      safeSetLocalStorage(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.VOTERS)) {
      safeSetLocalStorage(STORAGE_KEYS.VOTERS, []);
    } else {
      const existingVoters = safeGetLocalStorage<Voter[]>(STORAGE_KEYS.VOTERS, []);
      const defaultTrialVoterIds = new Set(['voter-001', 'voter-002', 'voter-003', 'voter-004', 'voter-005', 'voter-006']);
      const defaultTrialNisns = new Set(['0071234501', '0071234502', '0071234503', '0071234504', '0071234505', '0071234506']);
      const filteredVoters = existingVoters.filter(
        (v) => !(defaultTrialVoterIds.has(v.id) && defaultTrialNisns.has(v.nisn))
      );
      if (filteredVoters.length !== existingVoters.length) {
        safeSetLocalStorage(STORAGE_KEYS.VOTERS, filteredVoters);
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.VOTES)) {
      safeSetLocalStorage(STORAGE_KEYS.VOTES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS)) {
      safeSetLocalStorage(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      safeSetLocalStorage(STORAGE_KEYS.LOGS, INITIAL_ADMIN_LOGS);
    }

    if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) {
      safeSetLocalStorage(STORAGE_KEYS.ADMINS, []);
    } else {
      const existingAdmins = safeGetLocalStorage<AdminUser[]>(STORAGE_KEYS.ADMINS, []);
      const cleanedAdmins = existingAdmins.filter((a) => !isLegacyUncustomizedDefaultAdmin(a));
      if (cleanedAdmins.length !== existingAdmins.length) {
        safeSetLocalStorage(STORAGE_KEYS.ADMINS, cleanedAdmins);
      }
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.isSupabaseChecked) {
      await this.checkConnection();
    }
    return this.useSupabase;
  }

  public async checkConnection() {
    const res = await checkSupabaseConnection();
    this.isSupabaseChecked = true;
    this.useSupabase = !!res.tablesExist;
    return res;
  }

  // --- SETTINGS (elections table) ---
  public async getSettings(): Promise<ElectionSettings> {
    if (await this.ensureConnection()) {
      try {
        const { data, error } = await supabase.from('elections').select('*').limit(1).maybeSingle();
        if (!error && data) {
          const cleanTitle = (data.title || 'PEMILIHAN KETUA OSIS')
            .replace(/\s*&\s*WAKIL\s+KETUA\s+OSIS/i, ' KETUA OSIS')
            .replace(/KETUA\s+KETUA/i, 'KETUA')
            .trim();
          const mapped: ElectionSettings = {
            id: data.id,
            title: cleanTitle || 'PEMILIHAN KETUA OSIS',
            academicYear: data.academic_year || '2026/2027',
            schoolName: data.school_name || 'SMA NEGERI 1 RAHAYU',
            schoolAddress: data.school_address || '',
            schoolLogo: data.school_logo || '',
            status: (data.status as ElectionSettings['status']) || 'ongoing',
            startTime: data.start_time || new Date().toISOString(),
            endTime: data.end_time || new Date(Date.now() + 86400000).toISOString(),
            isResultsPublished: !!data.is_results_published,
            allowRealtimeBeforeEnd: !!data.allow_realtime_before_end,
            tagline: data.tagline || '',
            contactEmail: data.contact_email || '',
            contactPhone: data.contact_phone || '',
            contactPerson: data.contact_person || '',
          };
          safeSetLocalStorage(STORAGE_KEYS.SETTINGS, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getSettings error:', e);
      }
    }
    const localSettings = safeGetLocalStorage<ElectionSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const cleanLocalTitle = (localSettings.title || 'PEMILIHAN KETUA OSIS')
      .replace(/\s*&\s*WAKIL\s+KETUA\s+OSIS/i, ' KETUA OSIS')
      .replace(/KETUA\s+KETUA/i, 'KETUA')
      .trim();
    return { ...localSettings, title: cleanLocalTitle || 'PEMILIHAN KETUA OSIS' };
  }

  public async updateSettings(partial: Partial<ElectionSettings>, adminName = 'Super Admin'): Promise<ElectionSettings> {
    const current = await this.getSettings();
    const updated: ElectionSettings = { ...current, ...partial };
    safeSetLocalStorage(STORAGE_KEYS.SETTINGS, updated);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('elections').upsert({
          id: updated.id,
          title: updated.title,
          academic_year: updated.academicYear,
          school_name: updated.schoolName,
          school_address: updated.schoolAddress || '',
          school_logo: updated.schoolLogo || '',
          status: updated.status,
          start_time: updated.startTime,
          end_time: updated.endTime,
          is_results_published: !!updated.isResultsPublished,
          allow_realtime_before_end: !!updated.allowRealtimeBeforeEnd,
          tagline: updated.tagline || '',
          contact_email: updated.contactEmail || '',
          contact_phone: updated.contactPhone || '',
          contact_person: updated.contactPerson || '',
        });
        if (error) console.warn('Supabase updateSettings error:', error.message);
      } catch (e) {
        console.warn('Supabase updateSettings exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Pembaruan Pengaturan', `Status: ${updated.status}`);
    return updated;
  }

  // --- CANDIDATES (candidates table) ---
  public async getCandidates(): Promise<Candidate[]> {
    if (await this.ensureConnection()) {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('candidate_number', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped: Candidate[] = data.map((d: any) => ({
            id: d.id,
            candidateNumber: d.candidate_number,
            chairmanName: d.chairman_name,
            viceChairmanName: d.vice_chairman_name,
            chairmanClass: d.chairman_class || '',
            viceChairmanClass: d.vice_chairman_class || '',
            photoUrl:
              d.photo_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
            chairmanPhotoUrl: d.chairman_photo_url || undefined,
            viceChairmanPhotoUrl: d.vice_chairman_photo_url || undefined,
            tagline: d.tagline || '',
            vision: d.vision || '',
            missions: parseJsonArray<string>(d.missions, []),
            workPrograms: parseJsonArray<Candidate['workPrograms'][number]>(d.work_programs, []),
            colorTheme: d.color_theme || '#1E3E62',
          }));
          safeSetLocalStorage(STORAGE_KEYS.CANDIDATES, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getCandidates error:', e);
      }
    }
    return safeGetLocalStorage<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
  }

  public async saveCandidate(cand: Candidate, adminName = 'Super Admin'): Promise<void> {
    const list = await this.getCandidates();
    const idx = list.findIndex((c) => c.id === cand.id);
    if (idx >= 0) {
      list[idx] = cand;
    } else {
      list.push(cand);
    }
    list.sort((a, b) => a.candidateNumber - b.candidateNumber);
    safeSetLocalStorage(STORAGE_KEYS.CANDIDATES, list);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('candidates').upsert({
          id: cand.id,
          candidate_number: cand.candidateNumber,
          chairman_name: cand.chairmanName,
          vice_chairman_name: cand.viceChairmanName || '',
          chairman_class: cand.chairmanClass,
          vice_chairman_class: cand.viceChairmanClass || '',
          photo_url: cand.photoUrl,
          chairman_photo_url: cand.chairmanPhotoUrl || null,
          vice_chairman_photo_url: cand.viceChairmanPhotoUrl || null,
          tagline: cand.tagline || '',
          vision: cand.vision,
          missions: Array.isArray(cand.missions) ? cand.missions : [],
          work_programs: Array.isArray(cand.workPrograms) ? cand.workPrograms : [],
          color_theme: cand.colorTheme || '#1E3E62',
        });
        if (error) console.warn('Supabase saveCandidate error:', error.message);
      } catch (e) {
        console.warn('Supabase saveCandidate exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Kelola Calon', `Calon No. ${cand.candidateNumber}`);
  }

  public async deleteCandidate(id: string, adminName = 'Super Admin'): Promise<void> {
    const list = await this.getCandidates();
    const updated = list.filter((c) => c.id !== id);
    safeSetLocalStorage(STORAGE_KEYS.CANDIDATES, updated);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('candidates').delete().eq('id', id);
        if (error) console.warn('Supabase deleteCandidate error:', error.message);
      } catch (e) {
        console.warn('Supabase deleteCandidate exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Hapus Calon', `ID: ${id}`);
  }

  // --- VOTERS (voters table) ---
  public async getVoters(): Promise<Voter[]> {
    if (await this.ensureConnection()) {
      try {
        const allRows: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('voters')
            .select('*')
            .order('id', { ascending: true })
            .range(from, from + pageSize - 1);

          if (error) throw error;
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allRows.push(...data);
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              from += pageSize;
            }
          }
        }

        const mapped: Voter[] = allRows.map(mapSupabaseVoter);
        safeSetLocalStorage(STORAGE_KEYS.VOTERS, mapped);
        return mapped;
      } catch (e) {
        console.warn('Supabase getVoters error:', e);
      }
    }
    return safeGetLocalStorage<Voter[]>(STORAGE_KEYS.VOTERS, INITIAL_VOTERS);
  }

  public async saveVoter(voter: Voter, adminName = 'Super Admin'): Promise<void> {
    const cleanUsername = normalizeDptText(voter.nisn);
    const normalizedVoter: Voter = {
      ...voter,
      nisn: cleanUsername,
      fullName: normalizeDptText(voter.fullName),
      className: normalizeDptText(voter.className),
      passcode: normalizeDptText(voter.passcode),
    };

    const list = await this.getVoters();
    const idx = list.findIndex(
      (v) => v.id === normalizedVoter.id || v.nisn.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (idx >= 0) {
      list[idx] = normalizedVoter;
    } else {
      list.push(normalizedVoter);
    }
    safeSetLocalStorage(STORAGE_KEYS.VOTERS, list);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('voters').upsert({
          id: normalizedVoter.id,
          nisn: normalizedVoter.nisn,
          full_name: normalizedVoter.fullName,
          class_name: normalizedVoter.className,
          gender: normalizedVoter.gender || 'L',
          passcode: normalizedVoter.passcode,
          has_voted: !!normalizedVoter.hasVoted,
          voted_at: normalizedVoter.votedAt || null,
          receipt_code: normalizedVoter.receiptCode || null,
          status: normalizedVoter.status || 'active',
        });
        if (error) console.warn('Supabase saveVoter error:', error.message);
      } catch (e) {
        console.warn('Supabase saveVoter exception:', e);
      }
    }
    if (adminName !== 'System') {
      await this.logAdminAction(adminName, 'Simpan DPT', `Siswa: ${normalizedVoter.fullName} (${normalizedVoter.nisn})`);
    }
  }

  public async importVotersFromCSV(
    items: { nisn: string; fullName: string; className: string; gender?: 'L' | 'P'; passcode?: string; isValid?: boolean }[],
    adminName: string = 'Super Admin',
    updateExisting: boolean = true
  ): Promise<{ addedCount: number; updatedCount: number; total: number }> {
    const current = await this.getVoters();
    const existingMap = new Map<string, number>();
    current.forEach((v, idx) => existingMap.set(normalizeDptText(v.nisn).toLowerCase(), idx));

    let addedCount = 0;
    let updatedCount = 0;
    const toUpsertToSupabase: Voter[] = [];

    for (const item of items) {
      if (item.isValid === false) continue;
      const cleanUsername = normalizeDptText(item.nisn);
      const cleanName = normalizeDptText(item.fullName);
      if (cleanUsername.length < 2 || !cleanName) continue;

      const lookupKey = cleanUsername.toLowerCase();
      const cleanPass = normalizeDptText(item.passcode || '');

      if (existingMap.has(lookupKey)) {
        if (updateExisting) {
          const idx = existingMap.get(lookupKey)!;
          current[idx] = {
            ...current[idx],
            nisn: cleanUsername,
            fullName: cleanName,
            className: normalizeDptText(item.className) || current[idx].className,
            gender: item.gender || current[idx].gender,
            passcode: cleanPass || current[idx].passcode,
          };
          updatedCount++;
          toUpsertToSupabase.push(current[idx]);
        }
      } else {
        const newVoter: Voter = {
          id: generateVoterId(),
          nisn: cleanUsername,
          fullName: cleanName,
          className: normalizeDptText(item.className) || 'X A 1',
          gender: item.gender || 'L',
          passcode: cleanPass || Math.floor(100000 + Math.random() * 900000).toString(),
          hasVoted: false,
          votedAt: null,
          status: 'active',
        };
        current.push(newVoter);
        existingMap.set(lookupKey, current.length - 1);
        addedCount++;
        toUpsertToSupabase.push(newVoter);
      }
    }

    safeSetLocalStorage(STORAGE_KEYS.VOTERS, current);

    if ((await this.ensureConnection()) && toUpsertToSupabase.length > 0) {
      try {
        const batchSize = 250;
        for (let i = 0; i < toUpsertToSupabase.length; i += batchSize) {
          const chunk = toUpsertToSupabase.slice(i, i + batchSize).map((v) => ({
            id: v.id,
            nisn: v.nisn,
            full_name: v.fullName,
            class_name: v.className,
            gender: v.gender || 'L',
            passcode: v.passcode,
            has_voted: !!v.hasVoted,
            voted_at: v.votedAt || null,
            receipt_code: v.receiptCode || null,
            status: v.status || 'active',
          }));
          const { error } = await supabase.from('voters').upsert(chunk);
          if (error) console.warn('Supabase bulk upsert chunk error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase bulk upsert exception:', e);
      }
    }

    await this.logAdminAction(
      adminName,
      'Import DPT Masal',
      `Berhasil memproses ${addedCount + updatedCount} siswa (${addedCount} baru, ${updatedCount} diperbarui)`
    );

    return { addedCount, updatedCount, total: addedCount + updatedCount };
  }

  public async deleteVoter(id: string, adminName = 'Super Admin'): Promise<void> {
    const list = await this.getVoters();
    const updated = list.filter((v) => v.id !== id);
    safeSetLocalStorage(STORAGE_KEYS.VOTERS, updated);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('voters').delete().eq('id', id);
        if (error) console.warn('Supabase deleteVoter error:', error.message);
      } catch (e) {
        console.warn('Supabase deleteVoter exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Hapus DPT Siswa', `ID: ${id}`);
  }

  public async deleteMultipleVoters(ids: string[], adminName = 'Super Admin'): Promise<void> {
    const list = await this.getVoters();
    const updated = list.filter((v) => !ids.includes(v.id));
    safeSetLocalStorage(STORAGE_KEYS.VOTERS, updated);

    if (await this.ensureConnection()) {
      try {
        const batchSize = 200;
        for (let i = 0; i < ids.length; i += batchSize) {
          const chunk = ids.slice(i, i + batchSize);
          const { error } = await supabase.from('voters').delete().in('id', chunk);
          if (error) console.warn('Supabase deleteMultipleVoters error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase deleteMultipleVoters exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Hapus Masal DPT', `Jumlah: ${ids.length} siswa`);
  }

  public async deleteAllVoters(adminName = 'Super Admin'): Promise<void> {
    safeSetLocalStorage(STORAGE_KEYS.VOTERS, []);
    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('voters').delete().neq('id', '');
        if (error) console.warn('Supabase deleteAllVoters error:', error.message);
      } catch (e) {
        console.warn('Supabase deleteAllVoters exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Kosongkan Seluruh DPT', 'Semua data pemilih dihapus');
  }

  // --- VOTING ENGINE (votes + voters tables) ---
  public async castVote(candidateId: string, voterId: string): Promise<{ success: boolean; receiptCode: string; message: string }> {
    const nowIso = new Date().toISOString();
    const receiptCode = 'VOTE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const voteId = 'v-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const hasCloud = await this.ensureConnection();

    if (hasCloud) {
      const [settings, voterQuery] = await Promise.all([
        this.getSettings(),
        supabase.from('voters').select('*').eq('id', voterId).maybeSingle(),
      ]);

      if (voterQuery.error) {
        throw new Error('Gagal memverifikasi status pemilih ke server. Silakan coba lagi.');
      }
      if (!voterQuery.data) {
        throw new Error('Data pemilih tidak ditemukan di DPT.');
      }

      const remoteVoter = mapSupabaseVoter(voterQuery.data);
      if (remoteVoter.status === 'suspended') {
        throw new Error('Akun pemilih Anda sedang ditangguhkan oleh panitia.');
      }
      if (remoteVoter.hasVoted) {
        this.setCurrentVoter(remoteVoter);
        throw new Error('Anda sudah menggunakan hak suara sebelumnya.');
      }

      // Atomic conditional update so two devices cannot vote twice with the same voter account
      const { data: lockedVoter, error: lockErr } = await supabase
        .from('voters')
        .update({
          has_voted: true,
          voted_at: nowIso,
          receipt_code: receiptCode,
        })
        .eq('id', voterId)
        .eq('has_voted', false)
        .select('*')
        .maybeSingle();

      if (lockErr) {
        throw new Error(`Gagal mengunci status pemilih: ${lockErr.message}`);
      }
      if (!lockedVoter) {
        throw new Error('Anda sudah menggunakan hak suara sebelumnya.');
      }

      const electionId = settings?.id || 'election-2026-2027';
      let insertRes = await supabase.from('votes').insert({
        id: voteId,
        election_id: electionId,
        candidate_id: candidateId,
        verification_hash: receiptCode,
        created_at: nowIso,
      });

      // Compatibility fallback if a custom database schema omitted election_id on votes
      if (
        insertRes.error &&
        (insertRes.error.code === 'PGRST204' || insertRes.error.code === '42703') &&
        insertRes.error.message.includes('election_id')
      ) {
        insertRes = await supabase.from('votes').insert({
          id: voteId,
          candidate_id: candidateId,
          verification_hash: receiptCode,
          created_at: nowIso,
        });
      }

      if (insertRes.error) {
        // Rollback voter status so DPT and Hasil Suara never get out of sync
        await supabase
          .from('voters')
          .update({ has_voted: false, voted_at: null, receipt_code: null })
          .eq('id', voterId);
        throw new Error(`Gagal mencatat surat suara ke kotak suara: ${insertRes.error.message}`);
      }

      const updatedVoter = mapSupabaseVoter(lockedVoter);
      this.setCurrentVoter(updatedVoter);

      const cachedVoters = safeGetLocalStorage<Voter[]>(STORAGE_KEYS.VOTERS, []);
      const vIdx = cachedVoters.findIndex((v) => v.id === voterId);
      if (vIdx >= 0) {
        cachedVoters[vIdx] = updatedVoter;
        safeSetLocalStorage(STORAGE_KEYS.VOTERS, cachedVoters);
      }

      const cachedVotes = safeGetLocalStorage<VoteRecord[]>(STORAGE_KEYS.VOTES, []);
      cachedVotes.push({
        id: voteId,
        candidateId,
        timestamp: nowIso,
        verificationHash: receiptCode,
      });
      safeSetLocalStorage(STORAGE_KEYS.VOTES, cachedVotes);

      return { success: true, receiptCode, message: 'Suara Anda berhasil dicatat secara sah & rahasia.' };
    }

    // Offline / localStorage fallback mode
    const voters = await this.getVoters();
    const voter = voters.find((v) => v.id === voterId);
    if (!voter) throw new Error('Pemilih tidak ditemukan.');
    if (voter.status === 'suspended') throw new Error('Akun pemilih Anda sedang ditangguhkan oleh panitia.');
    if (voter.hasVoted) throw new Error('Anda sudah menggunakan hak suara sebelumnya.');

    voter.hasVoted = true;
    voter.votedAt = nowIso;
    voter.receiptCode = receiptCode;
    await this.saveVoter(voter, 'System');
    this.setCurrentVoter(voter);

    const votes = safeGetLocalStorage<VoteRecord[]>(STORAGE_KEYS.VOTES, []);
    votes.push({
      id: voteId,
      candidateId,
      timestamp: nowIso,
      verificationHash: receiptCode,
    });
    safeSetLocalStorage(STORAGE_KEYS.VOTES, votes);

    return { success: true, receiptCode, message: 'Suara Anda berhasil dicatat secara sah & rahasia.' };
  }

  public async getResults() {
    const [candidates, voters, settings] = await Promise.all([
      this.getCandidates(),
      this.getVoters(),
      this.getSettings(),
    ]);

    let votes: VoteRecord[] = [];
    let loadedFromSupabase = false;

    if (await this.ensureConnection()) {
      try {
        const allVotes: any[] = [];
        const pageSize = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('votes')
            .select('*')
            .range(from, from + pageSize - 1);

          if (error) throw error;
          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allVotes.push(...data);
            if (data.length < pageSize) {
              hasMore = false;
            } else {
              from += pageSize;
            }
          }
        }

        votes = allVotes.map((d: any) => ({
          id: d.id,
          candidateId: d.candidate_id,
          timestamp: d.created_at || new Date().toISOString(),
          verificationHash: d.verification_hash || '',
        }));
        loadedFromSupabase = true;
        safeSetLocalStorage(STORAGE_KEYS.VOTES, votes);
      } catch (e) {
        console.warn('Supabase getResults error:', e);
      }
    }

    if (!loadedFromSupabase) {
      votes = safeGetLocalStorage<VoteRecord[]>(STORAGE_KEYS.VOTES, []);
    }

    const totalVotes = votes.length;
    const totalVoters = voters.length;
    const votedVotersCount = voters.filter((v) => v.hasVoted).length;
    const unvotedCount = voters.filter((v) => !v.hasVoted).length;
    const participationRate = totalVoters > 0 ? Math.round((votedVotersCount / totalVoters) * 100) : 0;

    const candidateResults = candidates.map((cand) => {
      const count = votes.filter((v) => v.candidateId === cand.id).length;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        ...cand,
        voteCount: count,
        percentage,
        rank: 1,
      };
    });

    candidateResults.sort((a, b) => b.voteCount - a.voteCount);
    candidateResults.forEach((c, idx) => {
      c.rank = idx + 1;
    });

    return {
      totalVoters,
      totalVotes,
      votedVotersCount,
      unvotedCount,
      participationRate,
      candidates: candidateResults,
      isPublished: settings.isResultsPublished,
      canViewPublicly: true,
    };
  }

  public async resetAllVotes(adminName: string): Promise<void> {
    const voters = await this.getVoters();
    const resetVoters = voters.map((v) => ({ ...v, hasVoted: false, votedAt: null, receiptCode: undefined }));
    safeSetLocalStorage(STORAGE_KEYS.VOTERS, resetVoters);
    safeSetLocalStorage(STORAGE_KEYS.VOTES, []);

    if (await this.ensureConnection()) {
      try {
        await supabase.from('votes').delete().neq('id', '');
        await supabase.from('voters').update({ has_voted: false, voted_at: null, receipt_code: null }).neq('id', '');
      } catch (e) {
        console.warn('Supabase reset error:', e);
      }
    }
    await this.logAdminAction(adminName, 'Reset Suara', 'Kotak suara dikosongkan.');
  }

  // --- ANNOUNCEMENTS (announcements table) ---
  public async getAnnouncements(): Promise<Announcement[]> {
    if (await this.ensureConnection()) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const mapped: Announcement[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            content: d.content,
            date: d.date || '',
            priority: (d.priority as Announcement['priority']) || 'normal',
          }));
          safeSetLocalStorage(STORAGE_KEYS.ANNOUNCEMENTS, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getAnnouncements error:', e);
      }
    }
    return safeGetLocalStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  }

  public async saveAnnouncement(ann: Announcement, adminName = 'Admin'): Promise<void> {
    const list = await this.getAnnouncements();
    list.unshift(ann);
    safeSetLocalStorage(STORAGE_KEYS.ANNOUNCEMENTS, list);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('announcements').upsert({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          date: ann.date,
          priority: ann.priority || 'normal',
          created_at: new Date().toISOString(),
        });
        if (error) console.warn('Supabase saveAnnouncement error:', error.message);
      } catch (e) {
        console.warn('Supabase saveAnnouncement exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Pengumuman Dibuat', ann.title);
  }

  public async deleteAnnouncement(id: string, adminName = 'Admin'): Promise<void> {
    const list = await this.getAnnouncements();
    const updated = list.filter((a) => a.id !== id);
    safeSetLocalStorage(STORAGE_KEYS.ANNOUNCEMENTS, updated);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) console.warn('Supabase deleteAnnouncement error:', error.message);
      } catch (e) {
        console.warn('Supabase deleteAnnouncement exception:', e);
      }
    }
    await this.logAdminAction(adminName, 'Hapus Pengumuman', `ID: ${id}`);
  }

  // --- ADMIN LOGS (admin_logs table) ---
  public async getAdminLogs(): Promise<AdminLog[]> {
    if (await this.ensureConnection()) {
      try {
        const { data, error } = await supabase
          .from('admin_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);
        if (!error && data && data.length > 0) {
          const mapped: AdminLog[] = data.map((d: any) => ({
            id: d.id,
            adminName: d.admin_name,
            action: d.action,
            details: d.details || '',
            timestamp: d.timestamp || new Date().toISOString(),
          }));
          safeSetLocalStorage(STORAGE_KEYS.LOGS, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getAdminLogs error:', e);
      }
    }
    return safeGetLocalStorage<AdminLog[]>(STORAGE_KEYS.LOGS, INITIAL_ADMIN_LOGS);
  }

  public async logAdminAction(adminName: string, action: string, details: string): Promise<void> {
    const logs = safeGetLocalStorage<AdminLog[]>(STORAGE_KEYS.LOGS, []);
    const newLog: AdminLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      adminName,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    safeSetLocalStorage(STORAGE_KEYS.LOGS, logs.slice(0, 100));

    if (await this.ensureConnection()) {
      try {
        await supabase.from('admin_logs').insert({
          id: newLog.id,
          admin_name: newLog.adminName,
          action: newLog.action,
          details: newLog.details,
          timestamp: newLog.timestamp,
        });
      } catch (e) {
        console.warn('Supabase logAdminAction error:', e);
      }
    }
  }

  // --- FULL SYNC TO SUPABASE ---
  public async syncLocalDataToSupabase(): Promise<{ success: boolean; message: string }> {
    try {
      const conn = await this.checkConnection();
      if (!conn.ok || !conn.tablesExist) {
        return { success: false, message: conn.message || 'Tabel Supabase belum tersedia.' };
      }

      const settings = safeGetLocalStorage<ElectionSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
      const candidates = safeGetLocalStorage<Candidate[]>(STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
      const voters = safeGetLocalStorage<Voter[]>(STORAGE_KEYS.VOTERS, INITIAL_VOTERS);
      const announcements = safeGetLocalStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
      const logs = safeGetLocalStorage<AdminLog[]>(STORAGE_KEYS.LOGS, INITIAL_ADMIN_LOGS);
      const admins = safeGetLocalStorage<AdminUser[]>(STORAGE_KEYS.ADMINS, []).filter(
        (a) => !isLegacyUncustomizedDefaultAdmin(a)
      );

      const elecRes = await supabase.from('elections').upsert({
        id: settings.id,
        title: settings.title,
        academic_year: settings.academicYear,
        school_name: settings.schoolName,
        school_address: settings.schoolAddress || '',
        school_logo: settings.schoolLogo || '',
        status: settings.status,
        start_time: settings.startTime,
        end_time: settings.endTime,
        is_results_published: !!settings.isResultsPublished,
        allow_realtime_before_end: !!settings.allowRealtimeBeforeEnd,
        tagline: settings.tagline || '',
        contact_email: settings.contactEmail || '',
        contact_phone: settings.contactPhone || '',
        contact_person: settings.contactPerson || '',
      });
      if (elecRes.error) throw new Error(`elections: ${elecRes.error.message}`);

      if (candidates.length > 0) {
        const candRes = await supabase.from('candidates').upsert(
          candidates.map((c) => ({
            id: c.id,
            candidate_number: c.candidateNumber,
            chairman_name: c.chairmanName,
            vice_chairman_name: c.viceChairmanName || '',
            chairman_class: c.chairmanClass,
            vice_chairman_class: c.viceChairmanClass || '',
            photo_url: c.photoUrl,
            chairman_photo_url: c.chairmanPhotoUrl || null,
            vice_chairman_photo_url: c.viceChairmanPhotoUrl || null,
            tagline: c.tagline || '',
            vision: c.vision,
            missions: Array.isArray(c.missions) ? c.missions : [],
            work_programs: Array.isArray(c.workPrograms) ? c.workPrograms : [],
            color_theme: c.colorTheme || '#1E3E62',
          }))
        );
        if (candRes.error) throw new Error(`candidates: ${candRes.error.message}`);
      }

      for (let i = 0; i < voters.length; i += 250) {
        const chunk = voters.slice(i, i + 250).map((v) => ({
          id: v.id,
          nisn: v.nisn,
          full_name: v.fullName,
          class_name: v.className,
          gender: v.gender || 'L',
          passcode: v.passcode,
          has_voted: !!v.hasVoted,
          voted_at: v.votedAt || null,
          receipt_code: v.receiptCode || null,
          status: v.status || 'active',
        }));
        const voterRes = await supabase.from('voters').upsert(chunk);
        if (voterRes.error) throw new Error(`voters: ${voterRes.error.message}`);
      }

      if (announcements.length > 0) {
        const annRes = await supabase.from('announcements').upsert(
          announcements.map((a) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            date: a.date,
            priority: a.priority || 'normal',
          }))
        );
        if (annRes.error) throw new Error(`announcements: ${annRes.error.message}`);
      }

      if (admins.length > 0) {
        const admRes = await supabase.from('admin_users').upsert(
          admins.map((a) => ({
            id: a.id,
            username: a.username.toLowerCase(),
            full_name: a.fullName,
            password: a.password || '',
            role: a.role,
            status: a.status || 'active',
            created_at: a.createdAt || new Date().toISOString(),
          }))
        );
        if (admRes.error) throw new Error(`admin_users: ${admRes.error.message}`);
      }

      if (logs.length > 0) {
        await supabase.from('admin_logs').upsert(
          logs.slice(0, 50).map((l) => ({
            id: l.id,
            admin_name: l.adminName,
            action: l.action,
            details: l.details,
            timestamp: l.timestamp,
          }))
        );
      }

      this.useSupabase = true;
      return { success: true, message: 'Seluruh data (termasuk akun Admin, DPT, Calon Ketua OSIS, Pengumuman) berhasil disinkronkan ke Supabase!' };
    } catch (e: any) {
      return { success: false, message: `Gagal sinkronisasi: ${e.message}` };
    }
  }

  // --- ADMIN AUTH & MANAGEMENT (admin_users table) ---
  private async getAdminsWithCredentials(): Promise<AdminUser[]> {
    const localAdmins = safeGetLocalStorage<AdminUser[]>(STORAGE_KEYS.ADMINS, []).filter(
      (a) => !isLegacyUncustomizedDefaultAdmin(a)
    );
    const localLoginMap = new Map(localAdmins.map((a) => [a.id, a.lastLogin]));

    if (await this.ensureConnection()) {
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, username, full_name, password, role, status, created_at')
          .order('created_at', { ascending: true });

        if (!error && data) {
          const mapped: AdminUser[] = data.map((d: any) => ({
            id: d.id,
            username: d.username,
            fullName: d.full_name,
            password: d.password,
            role: d.role === 'super_admin' ? 'super_admin' : 'panitia',
            status: d.status === 'suspended' ? 'suspended' : 'active',
            createdAt: d.created_at || new Date().toISOString(),
            lastLogin: localLoginMap.get(d.id),
          }));
          safeSetLocalStorage(STORAGE_KEYS.ADMINS, mapped);
          return mapped;
        }
      } catch (e) {
        console.warn('Supabase getAdmins error:', e);
      }
    }
    return localAdmins;
  }

  public async getAdmins(): Promise<AdminUser[]> {
    const list = await this.getAdminsWithCredentials();
    return list.map(({ password: _pw, ...safeAdmin }) => safeAdmin);
  }

  public async hasAnyAdmin(): Promise<{ hasAdmin: boolean; source: 'supabase' | 'local' }> {
    const conn = await this.checkConnection();
    if (conn.ok && conn.tablesExist) {
      try {
        const { count, error } = await supabase
          .from('admin_users')
          .select('id', { count: 'exact', head: true });
        if (!error) {
          return { hasAdmin: (count || 0) > 0, source: 'supabase' };
        }
      } catch (e) {
        console.warn('Supabase hasAnyAdmin error:', e);
      }
    }
    const localAdmins = safeGetLocalStorage<AdminUser[]>(STORAGE_KEYS.ADMINS, []).filter(
      (a) => !isLegacyUncustomizedDefaultAdmin(a)
    );
    return { hasAdmin: localAdmins.length > 0, source: 'local' };
  }

  public async bootstrapFirstAdmin(
    fullName: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    const cleanName = fullName.trim();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName) {
      return { success: false, error: 'Nama lengkap administrator wajib diisi.' };
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(cleanUser)) {
      return {
        success: false,
        error: 'Username harus 3–32 karakter (hanya huruf kecil, angka, titik, underscore, atau tanda hubung).',
      };
    }
    if (cleanPass.length < 6) {
      return { success: false, error: 'Kata sandi minimal harus 6 karakter.' };
    }

    const status = await this.hasAnyAdmin();
    if (status.hasAdmin) {
      return {
        success: false,
        error: 'Akun administrator sudah terdaftar. Silakan login dengan username dan kata sandi yang berlaku.',
      };
    }

    const passwordHash = await hashPassword(cleanPass);
    const nowIso = new Date().toISOString();
    const newAdmin: AdminUser = {
      id: 'adm-' + Math.random().toString(36).substring(2, 10),
      username: cleanUser,
      fullName: cleanName,
      password: passwordHash,
      role: 'super_admin',
      status: 'active',
      createdAt: nowIso,
      lastLogin: nowIso,
    };

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('admin_users').insert({
          id: newAdmin.id,
          username: newAdmin.username,
          full_name: newAdmin.fullName,
          password: newAdmin.password,
          role: newAdmin.role,
          status: newAdmin.status,
          created_at: newAdmin.createdAt,
        });
        if (error) {
          return { success: false, error: `Gagal menyimpan Super Admin ke database: ${error.message}` };
        }
      } catch (e: any) {
        return { success: false, error: `Gagal menyimpan ke server: ${e.message}` };
      }
    }

    const { password: _pw, ...sessionUser } = newAdmin;
    safeSetLocalStorage(STORAGE_KEYS.ADMINS, [newAdmin]);
    safeSetLocalStorage(STORAGE_KEYS.ADMIN_SESSION, sessionUser);

    await this.logAdminAction(cleanName, 'Aktivasi Super Admin', `Akun Super Admin pertama @${cleanUser} resmi diaktifkan.`);
    return { success: true, user: sessionUser };
  }

  public async saveAdmin(adminData: AdminUser, operatorName = 'Super Admin'): Promise<{ success: boolean; message: string }> {
    const list = await this.getAdminsWithCredentials();
    const cleanUsername = adminData.username.trim().toLowerCase();

    if (list.some((a) => a.username.toLowerCase() === cleanUsername && a.id !== adminData.id)) {
      return { success: false, message: `Username "@${cleanUsername}" sudah digunakan oleh akun lain.` };
    }

    const idx = list.findIndex((a) => a.id === adminData.id);
    let finalRecord: AdminUser;

    if (idx >= 0) {
      let nextPassword = list[idx].password || '';
      if (adminData.password && adminData.password.trim()) {
        const trimmed = adminData.password.trim();
        nextPassword = trimmed.startsWith('pbkdf2$') ? trimmed : await hashPassword(trimmed);
      }
      finalRecord = {
        ...list[idx],
        ...adminData,
        username: cleanUsername,
        password: nextPassword,
      };
      list[idx] = finalRecord;
    } else {
      const trimmed = adminData.password?.trim() || '';
      if (trimmed.length < 6) {
        return { success: false, message: 'Kata sandi minimal 6 karakter.' };
      }
      finalRecord = {
        ...adminData,
        username: cleanUsername,
        password: trimmed.startsWith('pbkdf2$') ? trimmed : await hashPassword(trimmed),
        createdAt: adminData.createdAt || new Date().toISOString(),
      };
      list.push(finalRecord);
    }

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('admin_users').upsert({
          id: finalRecord.id,
          username: finalRecord.username,
          full_name: finalRecord.fullName,
          password: finalRecord.password || '',
          role: finalRecord.role,
          status: finalRecord.status,
          created_at: finalRecord.createdAt,
        });
        if (error) {
          return { success: false, message: `Gagal menyimpan ke Supabase: ${error.message}` };
        }
      } catch (e: any) {
        return { success: false, message: `Gagal menyimpan ke server: ${e.message}` };
      }
    }

    safeSetLocalStorage(STORAGE_KEYS.ADMINS, list);
    await this.logAdminAction(operatorName, 'Kelola Admin', `${finalRecord.fullName} (@${finalRecord.username})`);
    return { success: true, message: 'Data admin berhasil disimpan & disinkronkan ke seluruh perangkat.' };
  }

  public async deleteAdmin(adminId: string, operatorName = 'Super Admin'): Promise<{ success: boolean; message: string }> {
    const list = await this.getAdminsWithCredentials();
    const target = list.find((a) => a.id === adminId);
    const updated = list.filter((a) => a.id !== adminId);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase.from('admin_users').delete().eq('id', adminId);
        if (error) {
          return { success: false, message: `Gagal menghapus di Supabase: ${error.message}` };
        }
      } catch (e: any) {
        return { success: false, message: `Gagal menghapus di server: ${e.message}` };
      }
    }

    safeSetLocalStorage(STORAGE_KEYS.ADMINS, updated);
    await this.logAdminAction(operatorName, 'Hapus Admin', target ? `${target.fullName} (@${target.username})` : `ID: ${adminId}`);
    return { success: true, message: 'Akun admin berhasil dihapus.' };
  }

  public async changeAdminPassword(adminId: string, newPass: string, operatorName = 'Super Admin'): Promise<{ success: boolean; message: string }> {
    const trimmedPass = newPass.trim();
    if (trimmedPass.length < 6) {
      return { success: false, message: 'Kata sandi minimal 6 karakter.' };
    }
    const list = await this.getAdminsWithCredentials();
    const target = list.find((a) => a.id === adminId);
    if (!target) return { success: false, message: 'Admin tidak ditemukan.' };

    const hashedPass = await hashPassword(trimmedPass);

    if (await this.ensureConnection()) {
      try {
        const { error } = await supabase
          .from('admin_users')
          .update({ password: hashedPass })
          .eq('id', adminId);
        if (error) {
          return { success: false, message: `Gagal memperbarui sandi di Supabase: ${error.message}` };
        }
      } catch (e: any) {
        return { success: false, message: `Gagal memperbarui sandi di server: ${e.message}` };
      }
    }

    target.password = hashedPass;
    safeSetLocalStorage(STORAGE_KEYS.ADMINS, list);
    await this.logAdminAction(operatorName, 'Ganti Kata Sandi', `${target.fullName} (@${target.username})`);
    return { success: true, message: 'Kata sandi berhasil diperbarui & berlaku di seluruh perangkat.' };
  }

  public async verifyAdmin(user: string, pass: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    const cleanUser = user.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Silakan isi username dan kata sandi.' };
    }

    // Force fresh connection check on login so another computer always queries live Supabase
    await this.checkConnection();
    const list = await this.getAdminsWithCredentials();
    const found = list.find((a) => a.username.toLowerCase() === cleanUser);

    if (!found) {
      return { success: false, error: 'Username admin tidak terdaftar atau telah dihapus.' };
    }

    if (found.status === 'suspended') {
      return { success: false, error: 'Akun admin ini sedang ditangguhkan oleh Super Admin.' };
    }

    const validPassword = await verifyPassword(cleanPass, found.password);
    if (!validPassword) {
      return { success: false, error: 'Kata sandi tidak cocok.' };
    }

    const nowIso = new Date().toISOString();
    const { password: _pw, ...safeFound } = found;
    const sessionUser: AdminUser = { ...safeFound, lastLogin: nowIso };

    // Update lastLogin locally for dashboard display
    const updatedList = list.map((a) => (a.id === found.id ? { ...a, lastLogin: nowIso } : a));
    safeSetLocalStorage(STORAGE_KEYS.ADMINS, updatedList);
    this.memoryAdminSession = sessionUser;
    safeSetLocalStorage(STORAGE_KEYS.ADMIN_SESSION, sessionUser);

    await this.logAdminAction(found.fullName, 'Login Admin', `Berhasil masuk sebagai @${found.username}`);
    return { success: true, user: sessionUser };
  }

  public getAdminSession(): AdminUser | null {
    return this.memoryAdminSession || safeGetLocalStorage<AdminUser | null>(STORAGE_KEYS.ADMIN_SESSION, null);
  }

  public logoutAdmin(): void {
    this.memoryAdminSession = null;
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION); } catch {}
      try { sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION); } catch {}
    }
  }

  public getCurrentVoter(): Voter | null {
    return this.memoryCurrentVoter || safeGetLocalStorage<Voter | null>(STORAGE_KEYS.CURRENT_VOTER, null);
  }

  public setCurrentVoter(voter: Voter | null): void {
    this.memoryCurrentVoter = voter;
    if (typeof window === 'undefined') return;
    if (voter) {
      safeSetLocalStorage(STORAGE_KEYS.CURRENT_VOTER, voter);
    } else {
      try { localStorage.removeItem(STORAGE_KEYS.CURRENT_VOTER); } catch {}
      try { sessionStorage.removeItem(STORAGE_KEYS.CURRENT_VOTER); } catch {}
    }
  }

  public async verifyVoter(identifier: string, code: string): Promise<{ success: boolean; voter?: Voter; error?: string }> {
    const cleanInput = normalizeDptText(identifier);
    const cleanCode = normalizeDptText(code);

    if (!cleanInput || !cleanCode) {
      return { success: false, error: 'Silakan isi Username / NISN dan Kode Akses Anda.' };
    }

    const inputNoSpaces = cleanInput.replace(/\s+/g, '');
    const inputCompact = inputNoSpaces.replace(/-/g, '').toLowerCase();
    const isPureDigits = /^\d+$/.test(inputNoSpaces);
    const strippedZeros = isPureDigits ? inputNoSpaces.replace(/^0+/, '') : '';

    // Refresh connection so Android/iPhone devices always query live DPT from Supabase
    const conn = await this.checkConnection();
    let voter: Voter | undefined;

    if (conn.ok && conn.tablesExist) {
      try {
        const candidateKeys = Array.from(new Set([cleanInput, inputNoSpaces]));
        for (const key of candidateKeys) {
          const { data, error } = await supabase
            .from('voters')
            .select('*')
            .ilike('nisn', escapeSupabaseLike(key))
            .limit(2);
          if (!error && data && data.length === 1) {
            voter = mapSupabaseVoter(data[0]);
            break;
          }
        }
      } catch (e) {
        console.warn('Direct voter lookup warning:', e);
      }
    }

    if (!voter) {
      const voters = await this.getVoters();
      voter =
        voters.find((v) => normalizeDptText(v.nisn).toLowerCase() === cleanInput.toLowerCase()) ||
        voters.find(
          (v) => normalizeDptText(v.nisn).replace(/\s+/g, '').toLowerCase() === inputNoSpaces.toLowerCase()
        ) ||
        voters.find(
          (v) => normalizeDptText(v.nisn).replace(/[\s-]+/g, '').toLowerCase() === inputCompact
        );

      if (!voter && isPureDigits && strippedZeros.length >= 3) {
        const digitMatches = voters.filter((v) => {
          const vn = normalizeDptText(v.nisn).replace(/\s+/g, '');
          return /^\d+$/.test(vn) && vn.replace(/^0+/, '') === strippedZeros;
        });
        if (digitMatches.length === 1) {
          voter = digitMatches[0];
        }
      }
    }

    if (!voter) {
      return { success: false, error: 'Username / NISN tidak terdaftar di DPT. Hubungi panitia pemilihan.' };
    }

    if (voter.status === 'suspended') {
      return { success: false, error: 'Akun pemilih ini sedang ditangguhkan. Silakan hubungi panitia TPS.' };
    }

    const storedCode = normalizeDptText(voter.passcode);
    const codeNoSpaces = cleanCode.replace(/\s+/g, '');
    const storedCodeNoSpaces = storedCode.replace(/\s+/g, '');

    const codeMatches =
      storedCode === cleanCode ||
      storedCodeNoSpaces === codeNoSpaces ||
      storedCodeNoSpaces.toLowerCase() === codeNoSpaces.toLowerCase();

    if (!codeMatches) {
      return { success: false, error: 'Kode akses / PIN tidak cocok. Periksa kembali huruf/angka PIN Anda.' };
    }

    this.setCurrentVoter(voter);
    return { success: true, voter };
  }
}

export const electionStore = new ElectionStore();
