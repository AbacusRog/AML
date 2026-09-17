/**
 * GET /api/companies-house/company?number=<company number>
 *
 * Fetches the company profile and its officers from Companies House in
 * parallel and returns them combined. Same server-side-key pattern as
 * search.ts.
 */

interface CHAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

interface CHProfile {
  company_name: string;
  company_number: string;
  company_status: string;
  type: string;
  registered_office_address?: CHAddress;
}

interface CHOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
}

function formatAddress(a?: CHAddress): string {
  if (!a) return '';
  return [a.address_line_1, a.address_line_2, a.locality, a.region, a.postal_code]
    .filter(Boolean)
    .join(', ');
}

export const onRequestGet: PagesFunction<{ COMPANIES_HOUSE_API_KEY: string }> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const number = url.searchParams.get('number');

  if (!number || !number.trim()) {
    return Response.json({ error: 'Missing number parameter' }, { status: 400 });
  }
  if (!env.COMPANIES_HOUSE_API_KEY) {
    return Response.json(
      { error: 'COMPANIES_HOUSE_API_KEY is not set on this Pages project' },
      { status: 500 }
    );
  }

  const authHeader = 'Basic ' + btoa(`${env.COMPANIES_HOUSE_API_KEY}:`);
  const base = 'https://api.company-information.service.gov.uk';

  const [profileRes, officersRes] = await Promise.all([
    fetch(`${base}/company/${encodeURIComponent(number)}`, { headers: { Authorization: authHeader } }),
    fetch(`${base}/company/${encodeURIComponent(number)}/officers?items_per_page=50`, {
      headers: { Authorization: authHeader },
    }),
  ]);

  if (!profileRes.ok) {
    return Response.json(
      { error: `Companies House returned ${profileRes.status} for company profile` },
      { status: profileRes.status === 401 ? 502 : profileRes.status }
    );
  }

  const profile = (await profileRes.json()) as CHProfile;
  // Officers can 404 for some entity types (LLPs list members differently, etc.)
  // — treat that as "no officers found" rather than failing the whole check.
  const officersData = officersRes.ok ? ((await officersRes.json()) as { items?: CHOfficer[] }) : { items: [] };

  const directors = (officersData.items || [])
    .filter((o) => o.officer_role === 'director' && !o.resigned_on)
    .map((o) => ({ name: o.name, appointedOn: o.appointed_on || null }));

  return Response.json({
    name: profile.company_name,
    companyNumber: profile.company_number,
    status: profile.company_status,
    type: profile.type,
    address: formatAddress(profile.registered_office_address),
    directors,
  });
};
