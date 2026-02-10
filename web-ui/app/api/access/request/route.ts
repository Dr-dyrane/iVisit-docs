import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { document_id } = await request.json();

        if (!document_id) {
            return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
        }

        // Create server-side supabase client
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll() { },
                },
            }
        );

        // Get authed user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if already requested
        const { data: existing } = await supabase
            .from('access_requests')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('document_id', document_id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({
                message: 'Access request already exists',
                status: existing.status,
            });
        }

        // Create new access request (NDA should already be signed via NdaSigning component)
        const { data, error } = await supabase
            .from('access_requests')
            .insert({
                user_id: user.id,
                document_id: document_id,
                status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            message: 'Access request created',
            status: 'pending',
            request: data,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
