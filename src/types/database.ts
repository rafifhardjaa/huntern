export type JobStatus = 'wishlist' | 'applied' | 'interview' | 'offered' | 'rejected';

export const JOB_STATUSES: JobStatus[] = ['wishlist', 'applied', 'interview', 'offered', 'rejected'];

export type PrepQuestionType = 'behavioral' | 'technical' | 'culture';

export interface PrepQuestion {
  type: PrepQuestionType;
  question: string;
}

export interface JobApplication {
  id: string;
  user_id: string;
  company_name: string;
  position_title: string;
  status: JobStatus;
  job_description: string | null;
  ai_cover_letter: string | null;
  interview_date: string | null;
  deadline: string | null;
  reminder_sent: boolean;
  last_reminder_at: string | null;
  custom_resume_bullets: string | null;
  interview_prep_questions: PrepQuestion[] | null;
  interview_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserResume {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
