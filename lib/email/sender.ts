import 'server-only';
import { Resend } from 'resend';
import { env } from '@/lib/env';

/**
 * Resend email wrapper with a "hybrid" fallback: if RESEND_API_KEY
 * and RESEND_FROM_EMAIL aren't both set, `sendInviteEmail()` returns
 * { sent: false } without erroring. The admin panel can then fall
 * back to showing a copy-link for manual delivery.
 *
 * This means the app ships and works with or without email
 * configured — email becomes a drop-in upgrade via env vars alone.
 */

type SendResult = { sent: boolean; error?: string };

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!env.isEmailConfigured) return null;
  if (client) return client;
  client = new Resend(env.resendApiKey!);
  return client;
}

type InviteEmailInput = {
  toEmail: string;
  inviteUrl: string;
  inviterDisplayName: string;
  expiresAt: number;
};

export async function sendInviteEmail(input: InviteEmailInput): Promise<SendResult> {
  const resend = getClient();
  if (!resend) {
    // Email is not configured. Caller should fall back to the manual
    // copy-link flow — this is a valid, expected state, not an error.
    return { sent: false };
  }

  const fromEmail = env.resendFromEmail!;
  const expiryHuman = new Date(input.expiresAt).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  try {
    const { error } = await resend.emails.send({
      from: `Pizza Week Planner <${fromEmail}>`,
      to: input.toEmail,
      subject: `${input.inviterDisplayName} invited you to Pizza Week Planner`,
      text: buildInvitePlainText(input, expiryHuman),
      html: buildInviteHtml(input, expiryHuman),
    });

    if (error) {
      console.error('[email] Resend send error:', error);
      return { sent: false, error: error.message ?? 'Unknown error' };
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[email] send threw:', message);
    return { sent: false, error: message };
  }
}

/* -------------------------------------------------------------------------
   Email templates — kept intentionally minimal because everything fun
   lives in the app itself. Plain HTML, no external CSS, inline only.
   ------------------------------------------------------------------------- */

function buildInvitePlainText(
  { inviterDisplayName, inviteUrl }: InviteEmailInput,
  expiryHuman: string,
): string {
  return [
    `${inviterDisplayName} invited you to join their Pizza Week Planner crew.`,
    '',
    'Portland Pizza Week 2026 runs Apr 20–26. This is a private app for planning which pizzas to hit and saving biking routes between them.',
    '',
    'Click the link below to set up your account:',
    '',
    inviteUrl,
    '',
    `This invite expires on ${expiryHuman} (Pacific time).`,
    '',
    '— The Pizza Week Planner',
  ].join('\n');
}

function buildInviteHtml(
  { inviterDisplayName, inviteUrl }: InviteEmailInput,
  expiryHuman: string,
): string {
  // Newsprint cream / ink / sauce-red palette to match the app.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>You're invited to Pizza Week Planner</title>
</head>
<body style="margin:0;padding:24px;background:#f1ebdb;font-family:'Bodoni Moda','Didot','Times New Roman',serif;color:#161413;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:480px;margin:0 auto;">
    <tr><td>
      <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#3a3530;">
        Pressroom Bulletin &middot; For Your Eyes Only
      </div>
      <div style="height:3px;background:#161413;margin:12px 0;"></div>
      <h1 style="margin:0;font-size:56px;line-height:0.88;font-weight:900;letter-spacing:-0.02em;">
        You&rsquo;re <span style="color:#b32113;font-style:italic;">Invited</span>
      </h1>
      <div style="height:3px;background:#161413;margin:12px 0;"></div>
      <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#3a3530;">
        Portland &middot; Apr 20&mdash;26 &middot; 2026
      </div>

      <p style="font-size:17px;line-height:1.55;color:#3a3530;margin:28px 0 18px;">
        <strong style="color:#161413;">${escapeHtml(inviterDisplayName)}</strong> invited you to join their Pizza Week Planner crew &mdash; a private app for mapping which pizzas to hit during the Portland Mercury&rsquo;s Pizza Week and saving biking routes between them.
      </p>

      <div style="border:2.5px dashed #161413;background:rgba(241,235,219,0.4);padding:20px;">
        <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;border-bottom:2px solid #161413;padding-bottom:8px;margin-bottom:16px;">
          &#9660; Your Invite
        </div>
        <a href="${inviteUrl}" style="display:block;background:#161413;color:#f1ebdb;text-decoration:none;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;letter-spacing:0.18em;font-weight:700;text-transform:uppercase;padding:18px 20px;text-align:center;border:2px solid #161413;">
          Claim Your Account &rarr;
        </a>
        <p style="margin:16px 0 0;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:#75695e;line-height:1.5;">
          If the button doesn&rsquo;t work, copy this URL into your browser:<br />
          <span style="color:#3a3530;word-break:break-all;">${escapeHtml(inviteUrl)}</span>
        </p>
      </div>

      <p style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#75695e;margin:20px 0 0;">
        Expires ${expiryHuman} (Pacific)
      </p>

      <div style="height:2px;background:#161413;margin:24px 0 12px;"></div>
      <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#3a3530;display:flex;justify-content:space-between;">
        <span>Printed in PDX</span>
        <span>&sect; 2026</span>
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
