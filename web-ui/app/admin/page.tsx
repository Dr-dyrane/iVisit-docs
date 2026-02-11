'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
    Shield, FileText, Send, Users, Check, X, Clock, Unlock, Lock,
    Plus, Trash2, Save, Sparkles, ChevronDown, RefreshCw, Eye,
    Pencil, Copy
} from 'lucide-react';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

const TABS = [
    { id: 'requests', label: 'Requests', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'generate', label: 'Generate', icon: Sparkles },
    { id: 'invites', label: 'Invites', icon: Send },
] as const;

type TabId = typeof TABS[number]['id'];

const ROLES = ['admin', 'sponsor', 'lawyer', 'cto', 'developer', 'viewer'];

// ─── Main Page ───────────────────────────────────────────────
export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('requests');

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-foreground/5 animate-pulse" />
            </div>
        );
    }

    if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
                    <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Access Denied</h2>
                    <p className="text-sm text-foreground/30">Administrator privileges required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-6 py-8 lg:px-12 lg:py-12 max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="mb-10"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-foreground/30 font-mono uppercase tracking-[0.2em]">
                        Admin Console
                    </span>
                </div>
                <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
                    Command Center
                </h1>
            </motion.div>

            {/* Tab Bar */}
            <div className="flex gap-1 mb-8 p-1 bg-foreground/[0.03] rounded-xl w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200 ease-glide
                        ${activeTab === id
                                ? 'bg-foreground/[0.08] text-foreground'
                                : 'text-foreground/30 hover:text-foreground/50 hover:bg-foreground/[0.03]'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                    {activeTab === 'requests' && <RequestsTab />}
                    {activeTab === 'documents' && <DocumentsTab />}
                    {activeTab === 'generate' && <GenerateTab />}
                    {activeTab === 'invites' && <InvitesTab />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ─── Requests Tab ────────────────────────────────────────────
function RequestsTab() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/admin/access');
        if (res.ok) {
            const data = await res.json();
            setRequests(data.requests || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Realtime subscription for new requests
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('admin_access_requests')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'access_requests',
            }, () => load())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [load]);

    const handleAction = async (requestId: string, status: 'approved' | 'revoked') => {
        setUpdating(requestId);
        const res = await fetch('/api/admin/access', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, status }),
        });
        if (res.ok) {
            toast.success(status === 'approved' ? 'Access granted' : 'Access revoked');
            load();
        } else {
            toast.error('Failed to update access');
        }
        setUpdating(null);
    };

    const pending = requests.filter(r => r.status === 'pending');
    const active = requests.filter(r => r.status === 'approved');
    const revoked = requests.filter(r => r.status === 'revoked');

    if (loading) return <LoadingPlaceholder />;

    return (
        <div className="space-y-8">
            {/* Pending Requests */}
            <Section title="Pending Requests" count={pending.length} color="warning">
                {pending.length === 0 ? (
                    <EmptyState icon={Clock} message="No pending requests" />
                ) : (
                    <div className="space-y-2">
                        {pending.map((r) => (
                            <RequestRow key={r.id} request={r} updating={updating} onAction={handleAction} />
                        ))}
                    </div>
                )}
            </Section>

            {/* Active Access */}
            <Section title="Active Access" count={active.length} color="success">
                {active.length === 0 ? (
                    <EmptyState icon={Unlock} message="No active access grants" />
                ) : (
                    <div className="space-y-2">
                        {active.map((r) => (
                            <RequestRow key={r.id} request={r} updating={updating} onAction={handleAction} />
                        ))}
                    </div>
                )}
            </Section>

            {/* Revoked */}
            {revoked.length > 0 && (
                <Section title="Revoked" count={revoked.length} color="destructive">
                    <div className="space-y-2">
                        {revoked.map((r) => (
                            <RequestRow key={r.id} request={r} updating={updating} onAction={handleAction} />
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}

function RequestRow({ request: r, updating, onAction }: any) {
    const statusColors: Record<string, string> = {
        pending: 'bg-amber-500/20 text-amber-400',
        approved: 'bg-emerald-500/20 text-emerald-400',
        revoked: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.user_email}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase ${statusColors[r.status]}`}>
                        {r.status}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-foreground/25">
                    <span>{r.documents?.title || 'Unknown'}</span>
                    <span>·</span>
                    <span>{r.signer_name || 'No name'}</span>
                    <span>·</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {r.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onAction(r.id, 'approved')}
                            disabled={updating === r.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400
                         hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                        </button>
                        <button
                            onClick={() => onAction(r.id, 'revoked')}
                            disabled={updating === r.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400
                         hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            <X className="w-3.5 h-3.5" />
                            Deny
                        </button>
                    </>
                )}
                {r.status === 'approved' && (
                    <button
                        onClick={() => onAction(r.id, 'revoked')}
                        disabled={updating === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400
                       hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        <Lock className="w-3.5 h-3.5" />
                        Revoke
                    </button>
                )}
                {r.status === 'revoked' && (
                    <button
                        onClick={() => onAction(r.id, 'approved')}
                        disabled={updating === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400
                       hover:bg-emerald-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        <Unlock className="w-3.5 h-3.5" />
                        Restore
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Documents Tab ───────────────────────────────────────────
function DocumentsTab() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<any | null>(null);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/admin/documents');
        if (res.ok) {
            const data = await res.json();
            setDocuments(data.documents || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (doc: any) => {
        const isNew = !doc.id;
        const method = isNew ? 'POST' : 'PUT';

        const res = await fetch('/api/admin/documents', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(doc),
        });

        if (res.ok) {
            toast.success(isNew ? 'Document created' : 'Document updated');
            setEditing(null);
            setCreating(false);
            load();
        } else {
            const err = await res.json();
            toast.error(err.error || 'Save failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this document permanently?')) return;

        const res = await fetch(`/api/admin/documents?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Document deleted');
            load();
        } else {
            toast.error('Delete failed');
        }
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/25 font-mono">{documents.length} documents</p>
                <button
                    onClick={() => {
                        setCreating(true);
                        setEditing({
                            slug: '', title: '', description: '', tier: 'confidential',
                            visibility: ['admin'], content: '', icon: 'file-text',
                        });
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.06] text-foreground/60
                     hover:bg-foreground/[0.1] text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Document
                </button>
            </div>

            {/* Editor Modal */}
            <AnimatePresence>
                {editing && (
                    <DocumentEditor
                        doc={editing}
                        isNew={creating}
                        onSave={handleSave}
                        onCancel={() => { setEditing(null); setCreating(false); }}
                    />
                )}
            </AnimatePresence>

            {/* Document Grid */}
            <div className="grid gap-3">
                {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-colors group">
                        <FileText className="w-5 h-5 text-foreground/20 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-foreground/20 font-mono">/{doc.slug}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/[0.04] text-foreground/30 font-mono uppercase">
                                    {doc.tier}
                                </span>
                                {(doc.visibility || []).map((role: string) => (
                                    <span key={role} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/60 font-mono">
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => { setEditing(doc); setCreating(false); }}
                                className="p-2 rounded-lg hover:bg-foreground/[0.06] text-foreground/20 hover:text-foreground/50 transition-colors"
                                title="Edit"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-foreground/20 hover:text-red-400 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DocumentEditor({ doc, isNew, onSave, onCancel }: any) {
    const [form, setForm] = useState(doc);
    const [saving, setSaving] = useState(false);

    const update = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

    const handleSubmit = async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    const toggleRole = (role: string) => {
        const vis = form.visibility || [];
        update('visibility', vis.includes(role) ? vis.filter((r: string) => r !== role) : [...vis, role]);
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
        >
            <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] space-y-5">
                <h3 className="text-sm font-heading font-semibold text-foreground">
                    {isNew ? 'Create Document' : 'Edit Document'}
                </h3>

                {/* Basic fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Title" value={form.title} onChange={(v) => update('title', v)} />
                    <Field label="Slug" value={form.slug} onChange={(v) => update('slug', v)} disabled={!isNew} />
                    <Field label="Description" value={form.description} onChange={(v) => update('description', v)} />
                    <div>
                        <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-1.5 block">Tier</label>
                        <select
                            value={form.tier}
                            onChange={(e) => update('tier', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-sm text-foreground
                         focus:outline-none focus:ring-1 focus:ring-foreground/10"
                        >
                            <option value="public">Public</option>
                            <option value="confidential">Confidential</option>
                            <option value="restricted">Restricted</option>
                        </select>
                    </div>
                </div>

                {/* Visibility Roles */}
                <div>
                    <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-2 block">Visibility</label>
                    <div className="flex flex-wrap gap-2">
                        {ROLES.map((role) => (
                            <button
                                key={role}
                                onClick={() => toggleRole(role)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                  ${(form.visibility || []).includes(role)
                                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                                        : 'bg-foreground/[0.04] text-foreground/25 hover:bg-foreground/[0.06]'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Editor */}
                <div>
                    <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-1.5 block">Content (Markdown)</label>
                    <textarea
                        value={form.content || ''}
                        onChange={(e) => update('content', e.target.value)}
                        rows={12}
                        className="w-full px-4 py-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-sm text-foreground/80
                       font-mono leading-relaxed resize-y
                       focus:outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-foreground/15"
                        placeholder="# Document Title\n\nWrite your markdown content here..."
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm text-foreground/30 hover:text-foreground/50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !form.title || !form.slug}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground/[0.08] text-foreground
                       hover:bg-foreground/[0.12] text-sm font-medium transition-colors disabled:opacity-40"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Generate Tab ────────────────────────────────────────────
function GenerateTab() {
    const [docType, setDocType] = useState('business_proposal');
    const [customPrompt, setCustomPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<{ title: string; content: string } | null>(null);

    const DOC_TYPES = [
        { value: 'business_proposal', label: 'Business Proposal' },
        { value: 'privacy_policy', label: 'Privacy Policy' },
        { value: 'technical_spec', label: 'Technical Specification' },
        { value: 'legal_agreement', label: 'Legal Agreement' },
        { value: 'master_plan', label: 'Master Plan' },
        { value: 'custom', label: 'Custom Prompt' },
    ];

    const generate = async () => {
        setGenerating(true);
        setResult(null);

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    doc_type: docType,
                    custom_prompt: customPrompt,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setResult({ title: data.title, content: data.content });
                toast.success('Document generated');
            } else {
                toast.error('Generation failed');
            }
        } catch {
            toast.error('Generation error');
        }
        setGenerating(false);
    };

    const saveGenerated = async () => {
        if (!result) return;

        const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const res = await fetch('/api/admin/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slug,
                title: result.title,
                description: 'AI-generated document',
                tier: 'confidential',
                visibility: ['admin'],
                content: result.content,
            }),
        });

        if (res.ok) {
            toast.success('Saved to document library');
        } else {
            toast.error('Save failed');
        }
    };

    return (
        <div className="space-y-6">
            {/* Configuration */}
            <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-sm font-heading font-semibold text-foreground">AI Document Generator</h3>
                </div>

                <div>
                    <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-1.5 block">Document Type</label>
                    <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-sm text-foreground
                       focus:outline-none focus:ring-1 focus:ring-foreground/10"
                    >
                        {DOC_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-1.5 block">
                        {docType === 'custom' ? 'Prompt' : 'Additional Instructions (optional)'}
                    </label>
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] text-sm text-foreground/80
                       font-mono resize-y focus:outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-foreground/15"
                        placeholder={docType === 'custom' ? 'Describe the document you want to generate...' : 'Any additional context or requirements...'}
                    />
                </div>

                <button
                    onClick={generate}
                    disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-300
                     hover:bg-purple-500/30 text-sm font-medium transition-colors disabled:opacity-40"
                >
                    {generating ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Generating…
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate Document
                        </>
                    )}
                </button>
            </div>

            {/* Result */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-heading font-semibold text-foreground">{result.title}</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { navigator.clipboard.writeText(result.content); toast.success('Copied'); }}
                                className="p-2 rounded-lg hover:bg-foreground/[0.06] text-foreground/20 hover:text-foreground/50 transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                onClick={saveGenerated}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400
                           hover:bg-emerald-500/20 text-xs font-medium transition-colors"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Save to Library
                            </button>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-foreground/[0.06] text-sm text-foreground/60 font-mono leading-relaxed whitespace-pre-wrap">
                        {result.content}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ─── Invites Tab ─────────────────────────────────────────────
function InvitesTab() {
    const [invites, setInvites] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [docId, setDocId] = useState('');
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [invRes, docRes] = await Promise.all([
            fetch('/api/invite').then(r => r.json()).catch(() => ({ invites: [] })),
            fetch('/api/admin/documents').then(r => r.json()).catch(() => ({ documents: [] })),
        ]);
        setInvites(invRes.invites || []);
        setDocuments(docRes.documents || []);
        if (docRes.documents?.length) setDocId(docRes.documents[0].id);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSend = async () => {
        if (!email || !docId) return;
        setSending(true);

        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, document_id: docId }),
        });

        if (res.ok) {
            const data = await res.json();
            const link = `${window.location.origin}/invite/${data.token}`;
            await navigator.clipboard.writeText(link);
            toast.success('Invite created — link copied to clipboard');
            setEmail('');
            load();
        } else {
            toast.error('Failed to create invite');
        }
        setSending(false);
    };

    if (loading) return <LoadingPlaceholder />;

    return (
        <div className="space-y-6">
            {/* Create Invite */}
            <div className="p-6 rounded-2xl bg-foreground/[0.03] border border-foreground/[0.06] space-y-4">
                <h3 className="text-sm font-heading font-semibold text-foreground">Send Invite</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Email" value={email} onChange={setEmail} placeholder="investor@example.com" />
                    <div>
                        <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-1.5 block">Document</label>
                        <select
                            value={docId}
                            onChange={(e) => setDocId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-sm text-foreground
                         focus:outline-none focus:ring-1 focus:ring-foreground/10"
                        >
                            {documents.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleSend}
                            disabled={sending || !email || !docId}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-foreground/[0.06] text-foreground/60
                         hover:bg-foreground/[0.1] text-sm font-medium transition-colors disabled:opacity-40 w-full justify-center"
                        >
                            <Send className="w-4 h-4" />
                            {sending ? 'Sending…' : 'Create Invite'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Invites List */}
            <Section title="Invite History" count={invites.length} color="info">
                {invites.length === 0 ? (
                    <EmptyState icon={Send} message="No invites sent yet" />
                ) : (
                    <div className="space-y-2">
                        {invites.map((inv: any) => (
                            <div key={inv.id} className="flex items-center gap-4 p-4 rounded-xl bg-foreground/[0.02]">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground truncate">{inv.email}</p>
                                    <p className="text-xs text-foreground/20 mt-0.5">{new Date(inv.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase
                  ${inv.claimed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {inv.claimed ? 'Claimed' : 'Pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );
}

// ─── Shared Components ───────────────────────────────────────
function Section({ title, count, color, children }: any) {
    const colorDot: Record<string, string> = {
        warning: 'bg-amber-500',
        success: 'bg-emerald-500',
        destructive: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-1.5 h-1.5 rounded-full ${colorDot[color] || 'bg-foreground/20'}`} />
                <h3 className="text-xs text-foreground/30 font-mono uppercase tracking-[0.15em]">{title}</h3>
                <span className="text-[10px] text-foreground/15 font-mono">{count}</span>
            </div>
            {children}
        </div>
    );
}

function Field({ label, value, onChange, placeholder, disabled }: any) {
    return (
        <div>
            <label className="text-[11px] text-foreground/25 font-mono uppercase tracking-wider mb-1.5 block">{label}</label>
            <input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg bg-foreground/[0.04] border border-foreground/[0.06] text-sm text-foreground
                   focus:outline-none focus:ring-1 focus:ring-foreground/10 placeholder:text-foreground/15
                   disabled:opacity-40 disabled:cursor-not-allowed"
            />
        </div>
    );
}

function EmptyState({ icon: Icon, message }: any) {
    return (
        <div className="py-8 text-center">
            <Icon className="w-6 h-6 text-foreground/10 mx-auto mb-2" />
            <p className="text-xs text-foreground/20">{message}</p>
        </div>
    );
}

function LoadingPlaceholder() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-foreground/[0.02] animate-pulse" />
            ))}
        </div>
    );
}
