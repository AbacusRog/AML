import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { fullAddress } from '../lib/docGen';
import { getLinkedDirectors, saveDirectorLinks } from '../lib/directorLinks';
import {
  searchCompaniesHouse,
  getCompaniesHouseCheck,
  looseEquals,
  type CHSearchResult,
  type CHCompanyCheck,
} from '../lib/companiesHouse';
import type { Client } from '../types';

interface Props {
  company: Client;
  onClose: () => void;
  onUpdated: (updated: Client) => void;
}

export default function CompaniesHouseCheck({ company, onClose, onUpdated }: Props) {
  const [stage, setStage] = useState<'searching' | 'checking' | 'result' | 'error'>(
    company.company_number ? 'checking' : 'searching'
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(company.name);
  const [searchResults, setSearchResults] = useState<CHSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [check, setCheck] = useState<CHCompanyCheck | null>(null);
  const [linkedDirectors, setLinkedDirectors] = useState<Client[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null); // name of director being added, or 'update'
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());
  const [saveNote, setSaveNote] = useState<string | null>(null);

  useEffect(() => {
    if (company.company_number) runCheck(company.company_number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch() {
    setSearching(true);
    setError(null);
    try {
      const results = await searchCompaniesHouse(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function pickResult(result: CHSearchResult) {
    // Save the matched company number straight away so future checks skip the search step.
    const { error: updateError } = await supabase
      .from('doc_generator_clients')
      .update({ company_number: result.companyNumber })
      .eq('id', company.id);
    if (updateError) {
      setError(`Matched, but couldn't save the company number: ${updateError.message}`);
      return;
    }
    onUpdated({ ...company, company_number: result.companyNumber });
    setStage('checking');
    runCheck(result.companyNumber);
  }

  async function runCheck(companyNumber: string) {
    setStage('checking');
    setError(null);
    try {
      const [chData, linked] = await Promise.all([
        getCompaniesHouseCheck(companyNumber),
        getLinkedDirectors(company.id),
      ]);
      setCheck(chData);
      setLinkedDirectors(linked);
      setStage('result');
    } catch (err) {
      setError((err as Error).message);
      setStage('error');
    }
  }

  const nameMatches = check ? looseEquals(check.name, company.name) : true;
  const addressMatches = check ? looseEquals(check.address, fullAddress(company)) : true;
  const hasChanges = check && (!nameMatches || !addressMatches);

  const missingDirectors =
    check?.directors.filter(
      (d) => !linkedDirectors.some((ld) => looseEquals(ld.name, d.name)) && !addedNames.has(d.name)
    ) || [];
  const unlistedLinked =
    check && linkedDirectors.filter((ld) => !check.directors.some((d) => looseEquals(d.name, ld.name)));

  async function handleUpdateRecord() {
    if (!check) return;
    setBusyAction('update');
    const { error: updateError } = await supabase
      .from('doc_generator_clients')
      .update({ name: check.name, addr1: check.address, addr2: '', town: '', county: '', postcode: '' })
      .eq('id', company.id);
    setBusyAction(null);
    if (updateError) {
      setSaveNote(`Could not update: ${updateError.message}`);
      return;
    }
    onUpdated({ ...company, name: check.name, addr1: check.address, addr2: '', town: '', county: '', postcode: '' });
    setSaveNote('Record updated from Companies House.');
  }

  async function handleAddDirector(name: string) {
    setBusyAction(name);
    const { data, error: insertError } = await supabase
      .from('doc_generator_clients')
      .insert({ name, type: 'Individual' })
      .select()
      .single();
    if (insertError || !data) {
      setBusyAction(null);
      setSaveNote(`Could not add ${name}: ${insertError?.message || 'unknown error'}`);
      return;
    }
    try {
      await saveDirectorLinks(company.id, [data.id]);
      setAddedNames((prev) => new Set(prev).add(name));
    } catch (err) {
      setSaveNote((err as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-[#DAD5C9] rounded-sm p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg" style={{ fontFamily: 'Georgia, serif' }}>
            Check against Companies House
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-[#3E4C63] hover:text-ink">
            Close
          </button>
        </div>
        <p className="text-xs text-[#3E4C63] mb-4">{company.name}</p>

        {stage === 'searching' && (
          <div>
            <p className="text-sm text-[#3E4C63] mb-2">
              No company number on file yet — search Companies House to match it.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-[#DAD5C9] rounded-sm outline-none focus:border-gold text-sm"
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={searching}
                className="px-4 py-2 text-sm bg-gold hover:bg-goldDeep text-white rounded-sm font-semibold disabled:opacity-60"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {error && <p className="text-sm text-red-700 mb-3">{error}</p>}
            {searchResults.map((r) => (
              <div
                key={r.companyNumber}
                className="flex items-center justify-between py-2 border-b border-[#DAD5C9] text-sm"
              >
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-[#3E4C63]">
                    {r.companyNumber} · {r.status} · {r.addressSnippet}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="text-xs px-3 py-1.5 border border-[#DAD5C9] rounded-full hover:border-gold whitespace-nowrap"
                >
                  This one
                </button>
              </div>
            ))}
          </div>
        )}

        {stage === 'checking' && <p className="text-sm text-[#3E4C63]">Checking Companies House…</p>}

        {stage === 'error' && (
          <div>
            <p className="text-sm text-red-700 mb-3">{error}</p>
            {error?.includes('COMPANIES_HOUSE_API_KEY') && (
              <p className="text-xs text-[#3E4C63]">
                Set <code>COMPANIES_HOUSE_API_KEY</code> under this Pages project's environment
                variables in Cloudflare, then redeploy.
              </p>
            )}
          </div>
        )}

        {stage === 'result' && check && (
          <div>
            <div
              className={`text-xs mb-4 px-3 py-2 rounded-sm border ${
                check.status === 'active'
                  ? 'border-[#DAD5C9] text-[#3E4C63]'
                  : 'border-red-300 bg-red-50 text-red-700'
              }`}
            >
              {check.companyNumber} · Companies House status: <strong>{check.status}</strong>
              {check.status !== 'active' && ' — worth a closer look'}
            </div>

            <DiffRow label="Name" ours={company.name} theirs={check.name} matches={nameMatches} />
            <DiffRow label="Address" ours={fullAddress(company)} theirs={check.address} matches={addressMatches} />

            {hasChanges && (
              <button
                type="button"
                onClick={handleUpdateRecord}
                disabled={busyAction === 'update'}
                className="mt-2 mb-5 text-sm px-4 py-2 bg-gold hover:bg-goldDeep text-white rounded-sm font-semibold disabled:opacity-60"
              >
                {busyAction === 'update' ? 'Updating…' : 'Update our record to match'}
              </button>
            )}

            <h3 className="text-sm font-semibold mt-5 mb-2">Directors</h3>
            {missingDirectors.length === 0 && (!unlistedLinked || unlistedLinked.length === 0) && (
              <p className="text-sm text-[#3E4C63]">Matches what's linked here.</p>
            )}
            {missingDirectors.map((d) => (
              <div key={d.name} className="flex items-center justify-between py-1.5 text-sm">
                <span>
                  {d.name} <span className="text-xs text-[#3E4C63]">— on Companies House, not linked here</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAddDirector(d.name)}
                  disabled={busyAction === d.name}
                  className="text-xs px-3 py-1.5 border border-[#DAD5C9] rounded-full hover:border-gold whitespace-nowrap"
                >
                  {busyAction === d.name ? 'Adding…' : 'Add & link'}
                </button>
              </div>
            ))}
            {unlistedLinked?.map((ld) => (
              <div key={ld.id} className="py-1.5 text-sm text-[#3E4C63]">
                {ld.name} — linked here, but not a current active director on Companies House
              </div>
            ))}

            {saveNote && <p className="text-xs text-[#3E4C63] mt-4">{saveNote}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffRow({ label, ours, theirs, matches }: { label: string; ours: string; theirs: string; matches: boolean }) {
  return (
    <div className={`mb-3 text-sm ${matches ? '' : 'bg-amber-50 -mx-2 px-2 py-1.5 rounded-sm'}`}>
      <div className="text-xs text-[#3E4C63] mb-0.5">{label}</div>
      <div>{ours || '—'}</div>
      {!matches && (
        <div className="text-goldDeep">
          <span className="text-xs">Companies House: </span>
          {theirs || '—'}
        </div>
      )}
    </div>
  );
}
