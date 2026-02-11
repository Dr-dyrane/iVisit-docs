import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    const slug = params.slug;

    // Create authenticated server client
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

    // 1. Get document metadata
    const { data: doc, error: docErr } = await supabase
        .from('documents')
        .select('id, slug, title, tier, file_path, content')
        .eq('slug', slug)
        .single();

    if (docErr || !doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 2. Public-tier documents (NDA) are accessible without auth
    if (doc.tier === 'public') {
        const content = doc.content || readFromDisk(doc.file_path);
        return NextResponse.json({ content, title: doc.title });
    }

    // 3. All other docs require authentication
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 4. Check admin bypass — admins see everything
    const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    const isAdmin = userRole?.role === 'admin';

    if (!isAdmin) {
        // 5. Check approved access for non-admin users
        const { data: access } = await supabase
            .from('access_requests')
            .select('status')
            .eq('document_id', doc.id)
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .maybeSingle();

        if (!access) {
            return NextResponse.json({ error: 'Access not approved' }, { status: 403 });
        }
    }

    // 6. Serve content — prefer DB content, fallback to disk
    const content = doc.content || readFromDisk(doc.file_path);
    if (!content) {
        return NextResponse.json({ error: 'Content not available' }, { status: 404 });
    }

    return NextResponse.json({ content, title: doc.title });
}

/** Fallback: read markdown from local docs/ directory */
function readFromDisk(filePath: string): string | null {
    try {
        const fullPath = path.join(process.cwd(), 'docs', filePath);
        return fs.readFileSync(fullPath, 'utf-8');
    } catch {
        return null;
    }
}
