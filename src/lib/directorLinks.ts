import { supabase } from '../supabaseClient';
import type { Client } from '../types';

/** Directors previously linked to this company, most recently saved first. */
export async function getLinkedDirectors(companyId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('doc_generator_company_directors')
    .select('director_id, created_at, director:doc_generator_clients!director_id(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  // Supabase's nested-select typing doesn't know the FK shape ahead of time.
  return data.map((row: any) => row.director as Client).filter(Boolean);
}

/**
 * Record that these directors go with this company, so next time it's
 * selected they're suggested automatically. Additive — doesn't remove any
 * previously saved links (e.g. a director who left is still on file here
 * until you explicitly unlink them).
 */
export async function saveDirectorLinks(companyId: string, directorIds: string[]): Promise<void> {
  if (!directorIds.length) return;
  const rows = directorIds.map((director_id) => ({ company_id: companyId, director_id }));
  await supabase.from('doc_generator_company_directors').upsert(rows, { onConflict: 'company_id,director_id' });
}

export async function removeDirectorLink(companyId: string, directorId: string): Promise<void> {
  await supabase
    .from('doc_generator_company_directors')
    .delete()
    .eq('company_id', companyId)
    .eq('director_id', directorId);
}
