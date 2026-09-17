import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { fullAddress } from '../lib/docGen';
import type { Client } from '../types';

interface Props {
  company: Client | null;
  directors: Client[];
  onSetCompany: (c: Client | null) => void;
  onToggleDirector: (c: Client) => void;
  onEdit: (c: Client) => void;
  onAddNew: () => void;
}

export default function ClientPicker({ company, directors, onSetCompany, onToggleDirector, onEdit, onAddNew }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('doc_generator_clients')
        .select('*')
        .or(`name.ilike.%${q}%,code.ilike.%${q}%`)
        .order('name')
        .limit(40);
      setLoading(false);
      if (!error && data) setResults(data as Client[]);
    }, 250); // debounce so we're not querying on every keystroke
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="search"
          placeholder="Search clients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-[#DAD5C9] rounded-sm outline-none focus:border-gold text-sm"
        />
        <button
          type="button"
          onClick={onAddNew}
          className="text-sm px-3 py-2 border border-[#DAD5C9] rounded-sm hover:border-gold whitespace-nowrap"
        >
          + Add client
        </button>
      </div>

      {loading && <p className="text-xs text-[#3E4C63]">Searching…</p>}

      {!loading && query && results.length === 0 && (
        <p className="text-sm text-[#3E4C63] text-center py-5">No matches.</p>
      )}

      {results.length > 0 && (
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-left text-[12px] text-[#3E4C63] border-b border-[#DAD5C9]">
              <th className="py-1.5 pr-2">Client</th>
              <th className="py-1.5 pr-2">Type</th>
              <th className="py-1.5 pr-2">Address</th>
              <th className="py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {results.map((c) => {
              const isCompany = company?.id === c.id;
              const isDirector = directors.some((d) => d.id === c.id);
              return (
                <tr key={c.id} className="border-b border-[#DAD5C9] hover:bg-[rgba(169,125,46,0.06)]">
                  <td className="py-1.5 pr-2">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[12.5px] text-[#3E4C63]">{c.code}</div>
                  </td>
                  <td className="py-1.5 pr-2">
                    <span className="text-[10.5px] border border-[#DAD5C9] rounded-full px-2 py-0.5 whitespace-nowrap">
                      {c.type || '—'}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-[12.5px] text-[#3E4C63]">{fullAddress(c) || '—'}</td>
                  <td className="py-1.5">
                    <div className="flex gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSetCompany(isCompany ? null : c)}
                        className={`text-[11.5px] px-2.5 py-1 rounded-full border ${
                          isCompany
                            ? 'bg-gold border-gold text-white'
                            : 'border-[#DAD5C9] text-[#3E4C63] hover:border-gold'
                        }`}
                      >
                        Company
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleDirector(c)}
                        className={`text-[11.5px] px-2.5 py-1 rounded-full border ${
                          isDirector
                            ? 'bg-gold border-gold text-white'
                            : 'border-[#DAD5C9] text-[#3E4C63] hover:border-gold'
                        }`}
                      >
                        + Director
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="text-[11.5px] px-2.5 py-1 rounded-full border border-[#DAD5C9] text-[#3E4C63] hover:border-gold"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
