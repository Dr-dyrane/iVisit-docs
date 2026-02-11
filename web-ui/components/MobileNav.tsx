'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDocuments } from '@/hooks/useDocuments';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
    Shield, FileText, Briefcase, Map, Printer,
    Home, LogOut, X, Menu
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
    'briefcase': Briefcase,
    'map': Map,
    'shield': Shield,
    'printer': Printer,
    'file-text': FileText,
};

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, signOut } = useAuth();
    const { documents } = useDocuments();
    const pathname = usePathname();

    return (
        <>
            {/* Floating action button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                   bg-foreground/[0.06] backdrop-blur-sm shadow-lg
                   flex items-center justify-center
                   transition-all duration-base ease-glide
                   hover:bg-foreground/[0.1] hover:scale-105
                   active:scale-95"
            >
                <Menu className="w-5 h-5 text-foreground/60" />
            </button>

            {/* Bottom sheet overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overlay fixed inset-0 z-50"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.5 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100) setIsOpen(false);
                            }}
                            className="bottom-sheet fixed bottom-0 left-0 right-0 z-50
                         max-h-[85vh] overflow-y-auto"
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-foreground/10" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-accent" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-heading font-bold text-foreground">
                                            iVisit Data Room
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-lg bg-foreground/[0.04] flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-foreground/40" />
                                </button>
                            </div>

                            {/* Navigation Items */}
                            <nav className="px-4 pb-4 space-y-1">
                                <Link href="/" onClick={() => setIsOpen(false)}>
                                    <div
                                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl
                                transition-all duration-base ease-glide
                                ${pathname === '/'
                                                ? 'bg-foreground/[0.06]'
                                                : 'hover:bg-foreground/[0.03]'
                                            }`}
                                    >
                                        <Home className={`w-5 h-5 ${pathname === '/' ? 'text-accent' : 'text-foreground/30'
                                            }`} />
                                        <span className={`text-base ${pathname === '/' ? 'text-foreground font-medium' : 'text-foreground/50'
                                            }`}>
                                            Vault
                                        </span>
                                    </div>
                                </Link>

                                <div className="h-px bg-foreground/[0.04] mx-4 my-2" />

                                {documents.map((doc, index) => {
                                    const Icon = ICON_MAP[doc.icon] || FileText;
                                    const isActive = pathname === `/docs/${doc.slug}`;

                                    return (
                                        <Link
                                            key={doc.id}
                                            href={`/docs/${doc.slug}`}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, x: -16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                    delay: index * 0.06,
                                                    duration: 0.4,
                                                    ease: [0.23, 1, 0.32, 1],
                                                }}
                                                className={`flex items-center gap-4 px-4 py-4 rounded-2xl
                                    transition-all duration-base ease-glide
                                    ${isActive
                                                        ? 'bg-foreground/[0.06]'
                                                        : 'hover:bg-foreground/[0.03]'
                                                    }`}
                                            >
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-foreground/30'
                                                    }`} />
                                                <span className={`text-base ${isActive ? 'text-foreground font-medium' : 'text-foreground/50'
                                                    }`}>
                                                    {doc.title.replace(/^iVisit\s+/, '').split(':')[0]}
                                                </span>
                                            </motion.div>
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* User section */}
                            <div className="px-4 pb-8">
                                <div className="h-px bg-foreground/[0.04] mx-4 mb-4" />
                                <div className="flex items-center gap-3 px-4 py-3">
                                    {user?.user_metadata?.avatar_url ? (
                                        <img
                                            src={user.user_metadata.avatar_url}
                                            alt=""
                                            className="w-10 h-10 rounded-full bg-foreground/5"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-foreground/[0.06] flex items-center justify-center text-sm text-foreground/50">
                                            {user?.email?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground/70 truncate">
                                            {user?.user_metadata?.full_name || user?.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { signOut(); setIsOpen(false); }}
                                        className="w-10 h-10 rounded-xl bg-foreground/[0.04] flex items-center justify-center"
                                    >
                                        <LogOut className="w-4 h-4 text-foreground/30" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
