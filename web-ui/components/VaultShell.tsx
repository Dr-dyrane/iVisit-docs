'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AuthOverlay } from '@/components/AuthOverlay';
import { VaultSidebar } from '@/components/VaultSidebar';
import { MobileNav } from '@/components/MobileNav';

/**
 * VaultShell — wraps all vault pages with auth gate, sidebar, and mobile nav.
 * The generator page at /generator bypasses this shell entirely.
 * NotificationBell is now inside the sidebar, not floating on top of content.
 */
export function VaultShell({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Skip shell for the generator route
    if (pathname?.startsWith('/generator')) {
        return <>{children}</>;
    }

    // Loading state — calm acknowledgment
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-foreground/5 animate-pulse-glow" />
                    <p className="text-sm text-foreground/30 font-mono tracking-wider">
                        INITIALIZING VAULT
                    </p>
                </div>
            </div>
        );
    }

    // Not authenticated — show auth overlay
    if (!user) {
        return <AuthOverlay />;
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block">
                <VaultSidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </aside>

            {/* Main Content Area */}
            <main
                className={`flex-1 min-h-screen transition-all duration-slow ease-glide ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[280px]'
                    }`}
            >
                <div className="min-h-screen">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden">
                <MobileNav />
            </div>
        </div>
    );
}
