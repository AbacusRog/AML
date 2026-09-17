export interface CHSearchResult {
  name: string;
  companyNumber: string;
  status: string;
  addressSnippet: string;
}

export interface CHDirector {
  name: string;
  appointedOn: string | null;
}

export interface CHCompanyCheck {
  name: string;
  companyNumber: string;
  status: string;
  type: string;
  address: string;
  directors: CHDirector[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function searchCompaniesHouse(query: string): Promise<CHSearchResult[]> {
  const res = await fetch(`/api/companies-house/search?q=${encodeURIComponent(query)}`);
  const data = await handle<{ items: CHSearchResult[] }>(res);
  return data.items;
}

export async function getCompaniesHouseCheck(companyNumber: string): Promise<CHCompanyCheck> {
  const res = await fetch(`/api/companies-house/company?number=${encodeURIComponent(companyNumber)}`);
  return handle<CHCompanyCheck>(res);
}

/** Loose match: case/whitespace/punctuation-insensitive. Good enough for flagging, not for silently auto-accepting. */
export function looseEquals(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(a) === norm(b);
}
