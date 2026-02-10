'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Printer, Download, Copy, Link2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { marked } from 'marked';

const LOGO_URL = "https://www.ivisit.ng/logo.png";

interface DocumentActionsProps {
    title: string;
    tier: string;
    slug: string;
    content: string;
}

export function DocumentActions({ title, tier, slug, content }: DocumentActionsProps) {
    /**
     * iframe spool print — mirrors the original generator's handlePrint exactly.
     * Renders a branded, professional dossier into a hidden iframe and triggers
     * the native print dialog with full headers, footers, and watermark.
     */
    const handlePrint = () => {
        if (!content) return;

        const spoolId = 'ivisit-print-spool';
        let spool = document.getElementById(spoolId) as HTMLIFrameElement;
        if (spool) spool.remove();

        spool = document.createElement('iframe');
        spool.id = spoolId;
        spool.style.position = 'absolute';
        spool.style.width = '0';
        spool.style.height = '0';
        spool.style.border = 'none';
        spool.style.visibility = 'hidden';
        document.body.appendChild(spool);

        const htmlContent = marked.parse(content);
        const doc = spool.contentWindow?.document;

        if (doc) {
            doc.open();
            doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>iVisit Protocol: ${title}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
              @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');

              * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
              body {
                font-family: 'Inter', -apple-system, sans-serif;
                line-height: 1.6;
                color: #111;
                background: white;
                margin: 0; padding: 0;
              }

              .dossier {
                position: relative;
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.4in;
                background: white;
              }

              .phys-border {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 6px;
                background: linear-gradient(90deg, #86100E 0%, #F87171 50%, #86100E 100%);
              }

              .watermark {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%) rotate(-15deg);
                width: 80%;
                opacity: 0.03;
                z-index: -1;
              }

              header {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 2px solid #f0f0f0;
              }

              .brand-intel { display: flex; align-items: center; gap: 20px; }
              .brand-logo { width: 50px; height: 50px; object-fit: contain; }
              .brand-name { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: #000; letter-spacing: -1.5px; }

              .classification { text-align: right; }
              .class-label { font-size: 9px; font-weight: 900; color: #86100E; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 3px; }
              .class-date { font-size: 12px; font-weight: 600; color: #666; }

              .intel-body { color: #222; }
              h1 { font-family: 'Space Grotesk', sans-serif; font-size: 36px; font-weight: 700; margin: 0 0 20px 0; letter-spacing: -2px; line-height: 1; color: #000; }
              h2 {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 24px;
                font-weight: 700;
                margin: 60px 0 30px 0;
                color: #000;
                border-left: 5px solid #86100E;
                padding-left: 20px;
                break-before: page;
                padding-top: 20px;
              }

              p, li { break-inside: avoid; }
              table, blockquote, pre { break-inside: avoid; margin: 40px 0; }
              header, h1, h2, h3 { break-after: avoid; }

              p { margin-bottom: 20px; font-size: 16px; color: #333; }
              ul, ol { margin-bottom: 30px; padding-left: 25px; }
              li { margin-bottom: 12px; font-size: 16px; }

              table { width: 100%; border-collapse: collapse; margin: 30px 0; page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              th { background: #f8f8f8; color: #86100E; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 15px; text-align: left; border: 1px solid #eee; }
              td { padding: 15px; border: 1px solid #eee; font-size: 15px; }

              blockquote { background: #fff8f8; border-left: 5px solid #86100E; padding: 25px 35px; margin: 40px 0; font-style: italic; font-size: 18px; color: #444; border-radius: 0 20px 20px 0; }

              footer {
                margin-top: 100px;
                padding-top: 30px;
                border-top: 2px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: #999;
                break-inside: avoid;
              }
              .auth-marker { display: flex; align-items: center; gap: 10px; color: #86100E; }
              .dot { width: 7px; height: 7px; background: #86100E; border-radius: 50%; }

              @media print {
                @page { size: portrait; margin: 0; }
                .dossier { padding: 0.4in; }
                h2:first-of-type { break-before: auto; }
              }
            </style>
          </head>
          <body>
            <div class="dossier">
              <div class="phys-border"></div>
              <img src="${LOGO_URL}" class="watermark" />

              <header>
                <div class="brand-intel">
                  <img src="${LOGO_URL}" class="brand-logo" />
                  <span class="brand-name">iVisit</span>
                </div>
                <div class="classification">
                  <div class="class-label">Internal Classification // ${tier}</div>
                  <div class="class-date">${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </header>

              <main class="intel-body">
                ${htmlContent}
              </main>

              <footer>
                <div class="copyright">© ${new Date().getFullYear()} iVisit Intelligence Collective</div>
                <div class="auth-marker">
                  <div class="dot"></div>
                  Verified Protocol Output
                </div>
              </footer>
            </div>
          </body>
        </html>
      `);
            doc.close();

            spool.onload = () => {
                setTimeout(() => {
                    if (spool.contentWindow) {
                        spool.contentWindow.focus();
                        spool.contentWindow.print();
                    }
                }, 500);
            };
        }
    };

    const handleDownload = () => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title?.replace(/\s+/g, '_') || 'document'}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Protocol Exported', {
            description: 'Secure markdown archive generated',
        });
    };

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        toast.success('Protocol Copied', {
            description: 'Content successfully stored in clipboard',
        });
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/docs/${slug}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard');
        } catch {
            toast.error('Failed to copy link');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="sticky top-0 z-30 no-print"
        >
            <div className="glass rounded-b-glass-lg px-4 sm:px-6 py-4 flex items-center justify-between">
                {/* Left — back + title */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center
                       hover:bg-white/[0.07] transition-all duration-base ease-glide"
                    >
                        <ArrowLeft className="w-4 h-4 text-white/40" />
                    </Link>
                    <div className="hidden sm:block">
                        <h2 className="text-sm font-heading font-semibold text-white truncate max-w-[280px]">
                            {title}
                        </h2>
                        <p className="text-[10px] text-white/25 font-mono uppercase tracking-widest">
                            {tier}
                        </p>
                    </div>
                </div>

                {/* Right — actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center
                       hover:bg-white/[0.07] transition-all duration-base ease-glide"
                        title="Copy Content"
                    >
                        <Copy className="w-4 h-4 text-white/40" />
                    </button>
                    <button
                        onClick={handleDownload}
                        className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center
                       hover:bg-white/[0.07] transition-all duration-base ease-glide"
                        title="Download Markdown"
                    >
                        <Download className="w-4 h-4 text-white/40" />
                    </button>
                    <button
                        onClick={handleShare}
                        className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center
                       hover:bg-white/[0.07] transition-all duration-base ease-glide"
                        title="Copy Share Link"
                    >
                        <Link2 className="w-4 h-4 text-white/40" />
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full
                       bg-primary text-white text-sm font-bold
                       hover:bg-[#86100E] shadow-xl shadow-primary/20
                       transition-all duration-base ease-glide"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Print Dossier</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
