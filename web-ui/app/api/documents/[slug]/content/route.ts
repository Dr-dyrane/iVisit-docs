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
        const content = doc.content || resolveContent(doc.file_path, slug);
        return NextResponse.json({ content, title: doc.title });
    }

    // 3. All other docs require authentication
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 4. Check admin bypass — admins see everything
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const isEmailAdmin = adminEmails.includes(user.email?.toLowerCase() || '');

    const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    const isAdmin = isEmailAdmin || userRole?.role === 'admin';

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
    const content = doc.content || resolveContent(doc.file_path, slug);
    if (!content) {
        return NextResponse.json({ error: 'Content not available' }, { status: 404 });
    }

    return NextResponse.json({ content, title: doc.title });
}

/**
 * Resolve content from disk using multiple strategies:
 * 1. Exact file_path from DB
 * 2. Slug-based fuzzy match against docs/ directory
 */
function resolveContent(filePath: string | null, slug: string): string | null {
    const docsDir = path.join(process.cwd(), 'docs');

    // Strategy 1: exact file path from DB
    if (filePath) {
        const exact = readFile(path.join(docsDir, filePath));
        if (exact) return exact;
    }

    // Strategy 2: slug-based fuzzy match
    // Convert slug like "master-plan" to keywords ["master", "plan"]
    const keywords = slug.toLowerCase().split('-').filter(k => k.length > 2);

    try {
        const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

        // Score each file by how many slug keywords appear in its name
        let bestFile: string | null = null;
        let bestScore = 0;

        for (const file of files) {
            const lower = file.toLowerCase();
            const score = keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
            if (score > bestScore) {
                bestScore = score;
                bestFile = file;
            }
        }

        if (bestFile && bestScore >= Math.max(1, keywords.length * 0.5)) {
            return readFile(path.join(docsDir, bestFile));
        }
    } catch {
        // docs directory may not exist
    }

    return null;
}

function readFile(fullPath: string): string | null {
    try {
        return fs.readFileSync(fullPath, 'utf-8');
    } catch {
        return null;
    }
}
