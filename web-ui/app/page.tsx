'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Zap, Palette, Database, Check, Loader2, Sparkles, Printer, Download, Copy } from 'lucide-react';
import { marked } from 'marked';

const MOCK_DOCUMENT = {
  id: 'mock-1',
  title: "iVisit Business Proposal: Series A",
  type: "Business Proposal",
  timestamp: new Date().toISOString(),
  content: `# Business Proposal: iVisit Emergency Medical Platform

**Prepared by:** iVisit Founding Team 
**Date:** January 2025 
**Version:** 1.0 
**Classification:** Confidential

---

## Executive Summary

iVisit is a next-generation emergency medical platform designed to revolutionize how patients access urgent and emergency medical care. By leveraging real-time telemedicine, intelligent triage, GPS-enabled dispatch, and seamless integration with hospital emergency departments, iVisit bridges the critical gap between a patient's moment of need and the delivery of life-saving care.

The emergency medical services (EMS) market is projected to reach **$96.7 billion globally by 2030**, yet the industry continues to suffer from slow response times and fragmented communication.

---

## 1. Problem Statement

The current emergency medical ecosystem is fundamentally broken for both patients and providers:

### For Patients
- **Average 911 response time** in urban areas is **7–14 minutes**; in rural areas, it can exceed **30 minutes**.
- **Emergency room wait times** average **2 hours 40 minutes** nationally.
- Patients lack visibility into ER capacity and alternative urgent care options.

### For Providers & Health Systems
- EMS dispatch systems rely on outdated CAD (Computer-Aided Dispatch) technology.
- Hospital diversion costs the U.S. healthcare system an estimated **$4.6 billion annually**.

---

## 2. Proposed Solution

**iVisit** is a comprehensive emergency medical platform that connects patients, emergency medical services, hospitals, and physicians through a unified digital ecosystem.

### Core Value Propositions

| Stakeholder | Value Delivered |
|---|---|
| **Patients** | Instant access to emergency triage, faster response times, real-time ER wait visibility |
| **EMS Providers** | Intelligent dispatch optimization, real-time patient data |
| **Hospitals** | Reduced overcrowding, pre-arrival patient data, capacity management tools |

### How It Works

\`\`\`
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PATIENT    │────>│ iVisit PLATFORM  │────>│  CARE DELIVERY   │
│              │     │                  │     │                 │
│ • Mobile App │     │ • AI Triage      │     │ • EMS Dispatch  │
│ • Wearables  │     │ • GPS Routing    │     │ • ER Admission  │
└──────────────┘     └──────────────────┘     └─────────────────┘
\`\`\`

---

## 3. Platform Architecture & Features

### 3.1 Technical Architecture
iVisit is built on a cloud-native, microservices architecture designed for high availability and HIPAA-compliant data handling.

#### Key Features
- **One-Touch Emergency Activation** — Single-button initiation with automatic location detection.
- **AI-Powered Symptom Triage** — Clinically validated NLP decision tree.
- **Real-Time ER Wait Times** — Live feed of capacity across nearby facilities.
- **Wearable Integration** — Automatic detection via Apple Watch and health sensors.

---

## 4. Market Analysis

- **TAM:** $18.5 billion (U.S. emergency care coordination + telemedicine).
- **SAM:** $4.2 billion (metropolitan areas with integrated EMS).
- **SOM:** $210 million (target capture within 5 years).

---

## 5. Business Model

iVisit employs a multi-sided platform model:
- **B2B SaaS**: Hospital capacity management & EMS dispatch licenses.
- **B2C Subscription**: iVisit Premium for families and high-risk patients.
- **Transaction Fees**: Per-encounter telemedicine and coordination fees.

---

## 6. Funding Requirements

- **Seeking:** $5.2M Series A
- **Use of Funds:** 35% Product Dev, 20% Market Launch, 15% Clinical Ops.
`
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<any>(null);

  // Real-time Logs State
  const [logs, setLogs] = useState<string[]>([]);

  // Form State
  const [docType, setDocType] = useState('Business Proposal');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useSupabase, setUseSupabase] = useState(true);
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('recentDocuments');
    if (saved) {
      const parsed = JSON.parse(saved);
      setRecentDocs(parsed);
      if (parsed.length > 0) {
        setCurrentDoc(parsed[0]);
      } else {
        setCurrentDoc(MOCK_DOCUMENT);
      }
    } else {
      setRecentDocs([MOCK_DOCUMENT]);
      setCurrentDoc(MOCK_DOCUMENT);
    }
  }, []);

  const generateDocument = async () => {
    if (!customPrompt && docType === 'Custom Request') {
      toast.error("Missing Prompt", {
        description: "Please describe your document requirements.",
      });
      return;
    }

    setIsGenerating(true);
    setLogs([]);

    const finalPrompt = customPrompt
      ? customPrompt
      : `Generate a comprehensive ${docType} for iVisit emergency medical platform.`;

    try {
      setLogs(prev => [...prev, `🚀 Sending request to API...`]);
      setLogs(prev => [...prev, `📡 Supabase Memory: ${useSupabase ? 'Enabled' : 'Disabled'}`]);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          useSupabase: useSupabase
        })
      });

      const result = await response.json();

      if (result.success) {
        setLogs(prev => [...prev, `✅ Document generated successfully!`]);
        if (result.document.logs) {
          const cliLogs = result.document.logs.split('\n').filter((l: string) => l.trim() !== '');
          setLogs(prev => [...prev, ...cliLogs]);
        }

        toast.success("Document Generated", {
          description: `${docType} created successfully`,
        });

        const newDoc = {
          ...result.document,
          type: docType,
          id: Date.now(),
          timestamp: new Date().toISOString()
        };

        setCurrentDoc(newDoc);
        const updated = [newDoc, ...recentDocs.filter(d => d.id !== 'mock-1').slice(0, 4)];
        setRecentDocs(updated);
        localStorage.setItem('recentDocuments', JSON.stringify(updated));
        setShowPreview(true);
      } else {
        setLogs(prev => [...prev, `❌ Generation Failed: ${result.error}`]);
        toast.error("Generation Failed", {
          description: result.error || "Unknown error occurred",
        });
      }
    } catch (error: any) {
      console.error('Generation Error:', error);
      setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
      toast.error("Connection Error", {
        description: "Failed to connect to backend",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!currentDoc) return;

    // Create a hidden iframe for seamless printing (no about:blank flash)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const htmlContent = marked.parse(currentDoc.content || '');

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>${currentDoc.title}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');
              
              body {
                font-family: 'Inter', sans-serif;
                line-height: 1.6;
                color: #111;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
              }
              
              .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #86100E;
                padding-bottom: 20px;
                margin-bottom: 40px;
              }
              
              .logo {
                width: 50px;
                height: 50px;
                background: #86100E;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
                font-size: 24px;
                font-family: 'Space Grotesk', sans-serif;
              }
              
              .company-name {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 24px;
                font-weight: 700;
                color: #86100E;
                margin-left: 15px;
              }
              
              .doc-meta {
                text-align: right;
                font-size: 12px;
                color: #666;
              }
              
              h1, h2, h3, h4 {
                font-family: 'Space Grotesk', sans-serif;
                color: #86100E;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
              }
              
              h1 { font-size: 32px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
              h2 { font-size: 24px; }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              
              th {
                background-color: #f9f9f9;
              }

              pre {
                background: #f4f4f4;
                padding: 15px;
                border-radius: 8px;
                font-size: 14px;
                overflow-x: auto;
              }
              
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="display: flex; align-items: center;">
                <img src="/logo.svg" alt="iVisit Logo" style="width: 50px; height: 50px; border-radius: 12px;" />
                <div class="company-name">iVisit</div>
              </div>
              <div class="doc-meta">
                <p>Generated: ${new Date().toLocaleDateString()}</p>
                <p>Type: ${currentDoc.type || 'Document'}</p>
              </div>
            </div>
            <div class="content">
              ${htmlContent}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const handleDownload = () => {
    if (!currentDoc) return;
    const blob = new Blob([currentDoc.content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.title?.replace(/\s+/g, '_') || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download Started", {
      description: "Document saved as Markdown file",
    });
  };

  const handleCopy = () => {
    if (!currentDoc) return;
    navigator.clipboard.writeText(currentDoc.content || '');
    toast.success("Copied", {
      description: "Markdown content copied to clipboard",
    });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen selection:bg-primary/30 relative">
      {showPreview && currentDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <img src="/logo.svg" alt="Logo" className="w-10 h-10 rounded-xl object-contain shadow-sm" />
                <div>
                  <h3 className="font-heading font-bold text-xl text-gray-900 line-clamp-1">
                    {currentDoc.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-sans">
                    {new Date(currentDoc.timestamp).toLocaleDateString()} • {currentDoc.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button onClick={() => setShowPreview(false)} variant="ghost" className="hover:bg-gray-100 text-gray-500">
                  Close
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#fafafa]">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 p-8 md:p-16 min-h-full rounded-[2.5rem] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
                  <div className="prose prose-red max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:pb-2 prose-h2:border-gray-100 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-gray-900 prose-table:my-8 prose-table:border prose-table:border-gray-100 prose-table:rounded-2xl prose-th:bg-gray-50/50 prose-th:p-4 prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-td:p-4 prose-td:text-sm prose-pre:bg-gray-900 prose-pre:rounded-2xl prose-pre:shadow-2xl prose-hr:border-gray-100">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(currentDoc.content || '') }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12 md:py-20">
        <header className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/20 blur-[100px] rounded-full -z-10" />
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2.5rem] mb-8 shadow-2xl border border-white/10 group relative transition-transform hover:scale-105 duration-500">
            <img src="/logo.svg" alt="iVisit Logo" className="w-14 h-14 object-contain transition-transform group-hover:rotate-12" />
          </div>
          <h1 className="font-heading font-black text-5xl md:text-7xl mb-6 tracking-tight text-white drop-shadow-xl">
            Document Generator
            <span className="text-accent ml-2">2.0</span>
          </h1>
          <p className="font-sans text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Generate professional business, legal, and technical documents with
            <span className="text-white font-semibold mx-1">Claude Opus AI</span>
            and Apple-level design precision.
          </p>
        </header>

        <main className="grid lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-7">
            <Card variant="glass" className="h-full border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[80px] rounded-full -z-10 transition-all duration-700 group-hover:bg-accent/20" />
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-white">Generate Document</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-heading text-sm font-medium text-white/80 ml-1">Document Type</label>
                  <div className="relative">
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-sans focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none hover:bg-white/10 cursor-pointer"
                    >
                      <option className="bg-gray-900">Business Proposal</option>
                      <option className="bg-gray-900">Privacy Policy</option>
                      <option className="bg-gray-900">Technical Documentation</option>
                      <option className="bg-gray-900">API Documentation</option>
                      <option className="bg-gray-900">Custom Request</option>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">▼</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-heading text-sm font-medium text-white/80 ml-1">
                    Custom Instructions <span className="text-white/40 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 font-sans focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all hover:bg-white/10 resize-none"
                    rows={5}
                    placeholder={docType === 'Custom Request' ? "Describe exactly what you need..." : "Add specific details, requirements, or focus areas..."}
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <label className="flex items-center gap-3 font-sans group/check cursor-pointer">
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${useSupabase ? 'bg-primary border-primary' : 'border-white/30 bg-white/5'}`}>
                      {useSupabase && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={useSupabase} onChange={(e) => setUseSupabase(e.target.checked)} />
                    <span className="text-sm text-white/80 group-hover/check:text-white transition-colors">Enable Memory (Supabase)</span>
                  </label>

                  <div className="flex gap-3">
                    {currentDoc && (
                      <Button onClick={handlePrint} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    )}
                    <Button onClick={generateDocument} disabled={isGenerating} className="shadow-xl shadow-primary/20">
                      {isGenerating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="mr-2 h-4 w-4" />Generate Document</>
                      )}
                    </Button>
                  </div>
                </div>

                {(isGenerating || logs.length > 0) && (
                  <div ref={logContainerRef} className="mt-6 p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-green-400 max-h-40 overflow-y-auto scroll-smooth">
                    <div className="flex items-center gap-2 mb-2 text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5 pb-2">
                      <Loader2 className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                      System Output
                    </div>
                    {logs.map((log, i) => (
                      <div key={i} className="mb-1 py-0.5 border-l-2 border-green-500/20 pl-2">
                        <span className="text-green-500/50 mr-2">[{i + 1}]</span>
                        {log}
                      </div>
                    ))}
                    {isGenerating && <div className="animate-pulse ml-2 text-green-400">_ Generating dynamic content...</div>}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card variant="default" className="h-full border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <FileText className="w-6 h-6 text-white/80" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-white">Recent Files</h2>
              </div>

              <div className="space-y-3">
                {recentDocs.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-sans text-sm">No documents generated yet</p>
                  </div>
                ) : (
                  recentDocs.map((doc: any, index: number) => (
                    <div
                      key={doc.id || index}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all cursor-pointer hover:shadow-2xl hover:shadow-black/40 active:scale-[0.98]"
                      onClick={() => {
                        setCurrentDoc(doc);
                        setShowPreview(true);
                        toast.info(`Viewing: ${doc.title || doc.type}`);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                          <FileText className="w-5 h-5 text-white/40 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-heading font-bold text-white text-sm group-hover:text-primary transition-colors line-clamp-1">
                            {doc.title || doc.type || "Untitled Document"}
                          </h4>
                          <p className="font-sans text-[10px] text-white/30 uppercase tracking-tighter mt-0.5">
                            {new Date(doc.timestamp).toLocaleDateString()} • {doc.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20">
                          <Printer className="w-4 h-4 text-white/60 hover:text-primary" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </main>

        <section className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Zap className="w-6 h-6 text-white" />, color: "from-amber-500 to-orange-600", title: "Ultra-Fast", desc: "Powered by Claude Opus 4.6 for lightning generation" },
            { icon: <Palette className="w-6 h-6 text-white" />, color: "from-blue-500 to-indigo-600", title: "Apple Design", desc: "Pixel-perfect formatting with iVisit branding" },
            { icon: <Database className="w-6 h-6 text-white" />, color: "from-emerald-500 to-green-600", title: "Smart Memory", desc: "Context-aware generation via Supabase vector store" }
          ].map((feature, i) => (
            <Card key={i} className="p-8 text-center hover:bg-white/10 transition-colors border-white/5">
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="font-heading font-bold text-lg text-white mb-2">{feature.title}</h3>
              <p className="font-sans text-white/50 text-sm leading-relaxed">{feature.desc}</p>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
