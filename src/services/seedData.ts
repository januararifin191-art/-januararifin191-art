import { Candidate, ElectionSettings, Voter, Announcement, AdminLog, AdminUser } from '../types';

export const INITIAL_SETTINGS: ElectionSettings = {
  id: 'election-2026-2027',
  title: 'PEMILIHAN KETUA OSIS',
  academicYear: '2026/2027',
  schoolName: 'SMA NEGERI 1 RAHAYU',
  schoolAddress: 'Jl. Pendidikan No. 45, Kompleks Karang Rahayu, Jawa Barat',
  schoolLogo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=300&q=80',
  status: 'ongoing',
  startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  isResultsPublished: false,
  allowRealtimeBeforeEnd: false,
  tagline: 'Satu Suara, Satu Perubahan, Masa Depan Sekolah, RAHAYU',
  contactEmail: 'panitia.evoting@sman1rahayu.sch.id',
  contactPhone: '+62 821-2345-6789 (WhatsApp Panitia)',
  contactPerson: 'Bapak Ahmad Fauzi, S.Pd (Pembina OSIS) / Naufal Rizky (Ketua MPK)',
};

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'cand-01',
    candidateNumber: 1,
    chairmanName: 'Muhammad Rizky Pratama',
    viceChairmanName: '',
    chairmanClass: 'XI A 1',
    viceChairmanClass: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    chairmanPhotoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=500&q=80',
    tagline: 'Sinergi Harmoni, Berprestasi Tanpa Henti',
    vision: 'Mewujudkan OSIS SMA Negeri 1 Rahayu sebagai wadah aspirasi yang inklusif, adaptif terhadap era digital, berkarakter luhur, dan berdaya saing global.',
    missions: [
      'Meningkatkan partisipasi aktif seluruh siswa dalam kegiatan ekstrakurikuler dan akademik melalui platform digital terintegrasi.',
      'Menanamkan budaya kepemimpinan berwawasan lingkungan hidup (Green Campus Initiative) dan kesetiakawanan sosial.',
      'Memfasilitasi ruang kreatif siswa dalam bidang seni, sains terapan, kewirausahaan muda, dan olahraga prestasi.',
      'Membangun komunikasi transparan dan dua arah antara siswa, guru, komite sekolah, dan alumni.'
    ],
    workPrograms: [
      { title: 'Rahayu Digital Student Hub', description: 'Aplikasi web mading sekolah, rekap prestasi, dan forum aspirasi siswa secara transparan.', category: 'Teknologi' },
      { title: 'Rahayu EduFest & Career Day', description: 'Pameran kampus PTN/PTS favorit, bimbingan SNBP/SNBT, dan temu alumni inspiratif.', category: 'Akademik' },
      { title: 'Eco-School Zero Waste Movement', description: 'Bank sampah plastik bernilai beasiswa, pemilahan organik, dan taman hydroponik sekolah.', category: 'Sosial' },
      { title: 'Pekan Olahraga & Seni (PORSENI) Milenial', description: 'Turnamen e-sports resmi, futsal, basket, festival tari kreasi dan akustik.', category: 'Kreatif' }
    ],
    colorTheme: '#1E3E62'
  },
  {
    id: 'cand-02',
    candidateNumber: 2,
    chairmanName: 'Fajar Nugraha',
    viceChairmanName: '',
    chairmanClass: 'XI B 1',
    viceChairmanClass: '',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    chairmanPhotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80',
    tagline: 'Kreatif, Kolaboratif, Berdaya Saing Global',
    vision: 'Membangun generasi emas SMA Negeri 1 Rahayu yang tangguh berkarakter, unggul dalam inovasi, dan menjunjung tinggi empati sosial.',
    missions: [
      'Menyelenggarakan workshop keterampilan abad ke-21 (coding, public speaking, digital marketing).',
      'Membentuk Satgas Anti-Bullying dan konseling sebaya yang ramah siswa.',
      'Optimalisasi sarana minat bakat dan kegiatan keagamaan yang menjalin persaudaraan.'
    ],
    workPrograms: [
      { title: 'Youth Innovation Lab', description: 'Pemberdayaan riset ilmiah remaja dan inkubator ide startup siswa.', category: 'Inovasi' },
      { title: 'Sahabat Sejiwa Corner', description: 'Layanan curhat sebaya dan sosialisasi kesehatan mental remaja.', category: 'Kesehatan' }
    ],
    colorTheme: '#0D9488'
  }
];

export const INITIAL_VOTERS: Voter[] = [];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-01',
    title: 'Tata Cara Memberikan Hak Suara di E-Voting OSIS',
    content: 'Pastikan Anda telah menerima NISN dan Kode Akses resmi dari panitia TPS kelas. Masukkan kredensial Anda, pilih calon ketua OSIS nomor urut 1 atau 2, dan tekan tombol Berikan Suara.',
    date: '31 Oktober 2026',
    priority: 'important'
  },
  {
    id: 'ann-02',
    title: 'Prinsip LUBER & JURDIL Dijamin Sistem',
    content: 'Pilihan surat suara Anda tersimpan secara anonim dan acak kriptografis. Panitia tidak dapat melihat atau melacak siapa yang memilih kandidat mana.',
    date: '30 Oktober 2026',
    priority: 'normal'
  }
];

export const INITIAL_ADMIN_LOGS: AdminLog[] = [
  {
    id: 'log-01',
    adminName: 'Panitia Inti',
    action: 'Inisialisasi Pemilihan',
    details: 'Status pemilihan aktif. Bilik suara siap menerima suara pemilih.',
    timestamp: new Date().toISOString()
  }
];

export const INITIAL_ADMINS: AdminUser[] = [];
