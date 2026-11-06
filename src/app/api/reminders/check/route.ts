import { supabaseAdmin } from '@/lib/supabase-admin';
import { daysUntil } from '@/lib/date-utils';
import { sendDeadlineEmail, type ReminderJob } from '@/lib/email';

// Cron runs daily; remind on days that are multiples of 3 plus the final day.
const REMINDER_STEPS = [3, 1];

interface CandidateRow {
  id: string;
  user_id: string;
  position_title: string;
  company_name: string;
  deadline: string;
  status: string;
  last_reminder_at: string | null;
}

export async function GET(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'RESEND_API_KEY is not configured' }, { status: 503 });
  }

  // Vercel sends `Authorization: Bearer <CRON_SECRET>` on scheduled invocations.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (provided !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = Date.now();
  const horizon = now + 4 * 24 * 60 * 60 * 1000;

  const { data, error } = await supabaseAdmin
    .from('job_applications')
    .select('id, user_id, position_title, company_name, deadline, status, last_reminder_at')
    .not('deadline', 'is', null)
    .in('status', ['wishlist', 'applied', 'interview'])
    .gte('deadline', new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .lte('deadline', new Date(horizon).toISOString());

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CandidateRow[];

  // Group by user so one email covers all of that user's imminent deadlines.
  const byUser = new Map<string, CandidateRow[]>();
  for (const row of rows) {
    const days = daysUntil(row.deadline);
    if (Number.isNaN(days)) continue;
    if (!REMINDER_STEPS.includes(days)) continue;
    // Never email twice for the same application on the same calendar day.
    if (row.last_reminder_at && new Date(row.last_reminder_at).toDateString() === new Date().toDateString()) {
      continue;
    }
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const results: { user_id: string; sent: boolean; jobs: number; error?: string }[] = [];

  for (const [userId, userRows] of byUser) {
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authData?.user?.email;
    if (!email) {
      results.push({ user_id: userId, sent: false, jobs: userRows.length, error: 'No email on account' });
      continue;
    }

    const jobs: ReminderJob[] = userRows
      .map((row) => ({
        position_title: row.position_title,
        company_name: row.company_name,
        deadline: row.deadline,
        daysLeft: daysUntil(row.deadline),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const outcome = await sendDeadlineEmail(email, jobs, null);

    if (outcome.ok) {
      await supabaseAdmin
        .from('job_applications')
        .update({ reminder_sent: true, last_reminder_at: new Date().toISOString() })
        .in(
          'id',
          userRows.map((r) => r.id)
        );
    }

    results.push({
      user_id: userId,
      sent: outcome.ok,
      jobs: userRows.length,
      error: outcome.error,
    });
  }

  return Response.json({
    checked: rows.length,
    matched: byUser.size,
    results,
  });
}
