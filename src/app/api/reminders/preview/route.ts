import { buildPreviewEmail } from '@/lib/email';

// Dev helper: renders the reminder email with sample data so the HTML can be
// inspected without waiting for a real deadline to land in the cron window.
export async function GET() {
  const preview = buildPreviewEmail('you@example.com');
  return new Response(preview.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
