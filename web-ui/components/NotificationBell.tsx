'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, X, Shield, Unlock, Lock, FileText, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    subscribeToNotifications,
    type Notification,
} from '@/lib/notificationService';

const ICON_MAP: Record<string, React.ElementType> = {
    Shield, Unlock, Lock, FileText, Send, Bell,
};

const COLOR_MAP: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    destructive: 'bg-red-500/20 text-red-400',
};

export function NotificationBell() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const loadNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const [items, count] = await Promise.all([
            getNotifications(user.id, 20),
            getUnreadCount(user.id),
        ]);
        setNotifications(items);
        setUnreadCount(count);
        setLoading(false);
    }, [user]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToNotifications(user.id, (newNotif) => {
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
        });
        return unsub;
    }, [user]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllAsRead(user.id);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    if (!user) return null;

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative w-10 h-10 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08]
                   flex items-center justify-center transition-all duration-200 ease-glide"
                aria-label="Notifications"
            >
                <Bell className="w-4.5 h-4.5 text-foreground/40" />
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full
                         bg-red-500 text-white text-[10px] font-bold
                         flex items-center justify-center px-1"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="absolute left-0 bottom-14 w-[360px] max-h-[480px]
                       bg-background/95 backdrop-blur-xl border border-foreground/[0.06]
                       rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/[0.06]">
                            <h3 className="text-sm font-semibold text-foreground tracking-tight">
                                Notifications
                            </h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors
                               font-mono tracking-wider uppercase flex items-center gap-1"
                                    >
                                        <CheckCheck className="w-3 h-3" />
                                        Mark all
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="text-foreground/20 hover:text-foreground/40 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto max-h-[400px] overscroll-contain">
                            {loading && notifications.length === 0 ? (
                                <div className="px-5 py-8 text-center">
                                    <div className="w-6 h-6 rounded-full bg-foreground/5 animate-pulse mx-auto mb-3" />
                                    <p className="text-xs text-foreground/20 font-mono">Loading…</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="px-5 py-12 text-center">
                                    <Bell className="w-8 h-8 text-foreground/10 mx-auto mb-3" />
                                    <p className="text-sm text-foreground/25">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    const Icon = ICON_MAP[notif.icon || 'Bell'] || Bell;
                                    const colorClass = COLOR_MAP[notif.color] || COLOR_MAP.info;

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`flex items-start gap-3 px-5 py-3.5 border-b border-foreground/[0.03]
                                  hover:bg-foreground/[0.02] transition-colors cursor-default
                                  ${!notif.read ? 'bg-foreground/[0.02]' : ''}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${!notif.read ? 'text-foreground font-medium' : 'text-foreground/60'}`}>
                                                    {notif.title}
                                                </p>
                                                {notif.message && (
                                                    <p className="text-xs text-foreground/30 mt-0.5 truncate">
                                                        {notif.message}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-foreground/15 mt-1 font-mono">
                                                    {timeAgo(notif.created_at)}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <button
                                                    onClick={() => handleMarkRead(notif.id)}
                                                    className="shrink-0 mt-1 text-foreground/15 hover:text-foreground/40 transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
