'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccessStatus } from '@/hooks/useAccessStatus';
import { NdaSigning } from '@/components/NdaSigning';
import { motion } from 'framer-motion';
import { Lock, Clock, Shield, Loader2 } from 'lucide-react';

interface AccessGateProps {
    children: React.ReactNode;
    documentId: string;
    ndaContent: string;
}

export function AccessGate({ children, documentId, ndaContent }: AccessGateProps) {
    const { user } = useAuth();
    const { status, loading } = useAccessStatus(documentId, user?.id ?? null);
    const [ndaOpen, setNdaOpen] = useState(false);

    // Loading — calm
    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 text-white/20 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-white/20 font-mono">Checking access…</p>
                </div>
            </div>
        );
    }

    // Approved — render content
    if (status === 'approved') {
        return <>{children}</>;
    }

    // Pending — calm waiting state
    if (status === 'pending') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center justify-center py-40"
            >
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/[0.06] flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
                        <Clock className="w-7 h-7 text-yellow-400/60" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-white mb-2">
                        Awaiting Approval
                    </h3>
                    <p className="text-sm text-white/35 leading-relaxed mb-3">
                        Your NDA has been signed and your access request is pending review.
                        You&apos;ll see the document the moment it&apos;s approved — no refresh needed.
                    </p>
                    <p className="text-[11px] text-white/15 font-mono">
                        REALTIME · AUTO-UNLOCK ON APPROVAL
                    </p>
                </div>
            </motion.div>
        );
    }

    // No access — show request CTA
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center justify-center py-40"
        >
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-7 h-7 text-white/25" />
                </div>
                <h3 className="text-lg font-heading font-semibold text-white mb-2">
                    Access Required
                </h3>
                <p className="text-sm text-white/35 leading-relaxed mb-8">
                    Sign the Non-Disclosure Agreement to request access to this document.
                </p>
                <button
                    onClick={() => setNdaOpen(true)}
                    className="btn-primary"
                >
                    <Shield className="w-4 h-4 mr-2 inline" />
                    Sign NDA & Request Access
                </button>
            </div>

            <NdaSigning
                isOpen={ndaOpen}
                onClose={() => setNdaOpen(false)}
                onSuccess={() => setNdaOpen(false)}
                documentId={documentId}
                ndaContent={ndaContent}
            />
        </motion.div>
    );
}
