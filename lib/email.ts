import { Resend } from 'resend';

/**
 * Canonicalize an email address for duplicate detection.
 *
 * Gmail (and a few other providers) ignore dots and `+aliases` in the local
 * part — `me@gmail.com`, `m.e@gmail.com`, and `me+x@gmail.com` all deliver to
 * the same inbox. Without normalization, one person can keep spinning up
 * "new" accounts to claim the trial repeatedly.
 *
 * The result is used only for uniqueness checks and trial throttling. The
 * original email the user typed is still what we store, display, and send to.
 */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 0) return email;

  let local = email.slice(0, at);
  const domain = email.slice(at + 1);

  // Strip everything after `+` — the alias tag. Works for Gmail, Outlook,
  // FastMail, ProtonMail, iCloud, and most modern providers.
  const plus = local.indexOf('+');
  if (plus >= 0) local = local.slice(0, plus);

  // Gmail & Google Workspace ignore dots. Collapse googlemail.com -> gmail.com.
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    local = local.replace(/\./g, '');
    return `${local}@gmail.com`;
  }

  return `${local}@${domain}`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

export async function sendResetCode(email: string, code: string) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: 'MedStudy <onboarding@resend.dev>',
    to: email,
    subject: 'Your MedStudy password reset code',
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">MedStudy Password Reset</h2>
        <p>Your verification code is:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
}
