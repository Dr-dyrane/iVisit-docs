import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());

async function getAdminSupabase() {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); } catch { }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }); } catch { }
                },
            },
        }
    );
}

async function getAuthenticatedAdmin() {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); } catch { }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }); } catch { }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        return null;
    }
    return user;
}

// GET — List all access requests with user emails
export async function GET() {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = await getAdminSupabase();
    const { data, error } = await supabase
        .from('access_requests')
        .select(`
      id, status, nda_signed_at, signer_name, signer_entity, signer_title, created_at, updated_at,
      user_id,
      documents ( id, slug, title, tier )
    `)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user emails via service role
    const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id)));
    const emailMap: Record<string, string> = {};

    for (const uid of userIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(uid);
        if (userData?.user) {
            emailMap[uid] = userData.user.email || 'unknown';
        }
    }

    const enriched = (data || []).map((r: any) => ({
        ...r,
        user_email: emailMap[r.user_id] || 'unknown',
    }));

    return NextResponse.json({ requests: enriched });
}

// PATCH — Approve or revoke an access request
export async function PATCH(request: Request) {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !['approved', 'revoked'].includes(status)) {
        return NextResponse.json({ error: 'Invalid requestId or status' }, { status: 400 });
    }

    const supabase = await getAdminSupabase();
    const { data, error } = await supabase
        .from('access_requests')
        .update({ status })
        .eq('id', requestId)
        .select();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data?.[0] || null });
}
