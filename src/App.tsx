import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import ClientPicker from './components/ClientPicker';
import ImportPanel from './components/ImportPanel';
import GeneratePanel from './components/GeneratePanel';
import type { Client } from './types';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still checking
  const [company, setCompany] = useState<Client | null>(null);
  const [directors, setDirectors] = useState<Client[]>([]);

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
              Mark one row as the company, and any number as directors.
            </p>
            <ClientPicker
              company={company}
              directors={directors}
              onSetCompany={setCompany}
              onToggleDirector={toggleDirector}
            />
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-white border border-[#DAD5C9] rounded-sm p-5">
            <h2 className="text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              Selected
            </h2>
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
                  <button className="text-xs text-red-700" onClick={() => setCompany(null)}>
                    Remove
                  </button>
                </li>
              )}
              {directors.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 border-b border-[#DAD5C9]">
                  <div>
                    <div className="font-semibold text-[13.5px]">{d.name}</div>
                    <div className="text-[11px] text-goldDeep uppercase tracking-wide">Director</div>
                  </div>
                  <button className="text-xs text-red-700" onClick={() => toggleDirector(d)}>
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
    </div>
  );
}
