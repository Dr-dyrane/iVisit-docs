'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase-browser';
import { DocumentViewer } from '@/components/DocumentViewer';
import { DocumentActions } from '@/components/DocumentActions';
import { AccessGate } from '@/components/AccessGate';
import { Loader2 } from 'lucide-react';

interface DocumentMeta {
    id: string;
    slug: string;
    title: string;
    description: string;
    tier: string;
    file_path: string;
}

export default function DocumentPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const { user } = useAuth();
    const supabase = createClient();

    const [doc, setDoc] = useState<DocumentMeta | null>(null);
    const [content, setContent] = useState<string>('');
    const [ndaContent, setNdaContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [accessApproved, setAccessApproved] = useState(false);

    // Load document metadata
    useEffect(() => {
        async function loadDoc() {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('slug', slug)
                .single();

            if (data) setDoc(data);
            setLoading(false);
        }
        if (slug) loadDoc();
    }, [slug]);

    // Load NDA for the access gate
    useEffect(() => {
        async function loadNda() {
            try {
                const res = await fetch('/api/documents/mutual-nda/content');
                if (res.ok) {
                    const data = await res.json();
                    setNdaContent(data.content);
                }
            } catch { }
        }
        loadNda();
    }, []);

    // Check access and load content
    useEffect(() => {
        async function checkAndLoad() {
            if (!doc || !user) return;

            const { data: access } = await supabase
                .from('access_requests')
                .select('status')
                .eq('document_id', doc.id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (access?.status === 'approved') {
                setAccessApproved(true);
                // Fetch content
                try {
                    const res = await fetch(`/api/documents/${slug}/content`);
                    if (res.ok) {
                        const data = await res.json();
                        setContent(data.content);
                    }
                } catch { }
            }
        }
        checkAndLoad();

        // Listen for realtime access changes
        if (!doc || !user) return;

        const channel = supabase
            .channel(`doc-access-${doc.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'access_requests',
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    const record = payload.new as any;
                    if (record?.document_id === doc.id && record?.status === 'approved') {
                        setAccessApproved(true);
                        // Fetch content now
                        try {
                            const res = await fetch(`/api/documents/${slug}/content`);
                            if (res.ok) {
                                const data = await res.json();
                                setContent(data.content);
                            }
                        } catch { }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [doc, user, slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="text-center">
                    <p className="text-lg font-heading text-white/60">Document not found</p>
                    <p className="text-sm text-white/25 mt-2 font-mono">Slug: {slug}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Sticky action bar */}
            <DocumentActions title={doc.title} tier={doc.tier} slug={slug} content={content} />

            {/* Access-gated content */}
            <div className="px-6 py-8 lg:px-12 lg:py-12">
                <AccessGate documentId={doc.id} ndaContent={ndaContent}>
                    {content ? (
                        <DocumentViewer content={content} title={doc.title} tier={doc.tier} />
                    ) : (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                        </div>
                    )}
                </AccessGate>
            </div>
        </div>
    );
}
