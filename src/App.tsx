import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import ClientPicker from './components/ClientPicker';
import ImportPanel from './components/ImportPanel';
import GeneratePanel from './components/GeneratePanel';
import ClientEditModal from './components/ClientEditModal';
import CompaniesHouseCheck from './components/CompaniesHouseCheck';
import { getLinkedDirectors, saveDirectorLinks, removeDirectorLink } from './lib/directorLinks';
import type { Client } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still checking
  const [company, setCompany] = useState<Client | null>(null);
  const [directors, setDirectors] = useState<Client[]>([]);
  const [linkedNote, setLinkedNote] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null | 'new'>(null);
  const [checkingCompaniesHouse, setCheckingCompaniesHouse] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // brief auth check, avoids a login flash
  if (!session) return <Login />;

  function toggleDirector(c: Client) {
    setDirectors((prev) => (prev.some((d) => d.id === c.id) ? prev.filter((d) => d.id !== c.id) : [...prev, c]));
  }

  async function handleSetCompany(c: Client | null) {
    setCompany(c);
    setLinkedNote(null);
    if (!c) return;
    const linked = await getLinkedDirectors(c.id);
    if (linked.length) {
      setDirectors((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const toAdd = linked.filter((d) => !existingIds.has(d.id));
        return [...prev, ...toAdd];
      });
      setLinkedNote(`Auto-added ${linked.length} director${linked.length === 1 ? '' : 's'} previously linked to this company.`);
    }
  }

  async function handleSaveLink() {
    if (!company || !directors.length) return;
    try {
      await saveDirectorLinks(
        company.id,
        directors.map((d) => d.id)
      );
      setLinkedNote('Saved — these directors will auto-populate next time you pick this company.');
    } catch (err) {
      setLinkedNote((err as Error).message);
    }
  }

  async function handleRemoveDirector(d: Client) {
    if (company) await removeDirectorLink(company.id, d.id);
    toggleDirector(d);
  }

  // Client edit/add modal callbacks
  function handleClientSaved(saved: Client) {
    if (company?.id === saved.id) setCompany(saved);
    setDirectors((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
    setEditingClient(null);
  }
  function handleClientDeleted(id: string) {
    if (company?.id === id) setCompany(null);
    setDirectors((prev) => prev.filter((d) => d.id !== id));
    setEditingClient(null);
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="px-6 md:px-12 pt-8 pb-5 border-b border-[#DAD5C9] flex items-start justify-between">
        <div>
          <p className="italic text-goldDeep text-sm" style={{ fontFamily: 'Georgia, serif' }}>
            Abacus Consultancy
          </p>
          <h1 className="text-2xl mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
            Client Document Generator
          </h1>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-[#3E4C63] border border-[#DAD5C9] rounded-full px-3 py-1.5 hover:border-gold"
        >
          Sign out
        </button>
      </header>

      <main className="px-6 md:px-12 py-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-6 items-start">
        <div className="space-y-5">
          <section className="bg-white border border-[#DAD5C9] rounded-sm p-5">
            <h2 className="text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              Client list
            </h2>
            <ImportPanel />
          </section>

          <section className="bg-white border border-[#DAD5C9] rounded-sm p-5">
            <h2 className="text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              Find and select
            </h2>
            <p className="text-xs text-[#3E4C63] mb-3">
              Mark one row as the company, and any number as directors. Picking a company
              auto-adds any directors you've linked to it before.
            </p>
            <ClientPicker
              company={company}
              directors={directors}
              onSetCompany={handleSetCompany}
              onToggleDirector={toggleDirector}
              onEdit={(c) => setEditingClient(c)}
              onAddNew={() => setEditingClient('new')}
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-white border border-[#DAD5C9] rounded-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                Selected
              </h2>
              {company && directors.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveLink}
                  className="text-[11px] text-goldDeep hover:underline whitespace-nowrap"
                >
                  Save director list
                </button>
              )}
            </div>
            {linkedNote && <p className="text-xs text-[#3E4C63] mb-2">{linkedNote}</p>}
            {!company && directors.length === 0 && (
              <p className="text-sm text-[#3E4C63]">Nothing selected yet.</p>
            )}
            <ul>
              {company && (
                <li className="flex items-center justify-between py-2 border-b border-[#DAD5C9]">
                  <div>
                    <div className="font-semibold text-[13.5px]">{company.name}</div>
                    <div className="text-[11px] text-goldDeep uppercase tracking-wide">Company</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckingCompaniesHouse(true)}
                      className="text-xs text-[#3E4C63] hover:text-ink whitespace-nowrap"
                    >
                      Check Companies House
                    </button>
                    <button className="text-xs text-red-700" onClick={() => handleSetCompany(null)}>
                      Remove
                    </button>
                  </div>
                </li>
              )}
              {directors.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 border-b border-[#DAD5C9]">
                  <div>
                    <div className="font-semibold text-[13.5px]">{d.name}</div>
                    <div className="text-[11px] text-goldDeep uppercase tracking-wide">Director</div>
                  </div>
                  <button className="text-xs text-red-700" onClick={() => handleRemoveDirector(d)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border border-[#DAD5C9] rounded-sm p-5">
            <h2 className="text-lg mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Documents
            </h2>
            <GeneratePanel company={company} directors={directors} />
          </section>
        </div>
      </main>

      {editingClient !== null && (
        <ClientEditModal
          client={editingClient === 'new' ? null : editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={handleClientSaved}
          onDeleted={handleClientDeleted}
        />
      )}

      {checkingCompaniesHouse && company && (
        <CompaniesHouseCheck
          company={company}
          onClose={() => setCheckingCompaniesHouse(false)}
          onUpdated={(updated) => setCompany(updated)}
        />
      )}
    </div>
  );
}
