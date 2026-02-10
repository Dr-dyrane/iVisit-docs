'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const LOGO_URL = "https://www.ivisit.ng/logo.png";

interface DocumentViewerProps {
    content: string;
    title: string;
    tier?: string;
}

export function DocumentViewer({ content, title, tier }: DocumentViewerProps) {
    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Document Card — White background, premium physical feel */}
            <div className="bg-white py-12 px-6 md:py-20 md:px-16 shadow-2xl rounded-[3rem] relative overflow-hidden ring-1 ring-black/5">
                {/* Red gradient top border — physical dossier feel */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#86100E] via-[#F87171] to-[#86100E]" />

                {/* Background watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                    <img src={LOGO_URL} alt="" className="w-[80%] rotate-[-15deg] object-contain" />
                </div>

                {/* Header — brand + classification */}
                <header className="relative mb-20 pb-12 border-b-2 border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div className="space-y-6">
                        <img src={LOGO_URL} alt="iVisit" className="h-16 object-contain" />
                        <div>
                            <span className="inline-block px-3 py-1 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.3em] rounded-md mb-3">
                                Protocol Verified
                            </span>
                            <h1 className="text-3xl md:text-4xl font-heading font-black text-gray-900 tracking-tighter leading-none">
                                {title?.replace(/^#\s*/, '')}
                            </h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">
                            Classification
                        </p>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-wider">
                            {tier || 'Confidential'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </header>

                {/* Content — matching original prose style */}
                <div className="relative prose prose-slate max-w-none
          prose-headings:text-gray-900 prose-headings:font-heading prose-headings:font-black
          prose-h1:text-3xl prose-h1:tracking-tighter prose-h1:leading-none
          prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-l-4 prose-h2:border-[#86100E] prose-h2:pl-6 prose-h2:bg-gray-50/50 prose-h2:py-4
          prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-4
          prose-p:text-gray-600 prose-p:leading-[1.8] prose-p:text-base md:prose-p:text-[17px]
          prose-strong:text-gray-900 prose-strong:font-bold
          prose-a:text-[#86100E] prose-a:no-underline hover:prose-a:underline
          prose-li:text-gray-600 prose-li:leading-[1.8]
          prose-table:border-2 prose-table:border-gray-50
          prose-th:bg-gray-50/50 prose-th:p-4 prose-th:text-[10px] prose-th:uppercase prose-th:tracking-widest prose-th:text-[#86100E] prose-th:font-black
          prose-td:p-4 prose-td:text-[15px] prose-td:border-b prose-td:border-gray-50
          prose-blockquote:border-l-[#86100E] prose-blockquote:bg-[#86100E]/5 prose-blockquote:py-4 prose-blockquote:px-10 prose-blockquote:italic prose-blockquote:rounded-r-2xl
          prose-pre:bg-gray-50 prose-pre:rounded-2xl
          prose-code:text-[#86100E] prose-code:font-mono prose-code:text-sm
        ">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                    >
                        {content}
                    </ReactMarkdown>
                </div>

                {/* Footer — mirroring original */}
                <footer className="mt-32 pt-12 border-t-2 border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
                    <div>© {new Date().getFullYear()} iVisit Intelligence Collective</div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#86100E] shadow-[0_0_8px_#86100E]" />
                        Authenticated Secure Output
                    </div>
                </footer>
            </div>
        </div>
    );
}
