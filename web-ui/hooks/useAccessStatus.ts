'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { RealtimeChannel } from '@supabase/supabase-js';

type AccessStatus = 'none' | 'pending' | 'approved' | 'revoked';

interface AccessState {
    status: AccessStatus;
    ndaSignedAt: string | null;
    loading: boolean;
}

export function useAccessStatus(documentId: string | null, userId: string | null): AccessState {
    const [status, setStatus] = useState<AccessStatus>('none');
    const [ndaSignedAt, setNdaSignedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Fetch initial status
    const fetchStatus = useCallback(async () => {
        if (!documentId || !userId) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('access_requests')
            .select('status, nda_signed_at')
            .eq('document_id', documentId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching access status:', error);
            setLoading(false);
            return;
        }

        if (data) {
            setStatus(data.status as AccessStatus);
            setNdaSignedAt(data.nda_signed_at);
        } else {
            setStatus('none');
        }
        setLoading(false);
    }, [documentId, userId, supabase]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Subscribe to realtime changes
    useEffect(() => {
        if (!documentId || !userId) return;

        const channel: RealtimeChannel = supabase
            .channel(`access-${documentId}-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'access_requests',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const record = payload.new as any;
                    if (record && record.document_id === documentId) {
                        setStatus(record.status as AccessStatus);
                        setNdaSignedAt(record.nda_signed_at);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [documentId, userId, supabase]);

    return { status, ndaSignedAt, loading };
}
