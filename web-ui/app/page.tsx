'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Zap, Palette, Database, Check, Loader2, Sparkles, Printer } from 'lucide-react';
import { marked } from 'marked';

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
    const stored = localStorage.getItem('recentDocuments');
    if (stored) {
      setRecentDocs(JSON.parse(stored));
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
    setLogs([]); // Clear logs

    // Construct the final prompt
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
          // Append CLI logs if available
          const cliLogs = result.document.logs.split('\n').filter((l: string) => l.trim() !== '');
          setLogs(prev => [...prev, ...cliLogs]);
        }

        toast.success("Document Generated", {
          description: `${docType} created successfully`,
        });

        const newDoc = {
          ...result.document,
          type: docType,
          id: Date.now(), // Simple ID
          timestamp: new Date().toISOString()
        };

        setCurrentDoc(newDoc);
        const updated = [newDoc, ...recentDocs.slice(0, 4)];
        setRecentDocs(updated);
        localStorage.setItem('recentDocuments', JSON.stringify(updated));

        // Show preview immediately
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = marked.parse(currentDoc.content || '');

      printWindow.document.write(`
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
              
              /* Branding Header */
              .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #86100E;
                padding-bottom: 20px;
                margin-bottom: 40px;
              }
              
              .logo-container {
                display: flex;
                align-items: center;
                gap: 15px;
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
              }
              
              .doc-meta {
                text-align: right;
                font-size: 12px;
                color: #666;
              }
              
              /* Content Styling */
              h1, h2, h3, h4 {
                font-family: 'Space Grotesk', sans-serif;
                color: #86100E;
                margin-top: 1.5em;
                margin-bottom: 0.5em;
              }
              
              h1 { font-size: 32px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
              h2 { font-size: 24px; }
              h3 { font-size: 20px; }
              
              p { margin-bottom: 1em; }
              
              ul, ol {
                margin-bottom: 1em;
                padding-left: 20px;
              }
              
              li { margin-bottom: 0.5em; }
              
              code {
                background: #f5f5f5;
                padding: 2px 5px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 0.9em;
              }
              
              pre {
                background: #f8f8f8;
                padding: 15px;
                border-radius: 8px;
                overflow-x: auto;
                border: 1px solid #eee;
              }
              
              blockquote {
                border-left: 4px solid #86100E;
                margin: 0;
                padding-left: 15px;
                color: #555;
                font-style: italic;
              }
              
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
                font-weight: 600;
              }
              
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-container">
                <!-- Fallback to CSS logo if image fails -->
                <div class="logo">iV</div>
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
            
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen selection:bg-primary/30 relative">
      {/* Preview Modal */}
      {showPreview && currentDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold font-heading text-lg">
                  iV
                </div>
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
                  onClick={handlePrint}
                  className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20"
                >
                  <Printer className="w-4 h-4" />
                  Print Document
                </Button>
                <Button
                  onClick={() => setShowPreview(false)}
                  variant="ghost"
                  className="hover:bg-gray-100 text-gray-500"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-gray-50">
              <div className="max-w-3xl mx-auto bg-white shadow-sm p-12 min-h-full rounded-xl prose prose-red prose-headings:font-heading prose-headings:font-bold prose-p:font-sans prose-lg">
                <div dangerouslySetInnerHTML={{ __html: marked.parse(currentDoc.content || '') }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <header className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/20 blur-[100px] rounded-full -z-10" />

          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-3xl mb-8 shadow-2xl shadow-primary/30 animate-float">
            <span className="font-heading font-bold text-white text-3xl">iV</span>
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

        {/* Main Content */}
        <main className="grid lg:grid-cols-12 gap-8 mb-20">
          {/* Generator Panel */}
          <div className="lg:col-span-7">
            <Card variant="glass" className="h-full border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[80px] rounded-full -z-10 transition-all duration-700 group-hover:bg-accent/20" />

              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-white">
                  Generate Document
                </h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-heading text-sm font-medium text-white/80 ml-1">
                    Document Type
                  </label>
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
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                      ▼
                    </div>
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
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={useSupabase}
                      onChange={(e) => setUseSupabase(e.target.checked)}
                    />
                    <span className="text-sm text-white/80 group-hover/check:text-white transition-colors">
                      Enable Memory (Supabase)
                    </span>
                  </label>

                  <div className="flex gap-3">
                    {currentDoc && (
                      <Button
                        onClick={handlePrint}
                        variant="secondary"
                        className="bg-white/10 hover:bg-white/20 text-white"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                    )}

                    <Button
                      onClick={generateDocument}
                      disabled={isGenerating}
                      className="shadow-xl shadow-primary/20"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate Document
                          <Sparkles className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Real-time Logs Area */}
                {(isGenerating || logs.length > 0) && (
                  <div
                    ref={logContainerRef}
                    className="mt-6 p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-green-400 max-h-40 overflow-y-auto scroll-smooth"
                  >
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

          {/* Recent Documents */}
          <div className="lg:col-span-5">
            <Card variant="default" className="h-full border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/5 rounded-2xl">
                  <FileText className="w-6 h-6 text-white/80" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-white">
                  Recent Files
                </h2>
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

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap className="w-6 h-6 text-white" />,
              color: "from-amber-500 to-orange-600",
              title: "Ultra-Fast",
              desc: "Powered by Claude Opus 4.6 for lightning generation"
            },
            {
              icon: <Palette className="w-6 h-6 text-white" />,
              color: "from-blue-500 to-indigo-600",
              title: "Apple Design",
              desc: "Pixel-perfect formatting with iVisit branding"
            },
            {
              icon: <Database className="w-6 h-6 text-white" />,
              color: "from-emerald-500 to-green-600",
              title: "Smart Memory",
              desc: "Context-aware generation via Supabase vector store"
            }
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
