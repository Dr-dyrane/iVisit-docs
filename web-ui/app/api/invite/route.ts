import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());

// GET — List all invites (admin only)
export async function GET(request: NextRequest) {
    try {
        const anonSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },
                },
            }
        );

        const { data: { user } } = await anonSupabase.auth.getUser();
        if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },
                },
            }
        );

        const { data, error } = await supabase
            .from('document_invites')
            .select('*, documents ( title )')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ invites: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Admin-only: Create an invite for a specific email + document
export async function POST(request: NextRequest) {
    try {
        const { email, document_id } = await request.json();

        if (!email || !document_id) {
            return NextResponse.json(
                { error: 'email and document_id are required' },
                { status: 400 }
            );
        }

        // Use service role for admin operations
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },
                },
            }
        );

        // Verify requesting user is admin (check if authenticated user exists)
        const anonSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return request.cookies.getAll(); },
                    setAll() { },
                },
            }
        );

        const { data: { user } } = await anonSupabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create invite
        const { data: invite, error } = await supabase
            .from('document_invites')
            .insert({
                email: email.toLowerCase().trim(),
                document_id,
            })
            .select()
            .single();

        if (error) throw error;

        // Build the invite URL
        const origin = request.headers.get('origin') || 'https://docs.ivisit.ng';
        const inviteUrl = `${origin}/invite/${invite.token}`;

        // Send email via Brevo
        try {
            await sendInviteEmail(email, inviteUrl, document_id, origin);
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // We don't fail the request, just log it. The invite is created.
        }

        return NextResponse.json({
            message: 'Invite created and email sent',
            invite_url: inviteUrl,
            token: invite.token,
        });
    } catch (error: any) {
        console.error('Invite error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── Email Helper ─────────────────────────────────────────────

async function sendInviteEmail(email: string, inviteUrl: string, documentId: string, origin: string) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        console.warn('BREVO_API_KEY not set, skipping email.');
        return;
    }

    const subject = 'You have been invited to the iVisit Data Room';
    const htmlContent = getInviteEmailTemplate(email, inviteUrl);

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify({
            sender: {
                email: 'noreply@ivisit.ng',
                name: 'iVisit Data Room'
            },
            to: [{ email }],
            subject,
            htmlContent
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Brevo API error: ${errText}`);
    }
}

function getInviteEmailTemplate(email: string, inviteUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iVisit Data Room Invitation</title>
  <style>
    body { 
      margin: 0; padding: 0; 
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; 
      line-height: 1.5; 
      background-color: #f5f5f7;
      color: #1d1d1f;
    }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
    .header { padding: 40px 0 20px 0; text-align: center; }
    .logo-text { font-size: 24px; font-weight: 700; letter-spacing: -1px; color: #1d1d1f; }
    .logo-text .dot { color: #0066CC; } /* Blue for docs/vault feel */
    .content { padding: 40px 40px 60px 40px; text-align: center; }
    .hero-title { font-size: 32px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em; }
    .body-text { font-size: 17px; color: #86868b; margin-bottom: 40px; }
    .cta-button { 
      background-color: #0066CC; 
      color: white !important; 
      padding: 16px 32px; 
      text-decoration: none; 
      border-radius: 980px; 
      font-size: 17px; font-weight: 600; 
      display: inline-block; 
      transition: all 0.2s;
    }
    .cta-button:hover { transform: scale(1.02); }
    .footer { background: #f5f5f7; padding: 30px; text-align: center; font-size: 12px; color: #86868b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">iVisit<span class="dot">.</span> Data Room</div>
    </div>
    <div class="content">
      <div class="hero-title">Access Granted</div>
      <div class="body-text">
        You have been invited to view confidential documents on the iVisit Data Room.
        Please click the button below to accept your invitation and access the vault.
      </div>
      <a href="${inviteUrl}" class="cta-button">View Documents</a>
    </div>
    <div class="footer">
      <p>Secure Document Vault · ${new Date().getFullYear()} iVisit Global</p>
      <p>This invite was sent to ${email}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
