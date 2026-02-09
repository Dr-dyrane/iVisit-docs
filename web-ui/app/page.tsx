'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Zap, Palette, Database, Check, Loader2, Sparkles, Printer, Download, Copy, X, FileSearch } from 'lucide-react';
import { marked } from 'marked';

const LOGO_URL = "https://www.ivisit.ng/logo.png";

const MOCK_DOCUMENT = {
  id: 'mock-1',
  title: "iVisit Intelligence: User Protocol v1.0",
  type: "System Guide",
  timestamp: new Date().toISOString(),
  content: `# iVisit Intelligence: Welcome to the Future of Documentation

**Subject:** iVisit Document Generation Interface
**Protocol:** Standardized Professional Output
**Classification:** Confidential / Internal Use Only

---

## Welcome to iVisit

This platform represents the next generation of documentation intelligence. Our systems are trained to generate high-fidelity, industry-standard documents for medical, legal, and business operations.

### CORE CAPABILITIES

- **Precision Analysis**: Every document is cross-referenced with your collective knowledge and iVisit's proprietary medical standards.
- **Dynamic Formatting**: Automatic conversion of complex data into professional tables, headers, and bulleted lists.
- **Medical Grade Security**: All processing occurs within protected environments with enterprise-grade encryption.

### OPERATIONAL PROCEDURES

1. **Select Objective**: Choose from Business Proposals, Technical Documentation, or Custom Requests.
2. **Assign Requirements**: Provide specific details or focus areas in the "Custom Instructions" field.
3. **Execute Generation**: Click the "Generate Document" button to initiate Claude 4.6's intelligence engine.
4. **Finalize & Distribute**: Preview, Download, or Print your document directly from the secure interface.

---

## SYSTEM ARCHITECTURE

| Layer | Technology | Function |
| :--- | :--- | :--- |
| **Cognitive** | Claude 4.6 Opus | Document Synthesis & Logic |
| **Aesthetic** | Alexander UI v1.0 | High-Fidelity Professional Presentation |
| **Memory** | Supabase Vector | Semantic Context & Project Knowledge |

*Prepared by the iVisit Intelligence Team.*`
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [docType, setDocType] = useState('Business Proposal');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useSupabase, setUseSupabase] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<any>(MOCK_DOCUMENT);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const fetchDocs = async () => {
      try {
        const response = await fetch('/api/documents');
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setRecentDocs(data);
          setCurrentDoc(data[0]);
          return;
        }
      } catch (e) {
        console.error("Failed to sync documents", e);
      }

      const saved = localStorage.getItem('recentDocuments');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentDocs(parsed);
        if (parsed.length > 0) {
          setCurrentDoc(parsed[0]);
        }
      } else {
        setRecentDocs([MOCK_DOCUMENT]);
        setCurrentDoc(MOCK_DOCUMENT);
      }
    };

    fetchDocs();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const generateDocument = async () => {
    if (!mounted) return;

    setIsGenerating(true);
    setLogs([]);
    const finalPrompt = customPrompt ? `${docType}: ${customPrompt}` : `Generate a professional ${docType} for iVisit.`;

    try {
      setLogs(prev => [...prev, `🚀 Initiating synthesis request...`]);
      setLogs(prev => [...prev, `📡 Semantic Memory Buffer: ${useSupabase ? 'Active' : 'Inactive'}`]);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          useSupabase: useSupabase
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.status === 'log') {
              setLogs(prev => [...prev, data.message]);
            } else if (data.status === 'info') {
              setLogs(prev => [...prev, `ℹ️ ${data.message}`]);
            } else if (data.status === 'error') {
              setLogs(prev => [...prev, `⚠️ ${data.message}`]);
            } else if (data.status === 'success') {
              setLogs(prev => [...prev, `✅ Synthesis Complete!`]);

              const newDoc = {
                ...data.document,
                type: docType,
                id: Date.now(),
                timestamp: new Date().toISOString()
              };

              setCurrentDoc(newDoc);
              setRecentDocs(prev => {
                const updated = [newDoc, ...prev.filter(d => d.id !== 'mock-1').slice(0, 4)];
                localStorage.setItem('recentDocuments', JSON.stringify(updated));
                return updated;
              });

              toast.success("Intelligence Delivered", {
                description: `${docType} synchronized successfully`,
              });
              setShowPreview(true);
            } else if (data.status === 'failed') {
              setLogs(prev => [...prev, `❌ Failed: ${data.error}`]);
              toast.error("Generation Halted", {
                description: data.error || "System interruption occurred",
              });
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (error: any) {
      toast.error("Critical System Error", {
        description: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!currentDoc) return;

    // Create spool container
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

    const htmlContent = marked.parse(currentDoc.content || '');
    const doc = spool.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>iVisit Protocol: ${currentDoc.title}</title>
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
                padding: 1in;
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
                margin-bottom: 60px;
                padding-bottom: 30px;
                border-bottom: 2px solid #f0f0f0;
              }

              .brand-intel { display: flex; align-items: center; gap: 20px; }
              .brand-logo { width: 60px; height: 60px; object-fit: contain; }
              .brand-name { font-family: 'Space Grotesk', sans-serif; font-size: 32px; font-weight: 700; color: #000; letter-spacing: -1.5px; }

              .classification {
                text-align: right;
              }
              .class-label { font-size: 10px; font-weight: 900; color: #86100E; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 5px; }
              .class-date { font-size: 14px; font-weight: 600; color: #666; }

              .intel-body { color: #222; }
              h1 { font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 700; margin: 0 0 30px 0; letter-spacing: -2px; line-height: 1; color: #000; }
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
                .dossier { padding: 0.75in 1in; }
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
                  <div class="class-label">Internal Classification // ${currentDoc.type}</div>
                  <div class="class-date">${new Date(currentDoc.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
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
    toast.success("Protocol Exported", {
      description: "Secure markdown archive generated",
    });
  };

  const handleCopy = () => {
    if (!currentDoc) return;
    navigator.clipboard.writeText(currentDoc.content || '');
    toast.success("Protocol Copied", {
      description: "Content successfully stored in clipboard",
    });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#86100E] selection:text-white font-sans">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#86100E]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#0B0F1A]/40 rounded-full blur-[120px]" />
      </div>

      {/* Preview Modal */}
      {showPreview && currentDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 md:p-8 transition-all duration-500 ease-out animate-in fade-in zoom-in-95">
          <div className="bg-[#f4f4f5] rounded-[2.5rem] w-full max-w-6xl h-full flex flex-col shadow-[0_0_100px_rgba(134,16,14,0.15)] overflow-hidden relative border border-white/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 bg-white border-b border-gray-100 sticky top-0 z-20">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-black/10 shadow-lg overflow-hidden">
                  <img src={LOGO_URL} alt="iVisit" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-2xl text-gray-900 leading-none">
                    {currentDoc.title?.replace(/^#\s*/, '')}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">
                    Internal Classification: {currentDoc.type} • {new Date(currentDoc.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleCopy} className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest transition-all">
                  <Copy className="w-4 h-4" /> Copy
                </button>
                <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-3 rounded-xl hover:bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-widest transition-all">
                  <Download className="w-4 h-4" /> Export
                </button>
                <Button onClick={handlePrint} variant="default" className="bg-primary hover:bg-[#86100E] text-white rounded-xl px-6 h-12 shadow-xl shadow-primary/20">
                  <Printer className="w-4 h-4 mr-2" /> Print Dossier
                </Button>
                <div className="w-px h-8 bg-gray-100 mx-2" />
                <button onClick={() => setShowPreview(false)} className="w-12 h-12 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-12 px-4 md:px-10 bg-[#f4f4f5]">
              <div className="max-w-5xl mx-auto">
                <div className="bg-white py-12 px-6 md:py-20 md:px-16 shadow-2xl rounded-[3rem] relative overflow-hidden ring-1 ring-black/5">
                  {/* iVisit Document Standard */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#86100E] via-[#F87171] to-[#86100E]" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
                    <img src={LOGO_URL} alt="" className="w-[80%] rotate-[-15deg] object-contain" />
                  </div>

                  <header className="relative mb-20 pb-12 border-b-2 border-gray-50 flex justify-between items-end">
                    <div className="space-y-6">
                      <img src={LOGO_URL} alt="iVisit" className="h-16 object-contain" />
                      <div>
                        <span className="inline-block px-3 py-1 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.3em] rounded-md mb-3">Protocol Verified</span>
                        <h1 className="text-4xl font-heading font-black text-gray-900 tracking-tighter leading-none">
                          {currentDoc.title?.replace(/^#\s*/, '')}
                        </h1>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Release Date</p>
                      <p className="text-base font-black text-gray-900">
                        {new Date(currentDoc.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </header>

                  <div className="relative prose prose-slate max-w-none 
                    prose-headings:text-gray-900 prose-headings:font-heading prose-headings:font-black
                    prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:border-l-4 prose-h2:border-[#86100E] prose-h2:pl-6 prose-h2:bg-gray-50/50 prose-h2:py-4
                    prose-p:text-gray-600 prose-p:leading-[1.8] prose-p:text-[17px]
                    prose-strong:text-gray-900 prose-strong:font-bold
                    prose-table:border-2 prose-table:border-gray-50
                    prose-th:bg-gray-50/50 prose-th:p-4 prose-th:text-[10px] prose-th:uppercase prose-th:tracking-widest prose-th:text-[#86100E]
                    prose-td:p-4 prose-td:text-[15px] prose-td:border-b prose-td:border-gray-50
                    prose-blockquote:border-l-[#86100E] prose-blockquote:bg-[#86100E]/5 prose-blockquote:py-4 prose-blockquote:px-10 prose-blockquote:italic prose-blockquote:rounded-r-2xl
                   ">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(currentDoc.content || '') }} />
                  </div>

                  <footer className="mt-32 pt-12 border-t-2 border-gray-50 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
                    <div>© {new Date().getFullYear()} iVisit Intelligence Collective</div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#86100E] shadow-[0_0_8px_#86100E]" />
                      Authenticated Secure Output
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-[1600px] mx-auto px-6 py-12 md:py-20 lg:px-12">
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-20 md:mb-32">
          <div className="flex items-center gap-6 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-[2rem] blur-2xl group-hover:bg-primary/50 transition-all duration-700" />
              <div className="relative w-16 h-16 bg-white rounded-[1.8rem] flex items-center justify-center border border-white/20 shadow-2xl group-hover:scale-105 transition-all duration-500 ring-1 ring-white/10 overflow-hidden">
                <img src={LOGO_URL} alt="iVisit" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <div>
              <h1 className="font-heading font-black text-4xl tracking-tight text-white mb-1">
                iVisit <span className="text-primary italic">Intelligence</span>
              </h1>
              <p className="font-sans text-[10px] text-white/30 uppercase tracking-[0.4em] font-black">Autonomous Synthesis Engine v4.6</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-2xl">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-primary/10 rounded-[1.5rem] border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#86100E]" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Active Link: Claude 4.6</span>
            </div>
          </div>
        </header>

        <main className="grid lg:grid-cols-12 gap-10 items-stretch">
          {/* Main Control Panel */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-10">
            <Card variant="glass" className="relative p-10 md:p-16 overflow-hidden border-white/10 group rounded-[3rem]">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-1000 rotate-12">
                <Sparkles className="w-64 h-64" />
              </div>

              <div className="relative z-10 space-y-16">
                <div className="space-y-6">
                  <h2 className="font-heading font-black text-5xl md:text-6xl text-white tracking-tighter leading-none">
                    Synthesis <span className="text-primary">Objective.</span>
                  </h2>
                  <p className="font-sans text-white/40 text-xl leading-relaxed max-w-2xl">
                    Deploy high-fidelity documentation protocols. Our neural engine synthesizes operational, legal, and medical standards with surgical precision.
                  </p>
                </div>

                {/* Doc Type Selector */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Business Proposal', 'Technical Spec', 'Legal Policy', 'PRD'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setDocType(type)}
                      className={`h-24 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all duration-500 border-2 ${docType === type
                        ? 'bg-primary border-primary text-white shadow-[0_0_40px_rgba(134,16,14,0.3)] scale-105'
                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:border-white/20'
                        }`}
                    >
                      <span className="font-heading font-black text-xs uppercase tracking-widest">{type}</span>
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-2">
                    <label className="font-heading text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
                      Custom Directive
                    </label>
                    <div className="flex items-center gap-2 text-[10px] font-black text-white/10 uppercase tracking-widest">
                      <FileSearch className="w-3 h-3" /> Optional Context Extension
                    </div>
                  </div>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full px-10 py-8 rounded-[2.5rem] bg-black/50 border-2 border-white/5 text-xl text-white placeholder-white/10 font-sans focus:outline-none focus:border-primary/50 transition-all hover:bg-black/70 resize-none shadow-inner"
                    rows={4}
                    placeholder={docType === 'Custom Request' ? "Describe exact protocol requirements..." : "Inject specific details, medical requirements, or operational constraints..."}
                  />
                </div>

                {/* Actions */}
                <div className="pt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8">
                  <button
                    onClick={() => setUseSupabase(!useSupabase)}
                    className="flex items-center gap-5 group"
                  >
                    <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${useSupabase ? 'bg-primary border-primary shadow-[0_0_20px_rgba(134,16,14,0.4)]' : 'border-white/10 bg-white/5'}`}>
                      {useSupabase && <Check className="w-6 h-6 text-white" />}
                    </div>
                    <div className="text-left">
                      <span className={`block font-black text-xs uppercase tracking-widest transition-colors ${useSupabase ? 'text-primary' : 'text-white/40'}`}>Semantic Memory Buffer</span>
                      <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">Correlate with Project Knowledge</span>
                    </div>
                  </button>

                  <Button
                    onClick={generateDocument}
                    disabled={isGenerating}
                    size="lg"
                    className="relative group h-20 px-16 rounded-[2.5rem] overflow-hidden bg-primary hover:bg-[#86100E] text-white shadow-2xl shadow-primary/30 text-lg font-black tracking-tighter border-2 border-primary"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {isGenerating ? (
                      <><Loader2 className="mr-4 h-6 w-6 animate-spin" />Synthesis Protocol Active...</>
                    ) : (
                      <><Sparkles className="mr-4 h-6 w-6" />Initiate Generation</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Neural Transmission Terminal */}
            <Card variant="default" className="bg-black/60 border-white/5 overflow-hidden rounded-[2.5rem] border-2 shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <div className="w-2 h-2 rounded-full bg-primary absolute" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em]">Neural Transmission Feed</span>
                    <p className="text-[8px] text-primary/60 font-mono font-bold uppercase tracking-widest">Awaiting Uplink Protocol...</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-[9px] text-white/20 font-mono font-bold tracking-widest hidden md:block">CHNL_SECURE_7A // BUFFER_OVRFLOW: 0%</div>
                  <div className="w-px h-6 bg-white/5" />
                  <Database className="w-4 h-4 text-white/20" />
                </div>
              </div>
              <div ref={logContainerRef} className="p-10 h-80 overflow-y-auto font-mono text-[11px] leading-relaxed scroll-smooth scrollbar-hide bg-black/20">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/5 space-y-6">
                    <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center animate-pulse">
                      <Zap className="w-8 h-8 opacity-20" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="uppercase tracking-[0.6em] font-black text-[10px]">Neural Standby Mode</p>
                      <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Deploy directive to initiate synthesis</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log, i) => (
                      <div key={i} className="flex border-l-2 border-primary/20 pl-8 py-2 hover:bg-white/[0.02] transition-colors group relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-1 h-full bg-primary/0 group-hover:bg-primary/40 transition-all" />
                        <span className="text-primary/30 mr-8 tabular-nums w-12 font-bold group-hover:text-primary transition-colors text-right">
                          {(i + 1).toString().padStart(4, '0')}
                        </span>
                        <div className="flex-1">
                          <span className="text-white/60 group-hover:text-white transition-all duration-300 tracking-tight block">
                            {log.startsWith('🚀') || log.startsWith('📡') || log.startsWith('ℹ️') || log.startsWith('⚠️') || log.startsWith('✅') || log.startsWith('❌') ? (
                              log
                            ) : (
                              <span className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                                {log}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-[8px] text-white/5 group-hover:text-white/20 transition-all font-bold ml-4">
                          {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}:{(Date.now() % 1000).toString().padStart(3, '0')}
                        </span>
                      </div>
                    ))}
                    {isGenerating && (
                      <div className="flex items-center gap-4 pl-8 mt-6">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-primary italic font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Synchronizing Cognitive Deltas...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]" />
                    <span className="text-[8px] font-black text-green-500/50 uppercase tracking-widest">Encrypt Link: Active</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_#86100E]" />
                    <span className="text-[8px] font-black text-primary/50 uppercase tracking-widest">Neural Load: 12.4%</span>
                  </div>
                </div>
                <div className="text-[8px] font-mono font-bold text-white/10 uppercase tracking-[0.3em]">
                  IVISIT_PROTOCOL_v4.6.0822
                </div>
              </div>
            </Card>
          </div>

          {/* Records Archive */}
          <div className="lg:col-span-12 xl:col-span-4 h-full flex flex-col gap-10">
            <Card variant="glass" className="flex-1 border-white/5 flex flex-col p-0 overflow-hidden rounded-[3rem] border-2 shadow-2xl relative">
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                <FileText className="w-64 h-64" />
              </div>

              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-[1.8rem] border border-primary/20 flex items-center justify-center shadow-inner">
                    <Database className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-2xl text-white tracking-tight">Intelligence Archive</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black mt-1">Classification Secure</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 relative z-10 scrollbar-hide">
                {recentDocs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-8 opacity-20">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/10 rounded-full blur-[60px] scale-150 animate-pulse" />
                      <FileSearch className="w-24 h-24 text-white" />
                    </div>
                    <div className="space-y-3">
                      <p className="font-black text-xs text-white uppercase tracking-[0.4em]">Historical Buffer Empty</p>
                      <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Protocol synthesis required for archival</p>
                    </div>
                  </div>
                ) : (
                  recentDocs.map((doc: any, index: number) => (
                    <div
                      key={doc.id || index}
                      className="group relative"
                      onClick={() => {
                        setCurrentDoc(doc);
                        setShowPreview(true);
                      }}
                    >
                      <div className="absolute inset-x-0 -inset-y-2 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-[2.5rem] border-l-4 border-primary" />
                      <div className="relative p-7 rounded-[2.5rem] bg-white/[0.02] border border-white/5 transition-all duration-500 cursor-pointer flex flex-col gap-6 ring-1 ring-white/5 group-hover:bg-white/[0.04] group-hover:ring-primary/20 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-black border border-white/10 flex items-center justify-center group-hover:border-primary/40 transition-all duration-500 shadow-2xl group-hover:shadow-primary/20 shrink-0">
                              <FileText className={`w-8 h-8 ${doc.id === 'mock-1' ? 'text-primary' : 'text-white/20 group-hover:text-primary'} transition-colors duration-500`} />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-heading font-black text-white text-base group-hover:text-primary transition-colors duration-500 line-clamp-1 tracking-tighter">
                                {doc.title?.replace(/^#\s*/, '') || (doc.type + " Protocol")}
                              </h4>
                              <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">
                                  {new Date(doc.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                                  {doc.type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 hover:bg-primary hover:text-white border border-white/10 overflow-hidden group-hover:scale-110">
                            <Printer className="w-5 h-5" />
                          </div>
                        </div>
                        {/* Preview Snippet */}
                        <div className="px-2">
                          <p className="text-[10px] text-white/20 font-sans italic group-hover:text-white/40 transition-colors line-clamp-2 leading-relaxed">
                            {doc.content?.replace(/[#*`]/g, '').slice(0, 100)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-10 bg-black/40 border-t border-white/5 relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse" />
                    Archive Synchronized
                  </div>
                  <span>Secure Node: AU-79</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-gradient-to-r from-primary/20 to-primary/60" />
                </div>
              </div>
            </Card>
          </div>
        </main>

        {/* Feature Grid */}
        <footer className="mt-32 grid md:grid-cols-3 gap-10">
          {[
            { icon: <Zap className="w-7 h-7 text-white" />, color: "from-[#86100E] to-black", title: "Autonomous logic", desc: "Powered by Claude 4.6 Intelligence" },
            { icon: <Palette className="w-7 h-7 text-white" />, color: "from-[#86100E]/80 to-black", title: "Physical Standard", desc: "Surgical precision visual formatting" },
            { icon: <Database className="w-7 h-7 text-white" />, color: "from-[#86100E]/60 to-black", title: "Neural Archive", desc: "Context-aware persistence protocols" }
          ].map((feature, i) => (
            <Card key={i} className="p-14 text-center hover:bg-white/[0.04] transition-all duration-700 border-white/5 group rounded-[3.5rem] border-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
              <div className={`w-24 h-24 bg-gradient-to-br ${feature.color} rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 ring-1 ring-white/10`}>
                {feature.icon}
              </div>
              <h3 className="font-heading font-black text-2xl text-white mb-4 uppercase tracking-tighter group-hover:text-primary transition-colors">{feature.title}</h3>
              <p className="font-sans text-white/30 text-[10px] font-black uppercase tracking-[0.3em] leading-relaxed max-w-[200px] mx-auto opacity-60 group-hover:opacity-100 transition-opacity">{feature.desc}</p>
            </Card>
          ))}
        </footer>

        {/* Bottom Status Bar */}
        <div className="mt-20 border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
          <div className="flex items-center gap-8">
            <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">© 2026 iVisit Collective</div>
            <div className="w-px h-4 bg-white/10 hidden md:block" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Surgical precision documentation</div>
          </div>
          <div className="flex gap-10">
            {['Security', 'Privacy', 'Neural'].map(link => (
              <a key={link} href="#" className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white transition-colors">{link}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
