'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase-browser';
import { NdaSigning } from '@/components/NdaSigning';
import { motion } from 'framer-motion';
import { Shield, Loader2, Check, AlertCircle } from 'lucide-react';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;
    const { user, signInWithGoogle, loading: authLoading } = useAuth();
    const supabase = createClient();

    const [invite, setInvite] = useState<any>(null);
    const [document, setDocument] = useState<any>(null);
    const [ndaContent, setNdaContent] = useState('');
    const [ndaOpen, setNdaOpen] = useState(false);
    const [state, setState] = useState<'loading' | 'auth' | 'nda' | 'claiming' | 'done' | 'error' | 'expired'>('loading');

    // Load invite data
    useEffect(() => {
        async function loadInvite() {
            const { data, error } = await supabase
                .from('document_invites')
                .select('*, documents(*)')
                .eq('token', token)
                .single();

            if (error || !data) {
                setState('error');
                return;
            }

            if (data.claimed || new Date(data.expires_at) < new Date()) {
                setState('expired');
                return;
            }

            setInvite(data);
            setDocument(data.documents);

            // Load NDA content
            try {
                const res = await fetch('/api/documents/mutual-nda/content');
                if (res.ok) {
                    const ndaData = await res.json();
                    setNdaContent(ndaData.content);
                }
            } catch { }

            // Check auth state
            if (!user && !authLoading) {
                setState('auth');
            } else if (user) {
                setState('nda');
            }
        }

        if (token) loadInvite();
    }, [token, user, authLoading]);

    // When user signs in, move to NDA step
    useEffect(() => {
        if (user && invite && state === 'auth') {
            setState('nda');
        }
    }, [user, invite, state]);

    const handleNdaSuccess = async () => {
        setState('claiming');
        try {
            // Claim the invite
            const { error: claimError } = await supabase
                .from('document_invites')
                .update({ claimed: true, claimed_by: user!.id })
                .eq('token', token);

            if (claimError) throw claimError;

            setState('done');
            setTimeout(() => {
                router.push(`/docs/${document.slug}`);
            }, 2000);
        } catch (err) {
            console.error('Claim error:', err);
            setState('error');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="glass rounded-glass-xl p-10 text-center">

                    {/* Loading */}
                    {state === 'loading' && (
                        <div className="py-8">
                            <Loader2 className="w-8 h-8 text-white/20 animate-spin mx-auto" />
                        </div>
                    )}

                    {/* Auth required */}
                    {state === 'auth' && document && (
                        <>
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-6 h-6 text-accent" />
                            </div>
                            <h2 className="text-xl font-heading font-bold text-white mb-2">
                                You&apos;ve Been Invited
                            </h2>
                            <p className="text-sm text-white/40 mb-2">
                                Access to:
                            </p>
                            <p className="text-base font-heading text-white/80 mb-8">
                                {document.title}
                            </p>
                            <button
                                onClick={signInWithGoogle}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4
                           rounded-full bg-white/[0.05] backdrop-blur-sm
                           text-white/90 text-sm font-medium
                           transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)]
                           hover:bg-white/[0.09] hover:scale-[1.02]
                           active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Sign in to Accept Invite
                            </button>
                        </>
                    )}

                    {/* NDA step */}
                    {state === 'nda' && document && (
                        <>
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-6 h-6 text-accent" />
                            </div>
                            <h2 className="text-xl font-heading font-bold text-white mb-2">
                                Sign NDA to Continue
                            </h2>
                            <p className="text-sm text-white/40 mb-8">
                                To access &quot;{document.title}&quot;, you must sign our Non-Disclosure Agreement.
                            </p>
                            <button
                                onClick={() => setNdaOpen(true)}
                                className="btn-primary w-full"
                            >
                                Review & Sign NDA
                            </button>
                        </>
                    )}

                    {/* Claiming */}
                    {state === 'claiming' && (
                        <div className="py-8">
                            <Loader2 className="w-8 h-8 text-white/20 animate-spin mx-auto mb-4" />
                            <p className="text-sm text-white/40">Claiming your access…</p>
                        </div>
                    )}

                    {/* Done */}
                    {state === 'done' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8"
                        >
                            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <Check className="w-6 h-6 text-green-400" />
                            </div>
                            <p className="text-white font-heading font-semibold mb-1">Access Granted</p>
                            <p className="text-sm text-white/40">Redirecting to document…</p>
                        </motion.div>
                    )}

                    {/* Error */}
                    {state === 'error' && (
                        <div className="py-8">
                            <AlertCircle className="w-8 h-8 text-accent mx-auto mb-4" />
                            <p className="text-white font-heading font-semibold mb-2">Invalid Invite</p>
                            <p className="text-sm text-white/40">This invite link is invalid or has expired.</p>
                        </div>
                    )}

                    {/* Expired */}
                    {state === 'expired' && (
                        <div className="py-8">
                            <AlertCircle className="w-8 h-8 text-white/30 mx-auto mb-4" />
                            <p className="text-white font-heading font-semibold mb-2">Invite Expired</p>
                            <p className="text-sm text-white/40">This invite has already been claimed or has expired.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* NDA Modal */}
            {document && ndaContent && (
                <NdaSigning
                    isOpen={ndaOpen}
                    onClose={() => setNdaOpen(false)}
                    onSuccess={handleNdaSuccess}
                    documentId={document.id}
                    ndaContent={ndaContent}
                />
            )}
        </div>
    );
}
