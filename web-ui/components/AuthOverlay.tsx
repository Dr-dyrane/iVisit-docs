'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export function AuthOverlay() {
    const { signInWithGoogle } = useAuth();

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[120px]" />
                <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-accent/[0.03] rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Glass card */}
                <div className="glass rounded-glass-xl p-10 text-center">
                    {/* Logo area */}
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-foreground/[0.04] flex items-center justify-center animate-pulse-glow">
                            <Shield className="w-7 h-7 text-foreground/60" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight mb-2">
                        iVisit Data Room
                    </h1>
                    <p className="text-sm text-foreground/40 mb-10 leading-relaxed max-w-xs mx-auto">
                        Secure access to confidential intelligence, proposals, and technical blueprints.
                    </p>

                    {/* Google Sign In */}
                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4
                       rounded-full bg-foreground/[0.05] backdrop-blur-sm
                       text-foreground/90 text-sm font-medium
                       transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)]
                       hover:bg-foreground/[0.09] hover:scale-[1.02]
                       active:scale-[0.98]
                       focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {/* Google Icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    {/* Footer */}
                    <p className="text-[11px] text-foreground/20 mt-8 font-mono tracking-wide">
                        PROTECTED BY NDA · NIGERIAN LAW COMPLIANT
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
