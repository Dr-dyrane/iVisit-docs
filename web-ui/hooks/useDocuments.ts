'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Document {
    id: string;
    slug: string;
    title: string;
    description: string;
    tier: string;
    file_path: string;
    icon: string;
    accessStatus?: 'none' | 'pending' | 'approved' | 'revoked';
}

export function useDocuments() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchDocuments() {
            const { data: { user } } = await supabase.auth.getUser();

            // Fetch all documents
            const { data: docs, error: docsError } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: true });

            if (docsError || !docs) {
                console.error('Error fetching documents:', docsError);
                setLoading(false);
                return;
            }

            // If authenticated, fetch user's access requests
            if (user) {
                const { data: requests } = await supabase
                    .from('access_requests')
                    .select('document_id, status')
                    .eq('user_id', user.id);

                const requestMap = new Map(
                    (requests || []).map((r) => [r.document_id, r.status])
                );

                setDocuments(
                    docs.map((doc) => ({
                        ...doc,
                        accessStatus: (requestMap.get(doc.id) as Document['accessStatus']) || 'none',
                    }))
                );
            } else {
                setDocuments(docs.map((doc) => ({ ...doc, accessStatus: 'none' as const })));
            }

            setLoading(false);
        }

        fetchDocuments();
    }, []);

    return { documents, loading };
}
