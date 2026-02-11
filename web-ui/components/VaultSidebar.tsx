'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDocuments } from '@/hooks/useDocuments';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, FileText, Briefcase, Map, Printer,
    LogOut, ChevronLeft, ChevronRight, Home, Settings
} from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

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
            {/* Logo + Controls */}
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
                                <h2 className="text-sm font-heading font-bold text-foreground tracking-tight">
                                    iVisit<span className="text-accent">.</span>
                                </h2>
                                <p className="text-[10px] text-foreground/30 font-mono tracking-widest uppercase">
                                    Data Room
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={onToggle}
                    className="w-8 h-8 rounded-lg bg-foreground/[0.04] flex items-center justify-center
                     transition-all duration-base ease-glide hover:bg-foreground/[0.08]"
                >
                    {collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
                    ) : (
                        <ChevronLeft className="w-3.5 h-3.5 text-foreground/40" />
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
                                ? 'bg-foreground/[0.06] shadow-lg'
                                : 'hover:bg-foreground/[0.04]'
                            }`}
                    >
                        <Home className={`w-[18px] h-[18px] flex-shrink-0 ${pathname === '/' ? 'text-accent' : 'text-foreground/40'
                            }`} />
                        <AnimatePresence mode="wait">
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    className={`text-sm truncate ${pathname === '/' ? 'text-foreground font-medium' : 'text-foreground/50'
                                        }`}
                                >
                                    Vault
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </div>
                </Link>

                {/* Divider */}
                <div className="h-px bg-foreground/[0.04] mx-2 my-3" />

                {/* Document links */}
                <div className="space-y-1.5">
                    {!collapsed && (
                        <p className="text-[10px] text-foreground/20 font-mono uppercase tracking-widest px-3 mb-2">
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
                              transition-all duration-base ease-glide cursor-pointer mt-2
                              ${isActive
                                            ? 'bg-foreground/[0.06] shadow-lg'
                                            : 'hover:bg-foreground/[0.04]'
                                        }`}
                                >
                                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-accent' : 'text-foreground/30'
                                        }`} />
                                    <AnimatePresence mode="wait">
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -8 }}
                                                className={`text-sm truncate ${isActive ? 'text-foreground font-medium' : 'text-foreground/50'
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

                {/* Admin Link */}
                {user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()) && (
                    <>
                        <div className="h-px bg-foreground/[0.04] mx-2 my-3" />
                        <Link href="/admin">
                            <div
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
                                transition-all duration-base ease-glide cursor-pointer
                                ${pathname === '/admin'
                                        ? 'bg-red-500/10 shadow-lg'
                                        : 'hover:bg-foreground/[0.04]'
                                    }`}
                            >
                                <Settings className={`w-[18px] h-[18px] flex-shrink-0 ${pathname === '/admin' ? 'text-red-400' : 'text-foreground/30'}`} />
                                <AnimatePresence mode="wait">
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -8 }}
                                            className={`text-sm truncate ${pathname === '/admin' ? 'text-red-400 font-medium' : 'text-foreground/50'}`}
                                        >
                                            Admin
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Link>
                    </>
                )}
            </div>

            {/* Utility Row — Notification Bell + Theme Toggle */}
            <div className={`px-3 mt-2 ${collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2 px-5'}`}>
                <NotificationBell />
                <ThemeToggle collapsed={collapsed} />
            </div>

            {/* User Profile — flex-wrap so signout goes below on collapse */}
            <div className="px-3 mt-3">
                <div className="h-px bg-foreground/[0.04] mx-2 mb-3" />
                <div className={`flex flex-wrap items-center gap-3 py-2 ${collapsed ? 'justify-center' : 'px-3'}`}>
                    {user?.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full bg-foreground/5 shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-foreground/[0.06] flex items-center justify-center text-xs font-medium text-foreground/50 shrink-0">
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
                                <p className="text-sm text-foreground/70 truncate">
                                    {user?.user_metadata?.full_name || user?.email}
                                </p>
                                <p className="text-[10px] text-foreground/25 font-mono truncate">
                                    {user?.email}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={signOut}
                        className={`w-8 h-8 rounded-lg bg-foreground/[0.03] flex items-center justify-center
                       hover:bg-foreground/[0.06] transition-all duration-base ease-glide shrink-0
                       ${collapsed ? 'mt-1' : ''}`}
                        title="Sign Out"
                    >
                        <LogOut className="w-3.5 h-3.5 text-foreground/30" />
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}
