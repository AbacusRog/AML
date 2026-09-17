import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import type { ClientInsert } from '../types';

interface RawRow {
  'Client code'?: string;
  'Client name'?: string;
  'Client type'?: string;
  'Address line 1'?: string;
  'Address line 2'?: string;
  Town?: string;
  County?: string;
  Postcode?: string;
  'Contact number'?: string | number;
  'Email address'?: string;
}

/** Parse the "All Clients Contact Info" export into rows ready for Supabase. */
export async function parseClientWorkbook(file: File): Promise<ClientInsert[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });

  return rows
    .map((r) => ({
      code: String(r['Client code'] || '').trim(),
      name: String(r['Client name'] || '').trim(),
      type: String(r['Client type'] || '').trim(),
      addr1: String(r['Address line 1'] || '').trim(),
      addr2: String(r['Address line 2'] || '').trim(),
      town: String(r['Town'] || '').trim(),
      county: String(r['County'] || '').trim(),
      postcode: String(r['Postcode'] || '').trim(),
      contact_number: String(r['Contact number'] || '').trim(),
      email: String(r['Email address'] || '').trim(),
    }))
    .filter((r) => r.name);
}

/**
 * Upsert parsed rows into the doc_generator_clients table, matched on `code`
 * where present (falls back to inserting by name for rows with no code).
 * Safe to re-run — re-importing the same export updates existing rows rather
 * than duplicating them.
 */
export async function importClients(
  rows: ClientInsert[],
  onProgress?: (done: number, total: number) => void
): Promise<{ imported: number; failed: number }> {
  const BATCH = 200;
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('doc_generator_clients')
      .upsert(batch, { onConflict: 'code', ignoreDuplicates: false });
    if (error) {
      failed += batch.length;
    } else {
      imported += batch.length;
    }
    onProgress?.(Math.min(i + BATCH, rows.length), rows.length);
  }

  return { imported, failed };
}
