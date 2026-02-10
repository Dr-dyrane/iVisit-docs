'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDocuments } from '@/hooks/useDocuments';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, FileText, Briefcase, Map, Printer,
    LogOut, ChevronLeft, ChevronRight, Home
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    'briefcase': Briefcase,
    'map': Map,
    'shield': Shield,
    'printer': Printer,
    'file-text': FileText,
};

interface VaultSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export function VaultSidebar({ collapsed, onToggle }: VaultSidebarProps) {
    const { user, signOut } = useAuth();
    const { documents } = useDocuments();
    const pathname = usePathname();

    return (
        <motion.nav
            initial={false}
            animate={{ width: collapsed ? 72 : 280 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="sidebar fixed left-0 top-0 h-screen z-40 flex flex-col py-6"
        >
            {/* Logo */}
            <div className="px-5 mb-8 flex items-center justify-between">
                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3"
                        >
                            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-sm font-heading font-bold text-white tracking-tight">
                                    iVisit
                                </h2>
                                <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
                                    Data Room
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={onToggle}
                    className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center
                     transition-all duration-base ease-glide hover:bg-white/[0.08]"
                >
                    {collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    ) : (
                        <ChevronLeft className="w-3.5 h-3.5 text-white/40" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 space-y-1 overflow-y-auto">
                {/* Home link */}
                <Link href="/">
                    <div
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl
                        transition-all duration-base ease-glide cursor-pointer
                        ${pathname === '/'
                                ? 'bg-white/[0.06] shadow-lg'
                                : 'hover:bg-white/[0.04]'
                            }`}
                    >
                        <Home className={`w-[18px] h-[18px] flex-shrink-0 ${pathname === '/' ? 'text-accent' : 'text-white/40'
                            }`} />
                        <AnimatePresence mode="wait">
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    className={`text-sm truncate ${pathname === '/' ? 'text-white font-medium' : 'text-white/50'
                                        }`}
                                >
                                    Vault
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </Link>

                {/* Divider */}
                <div className="h-px bg-white/[0.04] mx-2 my-3" />

                {/* Document links */}
                <div className="space-y-0.5">
                    {!collapsed && (
                        <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest px-3 mb-2">
                            Documents
                        </p>
                    )}
                    {documents.map((doc, index) => {
                        const Icon = ICON_MAP[doc.icon] || FileText;
                        const isActive = pathname === `/docs/${doc.slug}`;

                        return (
                            <Link key={doc.id} href={`/docs/${doc.slug}`}>
                                <motion.div
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                        delay: index * 0.05,
                                        duration: 0.4,
                                        ease: [0.23, 1, 0.32, 1],
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
                              transition-all duration-base ease-glide cursor-pointer
                              ${isActive
                                            ? 'bg-white/[0.06] shadow-lg'
                                            : 'hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-accent' : 'text-white/30'
                                        }`} />
                                    <AnimatePresence mode="wait">
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -8 }}
                                                className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-white/50'
                                                    }`}
                                            >
                                                {doc.title.replace(/^iVisit\s+/, '').split(':')[0]}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* User Profile */}
            <div className="px-3 mt-4">
                <div className="h-px bg-white/[0.04] mx-2 mb-4" />
                <div className="flex items-center gap-3 px-3 py-2">
                    {user?.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full bg-white/5"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium text-white/50">
                            {user?.email?.[0]?.toUpperCase()}
                        </div>
                    )}
                    <AnimatePresence mode="wait">
                        {!collapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 min-w-0"
                            >
                                <p className="text-sm text-white/70 truncate">
                                    {user?.user_metadata?.full_name || user?.email}
                                </p>
                                <p className="text-[10px] text-white/25 font-mono truncate">
                                    {user?.email}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={signOut}
                        className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center
                       hover:bg-white/[0.06] transition-all duration-base ease-glide"
                        title="Sign Out"
                    >
                        <LogOut className="w-3.5 h-3.5 text-white/30" />
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}
