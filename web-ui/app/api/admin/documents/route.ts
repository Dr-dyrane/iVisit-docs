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

// GET — List all documents (admin view)
export async function GET() {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = await getAdminSupabase();
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data || [] });
}

// POST — Create a new document
export async function POST(request: Request) {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { slug, title, description, tier, visibility, content, icon, file_path } = body;

    if (!slug || !title) {
        return NextResponse.json({ error: 'slug and title are required' }, { status: 400 });
    }

    const supabase = await getAdminSupabase();
    const { data, error } = await supabase
        .from('documents')
        .insert({
            slug,
            title,
            description: description || '',
            tier: tier || 'confidential',
            visibility: visibility || ['admin'],
            content: content || null,
            icon: icon || 'file-text',
            file_path: file_path || `${slug}.md`,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data }, { status: 201 });
}

// PUT — Update a document
export async function PUT(request: Request) {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: 'Document id is required' }, { status: 400 });
    }

    const supabase = await getAdminSupabase();
    const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ document: data });
}

// DELETE — Delete a document
export async function DELETE(request: Request) {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Document id is required' }, { status: 400 });
    }

    const supabase = await getAdminSupabase();
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
