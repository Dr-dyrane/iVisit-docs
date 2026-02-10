import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

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

        return NextResponse.json({
            message: 'Invite created',
            invite_url: inviteUrl,
            token: invite.token,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
