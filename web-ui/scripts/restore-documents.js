import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
    console.error('   Run with: node --env-file=../.env scripts/restore-documents.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const docsDir = path.join(process.cwd(), '..', 'docs');

// Map file_path (from seed data) → local file
const FILE_MAP = [
    { slug: 'business-proposal', file: 'iVisit_Definitive_Business_Proposal_2026.md' },
    { slug: 'master-plan', file: 'iVisit_Master_Plan_v2.md' },
    { slug: 'mutual-nda', file: 'iVisit_Mutual_NDA_External_2026.md' },
    { slug: 'print-engine', file: 'iVisit_Print_Engine_Blueprint.md' },
];

async function restore() {
    for (const { slug, file } of FILE_MAP) {
        const filePath = path.join(docsDir, file);

        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${file} — skipping`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`📄 Uploading content for "${slug}" from ${file} (${content.length} chars)...`);

        const { error } = await supabase
            .from('documents')
            .update({ content })
            .eq('slug', slug);

        if (error) {
            console.error(`❌ Error updating ${slug}:`, error.message);
        } else {
            console.log(`✅ ${slug} — content uploaded`);
        }
    }

    // Also upload the internal NDA as a new document if it doesn't exist
    const internalNdaFile = 'iVisit_Mutual_NDA_2026.md';
    const internalNdaPath = path.join(docsDir, internalNdaFile);
    if (fs.existsSync(internalNdaPath)) {
        const content = fs.readFileSync(internalNdaPath, 'utf-8');
        console.log(`📄 Upserting internal NDA (${content.length} chars)...`);

        const { error } = await supabase
            .from('documents')
            .upsert({
                slug: 'mutual-nda-internal',
                title: 'Mutual Non-Disclosure Agreement (Internal)',
                description: 'Internal mutual NDA for iVisit team members and close partners.',
                tier: 'confidential',
                file_path: internalNdaFile,
                icon: 'shield',
                visibility: ['admin', 'sponsor', 'lawyer'],
                content,
            }, { onConflict: 'slug' });

        if (error) {
            console.error(`❌ Error upserting internal NDA:`, error.message);
        } else {
            console.log(`✅ mutual-nda-internal — content uploaded`);
        }
    }

    console.log('\n🎉 Restore complete.');
}

restore().catch(console.error);
