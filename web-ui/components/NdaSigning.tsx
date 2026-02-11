'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase-browser';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NdaSigningProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    documentId: string;
    ndaContent: string;
}

export function NdaSigning({
    isOpen,
    onClose,
    onSuccess,
    documentId,
    ndaContent,
}: NdaSigningProps) {
    const { user } = useAuth();
    const supabase = createClient();

    // Progressive step state
    const [step, setStep] = useState<'read' | 'sign' | 'submitting' | 'done'>('read');
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [signerName, setSignerName] = useState(user?.user_metadata?.full_name || '');
    const [signerEntity, setSignerEntity] = useState('');
    const [signerTitle, setSignerTitle] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Track scroll position
    const handleScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (nearBottom) setHasScrolledToBottom(true);
    }, []);

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setStep('read');
            setHasScrolledToBottom(false);
            setSignerName(user?.user_metadata?.full_name || '');
            setSignerEntity('');
            setSignerTitle('');
        }
    }, [isOpen, user]);

    const handleSubmit = async () => {
        if (!user || !signerName.trim()) return;

        setStep('submitting');

        try {
            const { error } = await supabase
                .from('access_requests')
                .upsert({
                    user_id: user.id,
                    document_id: documentId,
                    status: 'pending',
                    nda_signed_at: new Date().toISOString(),
                    signer_name: signerName.trim(),
                    signer_entity: signerEntity.trim() || null,
                    signer_title: signerTitle.trim() || null,
                }, {
                    onConflict: 'user_id,document_id',
                });

            if (error) throw error;

            setStep('done');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            console.error('NDA signing error:', err);
            setStep('sign');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="overlay fixed inset-0 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                       w-[95%] max-w-[700px] max-h-[85vh] z-50
                       glass rounded-glass-xl flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="px-8 pt-8 pb-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-lg font-heading font-bold text-foreground">
                                    Non-Disclosure Agreement
                                </h2>
                                <p className="text-xs text-foreground/30 font-mono">
                                    NDA-2026-EXTERNAL · BINDING LEGAL AGREEMENT
                                </p>
                            </div>
                        </div>

                        {/* Step: Read */}
                        {(step === 'read' || step === 'sign') && (
                            <>
                                {step === 'read' && (
                                    <div
                                        ref={scrollRef}
                                        onScroll={handleScroll}
                                        className="flex-1 overflow-y-auto px-8 py-4"
                                    >
                                        <div className="prose prose-sm prose-vault max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {ndaContent}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Step: Sign (progressive disclosure) */}
                                {step === 'sign' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                        className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
                                    >
                                        <p className="text-sm text-foreground/50">
                                            By signing below, you acknowledge that you have read and agree to the terms of this Mutual Non-Disclosure Agreement.
                                        </p>

                                        {/* Focused input — one at a time feel */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs text-foreground/30 font-mono uppercase tracking-wider mb-2">
                                                    Full Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={signerName}
                                                    onChange={(e) => setSignerName(e.target.value)}
                                                    placeholder="Your legal name"
                                                    className="w-full px-5 py-4 rounded-2xl bg-foreground/[0.04] text-foreground text-sm
                                     placeholder:text-foreground/20 outline-none
                                     transition-all duration-base ease-glide
                                     focus:bg-foreground/[0.07] focus:shadow-lg"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="opacity-80">
                                                <label className="block text-xs text-foreground/30 font-mono uppercase tracking-wider mb-2">
                                                    Entity / Organization
                                                </label>
                                                <input
                                                    type="text"
                                                    value={signerEntity}
                                                    onChange={(e) => setSignerEntity(e.target.value)}
                                                    placeholder="Optional"
                                                    className="w-full px-5 py-4 rounded-2xl bg-foreground/[0.04] text-foreground text-sm
                                     placeholder:text-foreground/20 outline-none
                                     transition-all duration-base ease-glide
                                     focus:bg-foreground/[0.07] focus:shadow-lg focus:opacity-100"
                                                />
                                            </div>

                                            <div className="opacity-80">
                                                <label className="block text-xs text-foreground/30 font-mono uppercase tracking-wider mb-2">
                                                    Title
                                                </label>
                                                <input
                                                    type="text"
                                                    value={signerTitle}
                                                    onChange={(e) => setSignerTitle(e.target.value)}
                                                    placeholder="Optional"
                                                    className="w-full px-5 py-4 rounded-2xl bg-foreground/[0.04] text-foreground text-sm
                                     placeholder:text-foreground/20 outline-none
                                     transition-all duration-base ease-glide
                                     focus:bg-foreground/[0.07] focus:shadow-lg focus:opacity-100"
                                                />
                                            </div>
                                        </div>

                                        <div className="text-xs text-foreground/20 font-mono">
                                            <p>Electronic signature accepted under Nigerian law.</p>
                                            <p>Date: {new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Footer Actions */}
                                <div className="px-8 py-6 flex items-center justify-between">
                                    <button
                                        onClick={step === 'sign' ? () => setStep('read') : onClose}
                                        className="text-sm text-foreground/30 hover:text-foreground/50 transition-colors duration-base"
                                    >
                                        {step === 'sign' ? 'Back' : 'Cancel'}
                                    </button>

                                    {step === 'read' ? (
                                        <button
                                            onClick={() => setStep('sign')}
                                            disabled={!hasScrolledToBottom}
                                            className={`btn-glass px-8 py-3 text-sm font-medium
                                  ${hasScrolledToBottom
                                                    ? 'text-foreground/90'
                                                    : 'text-foreground/20 cursor-not-allowed opacity-50'
                                                }`}
                                        >
                                            {hasScrolledToBottom ? (
                                                <>Proceed to Sign</>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    Scroll to Continue
                                                    <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                                                </span>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!signerName.trim()}
                                            className={`btn-primary px-8 py-3 text-sm
                                  ${!signerName.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            Sign & Request Access
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Step: Submitting */}
                        {step === 'submitting' && (
                            <div className="flex-1 flex items-center justify-center py-20">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 text-foreground/30 animate-spin mx-auto mb-4" />
                                    <p className="text-sm text-foreground/40">Signing agreement…</p>
                                </div>
                            </div>
                        )}

                        {/* Step: Done */}
                        {step === 'done' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                                className="flex-1 flex items-center justify-center py-20"
                            >
                                <div className="text-center">
                                    <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-6 h-6 text-green-400" />
                                    </div>
                                    <p className="text-foreground font-heading font-semibold mb-1">NDA Signed</p>
                                    <p className="text-sm text-foreground/40">Access request submitted for review.</p>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
