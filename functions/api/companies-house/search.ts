/**
 * GET /api/companies-house/search?q=<company name>
 *
 * Proxies to Companies House's company search so the API key stays a
 * server-side secret (set as COMPANIES_HOUSE_API_KEY in the Pages project's
 * environment variables) rather than sitting in the browser bundle.
 */
export const onRequestGet: PagesFunction<{ COMPANIES_HOUSE_API_KEY: string }> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  if (!q || !q.trim()) {
    return Response.json({ error: 'Missing q parameter' }, { status: 400 });
  }
  if (!env.COMPANIES_HOUSE_API_KEY) {
    return Response.json(
      { error: 'COMPANIES_HOUSE_API_KEY is not set on this Pages project' },
      { status: 500 }
    );
  }

  const authHeader = 'Basic ' + btoa(`${env.COMPANIES_HOUSE_API_KEY}:`);
  const chUrl = `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(
    q
  )}&items_per_page=8`;

  const res = await fetch(chUrl, { headers: { Authorization: authHeader } });
  if (!res.ok) {
    return Response.json(
      { error: `Companies House returned ${res.status}` },
      { status: res.status === 401 ? 502 : res.status }
    );
  }

  const data = (await res.json()) as {
    items?: Array<{
      title: string;
      company_number: string;
      company_status: string;
      address_snippet?: string;
    }>;
  };

  const items = (data.items || []).map((i) => ({
    name: i.title,
    companyNumber: i.company_number,
    status: i.company_status,
    addressSnippet: i.address_snippet || '',
  }));

  return Response.json({ items });
};
