import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetCode(email: string, code: string) {
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
