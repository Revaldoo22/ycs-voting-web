// Hand-maintained Supabase types. Regenerate with the Supabase CLI:
//   supabase gen types typescript --project-id <id> > src/types/database.ts

export type Role = "admin" | "participant" | "voter";
export type ParticipantStatus = "active" | "inactive";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type QuestStatus = "active" | "inactive";

export interface School {
  id: string;
  name: string;
  created_at: string;
}

export interface AppSettings {
  id: boolean;
  event_open: boolean;
  closed_message: string;
  ip_daily_limit: number;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string;
  phone_number: string;
  school_id: string | null;
  role: Role;
  device_fingerprint: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  profile_id: string | null;
  /** Email dari web pendaftaran. Kunci sinkronisasi & pencocokan voter. */
  email: string | null;
  name: string;
  school_id: string;
  photo_url: string | null;
  description: string | null;
  total_points: number;
  status: ParticipantStatus;
  created_at: string;
}

export type ProofType = "link" | "file";
export type QuestFrequency = "once" | "daily" | "global";
export type ContentKind = "engage" | "sound";

export interface ParticipantContent {
  id: string;
  participant_id: string;
  kind: ContentKind;
  url: string;
  label: string | null;
  created_at: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string | null;
  point: number;
  status: QuestStatus;
  proof_type: ProofType;
  frequency: QuestFrequency;
  content_kind: ContentKind | null;
  ref_link: string | null;
  ref_image: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string | null;
  participant_id: string;
  quest_id: string;
  content_id: string | null;
  proof_url: string;
  status: SubmissionStatus;
  review_note: string | null;
  voter_name: string | null;
  voter_phone: string | null;
  voter_email: string | null;
  voter_status: string | null;
  voter_school: string | null;
  voter_class: string | null;
  submit_date: string;
  created_at: string;
}

export interface DailyVote {
  id: string;
  user_id: string;
  participant_id: string;
  device_fingerprint: string;
  vote_date: string;
  created_at: string;
}

// RPC return shapes
export interface AdminStats {
  total_schools: number;

  // Peserta
  total_participants: number;
  active_participants: number;
  inactive_participants: number;
  golden_buzzers: number;
  /** Lolos lewat gelombang, tidak termasuk Golden Buzzer. */
  qualified_participants: number;
  participants_with_points: number;

  // Voter (identitas unik, bukan jumlah vote)
  total_voters: number;
  onboarded_voters: number;

  // Vote. Bot (boost admin) tidak pernah ikut selain di bot_votes.
  total_votes: number;
  approved_votes: number;
  pending_votes: number;
  /** Dari arsip: baris vote dihapus saat ditolak agar voter bisa mengulang. */
  rejected_votes: number;
  /** Voter unik yang ditolak lalu mengajukan ulang dan akhirnya disetujui. */
  recovered_voters: number;
  /** Voter unik yang ditolak dan tak pernah kembali. */
  lost_voters: number;
  bot_votes: number;

  /**
   * Corong VOTER MURNI: akun yang bukan peserta. Tiap tahap himpunan bagian
   * dari tahap sebelumnya (punya akun > onboarding > pernah vote), jadi
   * jangan dijumlahkan.
   */
  accounts_total: number;
  accounts_onboarded: number;
  accounts_not_onboarded: number;
  accounts_voted: number;
  accounts_onboarded_no_vote: number;
  /** Akun peserta, dihitung terpisah dari corong voter. */
  participant_accounts: number;
  /** Peserta yang ikut mendukung peserta lain. */
  participant_accounts_voted: number;
  /** Vote dari nomor yang tak punya akun terdaftar (mis. data lama). */
  voters_without_account: number;

  // Klaim kupon
  pending_claims: number;
  approved_claims: number;
  rejected_claims: number;

  total_points: number;
}

export interface PointHistoryRow {
  day: string;
  points: number;
  cumulative: number;
}

export interface TopSupporter {
  voter_name: string;
  voter_status: string | null;
  votes: number;
  points: number;
}

export interface TopVoter {
  voter_name: string;
  school_name: string | null;
  votes: number;
  quests: number;
  score: number;
}

export interface DailyVoteSeriesRow {
  day: string;
  votes: number;
}

export interface VoterGrowthRow {
  day: string;
  /** Akun voter yang dibuat hari itu. */
  accounts: number;
  /** Orang yang benar-benar vote hari itu (nomor WA unik, tanpa bot). */
  voters: number;
  /** Akumulasi voter unik sampai hari itu. */
  cumulative: number;
}

// Joined view used in UI lists
export type ParticipantWithSchool = Participant & {
  schools:
    | (Pick<School, "id" | "name"> & {
        region_id?: string | null;
        kabupaten?: string | null;
        provinsi?: string | null;
      })
    | null;
  // Only readable by admin (RLS); the participant's login phone number.
  profiles?: { phone_number: string } | null;
  /**
   * Sudah lolos di salah satu gelombang. Peserta ini berhenti berkompetisi,
   * jadi tidak menerima vote lagi (backend menolak dengan ALREADY_QUALIFIED).
   */
  qualified?: boolean;
  /**
   * Dipilih panitia sebagai Golden Buzzer: langsung lolos, jadi tidak
   * menerima vote lagi (backend menolak dengan GOLDEN_BUZZER).
   */
  golden_buzzer?: boolean;
  /** Nama gelombang tempat dia lolos. Null untuk Golden Buzzer. */
  qualified_round_name?: string | null;
  /**
   * Poin di gelombang berjalan (carry + vote gelombang itu), basis yang sama
   * dengan klasemen. Null bila peserta tak ikut gelombang aktif.
   */
  round_points?: number | null;
  /** Nama gelombang berjalan yang diikuti peserta ini. */
  round_name?: string | null;
};
