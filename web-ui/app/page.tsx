'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDocuments } from '@/hooks/useDocuments';
import { NdaSigning } from '@/components/NdaSigning';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase-browser';
import {
    Shield, Lock, Unlock, Clock, Briefcase, Map, Printer, FileText, ArrowRight
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    'briefcase': Briefcase,
    'map': Map,
    'shield': Shield,
    'printer': Printer,
    'file-text': FileText,
};

const STATUS_CONFIG = {
    none: { label: 'Locked', icon: Lock, badge: 'badge-locked' },
    pending: { label: 'Pending', icon: Clock, badge: 'badge-pending' },
    approved: { label: 'Unlocked', icon: Unlock, badge: 'badge-approved' },
    revoked: { label: 'Revoked', icon: Lock, badge: 'badge-locked' },
};

const TIER_LABELS: Record<string, string> = {
    public: 'Public',
    confidential: 'Confidential',
    restricted: 'Restricted',
};

export default function VaultPage() {
    const { user } = useAuth();
    const { documents, loading } = useDocuments();

    const [ndaOpen, setNdaOpen] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [ndaContent, setNdaContent] = useState('');
    const [ndaDocId, setNdaDocId] = useState<string | null>(null);

    // Load NDA content once
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

    // Find the NDA document ID
    useEffect(() => {
        const ndaDoc = documents.find((d) => d.slug === 'mutual-nda');
        if (ndaDoc) setNdaDocId(ndaDoc.id);
    }, [documents]);

    const handleDocClick = (doc: any) => {
        if (doc.accessStatus === 'approved') {
            // Already approved — navigate directly
            window.location.href = `/docs/${doc.slug}`;
            return;
        }
        // Need to sign NDA first
        setSelectedDocId(doc.id);
        setNdaOpen(true);
    };

    const handleNdaSuccess = () => {
        setNdaOpen(false);
        // Refetch documents to update status
        window.location.reload();
    };

    return (
        <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12 max-w-6xl mx-auto">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="mb-16"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs text-white/30 font-mono uppercase tracking-[0.2em]">
                        Secure Intelligence Portal
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-heading font-bold text-white tracking-tight leading-[1.1] mb-4">
                    The Vault
                </h1>
                <p className="text-base text-white/35 max-w-lg leading-relaxed">
                    Confidential documents, strategic proposals, and technical blueprints.
                    Sign the NDA to request access.
                </p>
            </motion.div>

            {/* Document Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass rounded-glass-lg p-8 animate-pulse h-48" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc, index) => {
                        const Icon = ICON_MAP[doc.icon] || FileText;
                        const status = STATUS_CONFIG[doc.accessStatus || 'none'];
                        const StatusIcon = status.icon;

                        return (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: index * 0.08,
                                    duration: 0.5,
                                    ease: [0.23, 1, 0.32, 1],
                                }}
                            >
                                <div
                                    onClick={() => handleDocClick(doc)}
                                    className="group glass-hover rounded-glass-lg p-8 cursor-pointer
                             relative overflow-hidden"
                                >
                                    {/* Background accent glow for approved docs */}
                                    {doc.accessStatus === 'approved' && (
                                        <div className="absolute inset-0 bg-green-500/[0.02] pointer-events-none" />
                                    )}

                                    {/* Top row: icon + badges */}
                                    <div className="flex items-start justify-between mb-5">
                                        <div className="w-11 h-11 rounded-2xl bg-white/[0.04] flex items-center justify-center
                                    group-hover:bg-white/[0.07] transition-all duration-base ease-glide">
                                            <Icon className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`badge ${status.badge}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {status.label}
                                            </span>
                                            <span className="badge badge-confidential">
                                                {TIER_LABELS[doc.tier] || doc.tier}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title & description */}
                                    <h3 className="text-base font-heading font-semibold text-white mb-2 tracking-tight
                                 group-hover:text-white transition-colors">
                                        {doc.title}
                                    </h3>
                                    <p className="text-sm text-white/30 leading-relaxed line-clamp-2 mb-6">
                                        {doc.description}
                                    </p>

                                    {/* Action hint */}
                                    <div className="flex items-center gap-2 text-xs text-white/20
                                  group-hover:text-white/40 transition-colors">
                                        {doc.accessStatus === 'approved' ? (
                                            <>
                                                <span>Open Document</span>
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-base ease-glide" />
                                            </>
                                        ) : doc.accessStatus === 'pending' ? (
                                            <span className="font-mono">Awaiting admin approval…</span>
                                        ) : (
                                            <span>Sign NDA to request access →</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* NDA Modal */}
            {selectedDocId && ndaContent && (
                <NdaSigning
                    isOpen={ndaOpen}
                    onClose={() => setNdaOpen(false)}
                    onSuccess={handleNdaSuccess}
                    documentId={selectedDocId}
                    ndaContent={ndaContent}
                />
            )}

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-20 text-center"
            >
                <p className="text-[11px] text-white/15 font-mono tracking-wider">
                    iVisit Intelligence Collective · {new Date().getFullYear()} · All Rights Reserved
                </p>
            </motion.div>
        </div>
    );
}
