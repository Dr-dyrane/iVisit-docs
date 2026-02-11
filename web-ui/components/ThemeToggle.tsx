'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODES = [
    { key: 'dark', icon: Moon, label: 'Dark' },
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'system', icon: Monitor, label: 'System' },
] as const;

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);
    if (!mounted) return <div className="w-10 h-10" />;

    const current = MODES.find((m) => m.key === theme) || MODES[0];

    const cycle = () => {
        const idx = MODES.findIndex((m) => m.key === theme);
        setTheme(MODES[(idx + 1) % MODES.length].key);
    };

    return (
        <button
            onClick={cycle}
            className="w-10 h-10 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-black/[0.04]
                 hover:bg-white/[0.08] dark:hover:bg-white/[0.08]
                 flex items-center justify-center transition-all duration-200 ease-glide"
            title={`Theme: ${current.label}`}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={theme}
                    initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                >
                    <current.icon className="w-4 h-4 text-foreground/40" />
                </motion.div>
            </AnimatePresence>
        </button>
    );
}
