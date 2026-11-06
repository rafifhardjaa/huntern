import { Resend } from 'resend';
import { formatDeadlineDate } from '@/lib/date-utils';

// Design tokens from ARD/DESIGN.md so the email matches the app.
const BRAND = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  danger: '#E11D48',
  dangerBg: '#FFF1F2',
} as const;

export interface ReminderJob {
  position_title: string;
  company_name: string;
  deadline: string;
  daysLeft: number;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function urgencyCopy(daysLeft: number): { badge: string; accent: string; badgeBg: string } {
  if (daysLeft <= 0) {
    return { badge: 'Due today', accent: BRAND.danger, badgeBg: BRAND.dangerBg };
  }
  if (daysLeft === 1) {
    return { badge: 'Due tomorrow', accent: BRAND.danger, badgeBg: BRAND.dangerBg };
  }
  return { badge: `Due in ${daysLeft} days`, accent: BRAND.primary, badgeBg: '#EEF2FF' };
}

function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Huntern reminder</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:'Inter',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.textPrimary};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(17,24,39,0.08);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid ${BRAND.border};">
              <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.textPrimary};">Huntern</p>
              <p style="margin:4px 0 0;font-size:12px;color:${BRAND.textSecondary};">Intern Hunter OS</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${BRAND.border};">
              <p style="margin:0;font-size:11px;line-height:1.6;color:${BRAND.textSecondary};">
                Sent because you set a deadline on this application. Manage reminders in Huntern &rarr; Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function jobRow(job: ReminderJob, accent: string, badgeBg: string): string {
  const urgency = urgencyCopy(job.daysLeft);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;margin:0 0 12px 0;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0;font-size:15px;font-weight:600;line-height:1.4;color:${BRAND.textPrimary};">
          ${escapeHtml(job.position_title)}
        </p>
        <p style="margin:4px 0 0;font-size:13px;color:${BRAND.textSecondary};">
          ${escapeHtml(job.company_name)}
        </p>
        <p style="margin:12px 0 0;">
          <span style="display:inline-block;background:${badgeBg};color:${accent};font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;">
            ${escapeHtml(urgency.badge)} &middot; ${escapeHtml(formatDeadlineDate(job.deadline))}
          </span>
        </p>
      </td>
    </tr>
  </table>`;
}

export function buildDeadlineEmail(jobs: ReminderJob[], recipientName?: string | null) {
  const soonest = jobs.reduce((min, j) => Math.min(min, j.daysLeft), Number.POSITIVE_INFINITY);
  const tone = urgencyCopy(Number.isFinite(soonest) ? soonest : 0);
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : 'Hi,';

  const subject =
    soonest <= 1
      ? `⏰ ${jobs.length} application${jobs.length === 1 ? '' : 's'} closing soon`
      : `⏰ ${jobs.length} application${jobs.length === 1 ? '' : 's'} due in ${soonest} days`;

  const html = shell(`
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;">
      ${greeting}
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
      Your job hunt deadline${
        jobs.length === 1 ? ' is' : 's are'
      } coming up. Grab your saved resume bullets and cover letter so you are not writing from scratch at the last minute.
    </p>
    ${jobs.map((job) => jobRow(job, tone.accent, tone.badgeBg)).join('')}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;">
      <tr>
        <td style="border-radius:12px;background:${tone.accent};">
          <a href="${appUrl()}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">
            Open Huntern
          </a>
        </td>
      </tr>
    </table>
  `);

  return { subject, html };
}

export function buildPreviewEmail(recipient: string) {
  const sample: ReminderJob[] = [
    {
      position_title: 'Frontend Engineering Intern',
      company_name: 'Example Labs',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      daysLeft: 2,
    },
  ];
  const { subject, html } = buildDeadlineEmail(sample);
  return { to: recipient, subject, html };
}

export async function sendDeadlineEmail(
  to: string,
  jobs: ReminderJob[],
  recipientName?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not configured' };

  const { subject, html } = buildDeadlineEmail(jobs, recipientName);
  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? 'Huntern <onboarding@resend.dev>';
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email send failed' };
  }
}
