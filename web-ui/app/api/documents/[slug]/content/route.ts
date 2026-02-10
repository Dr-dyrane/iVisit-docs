import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

        // Map slug to file path
        const fileMap: Record<string, string> = {
            'business-proposal': 'iVisit_Definitive_Business_Proposal_2026.md',
            'master-plan': 'iVisit_Master_Plan_v2.md',
            'mutual-nda': 'iVisit_Mutual_NDA_External_2026.md',
            'print-engine': 'iVisit_Print_Engine_Blueprint.md',
        };

        const fileName = fileMap[slug];
        if (!fileName) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Try local docs first, then parent
        let filePath = path.join(process.cwd(), 'docs', fileName);
        if (!fs.existsSync(filePath)) {
            filePath = path.join(process.cwd(), '..', 'docs', fileName);
        }

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf8');

        return NextResponse.json({ content, slug });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
