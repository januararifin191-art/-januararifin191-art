export interface Candidate {
  id: string;
  candidateNumber: number;
  chairmanName: string;
  viceChairmanName: string;
  chairmanClass: string;
  viceChairmanClass: string;
  photoUrl: string;
  chairmanPhotoUrl?: string;
  viceChairmanPhotoUrl?: string;
  tagline: string;
  vision: string;
  missions: string[];
  workPrograms: {
    title: string;
    description: string;
    category?: string;
  }[];
  colorTheme?: string;
}

export interface Voter {
  id: string;
  nisn: string;
  fullName: string;
  className: string;
  gender: 'L' | 'P';
  passcode: string;
  hasVoted: boolean;
  votedAt: string | null;
  receiptCode?: string;
  status?: 'active' | 'suspended';
}

export interface VoteRecord {
  id: string;
  candidateId: string;
  timestamp: string;
  verificationHash: string;
}

export interface ElectionSettings {
  id: string;
  title: string;
  academicYear: string;
  schoolName: string;
  schoolAddress: string;
  schoolLogo: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  startTime: string;
  endTime: string;
  isResultsPublished: boolean;
  allowRealtimeBeforeEnd: boolean;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactPerson?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: 'normal' | 'important' | 'urgent';
}

export interface AdminLog {
  id: string;
  adminName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  role: 'super_admin' | 'panitia';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}
