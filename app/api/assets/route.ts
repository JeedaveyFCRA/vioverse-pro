import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

type Asset = { url: string; size: number };
type AssetIndex = { csv: Asset[]; pdfs: Asset[] };

export async function GET() {
  try {
    const base = path.join(process.cwd(), 'public');
    const csvDir = path.join(base, 'data', 'csv');
    const pdfDir = path.join(base, 'data', 'pdfs');

    const csvNamesRaw = await safeReaddir(csvDir);
    const pdfNamesRaw = await safeReaddir(pdfDir);

    const csvNames = csvNamesRaw.filter(n => !n.startsWith('.') && n.toLowerCase().endsWith('.csv'));
    const pdfNames = pdfNamesRaw.filter(n => !n.startsWith('.') && n.toLowerCase().endsWith('.pdf'));

    const csvStats = await Promise.all(csvNames.map(n => statSafe(path.join(csvDir, n))));
    const pdfStats = await Promise.all(pdfNames.map(n => statSafe(path.join(pdfDir, n))));

    const csv: Asset[] = csvNames.map((name, i) => ({
      url: `/data/csv/${encodeURIComponent(name)}`,
      size: csvStats[i]?.size ?? 0,
    }));

    const pdfs: Asset[] = pdfNames.map((name, i) => ({
      url: `/data/pdfs/${encodeURIComponent(name)}`,
      size: pdfStats[i]?.size ?? 0,
    }));

    const payload: AssetIndex = {
      csv: csv.sort((a, b) => a.url.localeCompare(b.url)),
      pdfs: pdfs.sort((a, b) => a.url.localeCompare(b.url)),
    };

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'ASSET_INDEX_ERROR' }, { status: 500 });
  }
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => e.name);
  } catch {
    return [];
  }
}

async function statSafe(p: string) {
  try { return await fs.stat(p); } catch { return null; }
}
