import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  // Surfaced clearly rather than failing silently at the network layer —
  // set these in Cloudflare Pages' build environment variables.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(url, anonKey);
