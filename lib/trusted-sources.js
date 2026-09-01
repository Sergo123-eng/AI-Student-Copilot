// Fetches reading suggestions from reputable scholarly metadata indexes only.
// It deliberately never queries Wikipedia, Reddit, forums, answer mills, or social media.
// Returned records are further-reading suggestions, not claims that the model read a work.
function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function openAlex(query) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=type:article&per-page=3`;
  const response = await fetch(url, { headers: { "User-Agent": "StudentSpark-Copilot/1.0 (academic-reading-suggestions)" }, signal: AbortSignal.timeout(3500) });
  if (!response.ok) return [];
  const body = await response.json();
  return (body.results || []).map(item => ({
    title: clean(item.title),
    journal: clean(item.primary_location?.source?.display_name),
    url: clean(item.doi || item.primary_location?.landing_page_url),
    provider: "OpenAlex"
  })).filter(item => item.title && item.url);
}

async function semanticScholar(query) {
  const key = String(process.env.SEMANTIC_SCHOLAR_API_KEY || "");
  if (!key) return [];
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=3&fields=title,venue,url,externalIds`;
  const response = await fetch(url, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(3500) });
  if (!response.ok) return [];
  const body = await response.json();
  return (body.data || []).map(item => ({
    title: clean(item.title), journal: clean(item.venue),
    url: clean(item.url || (item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : "")), provider: "Semantic Scholar"
  })).filter(item => item.title && item.url);
}

async function crossref(query) {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&filter=type:journal-article&rows=3&select=title,DOI,container-title,published`;
  const response = await fetch(url, { headers: { "User-Agent": "StudentSpark-Copilot/1.0 (academic-reading-suggestions)" }, signal: AbortSignal.timeout(3500) });
  if (!response.ok) return [];
  const body = await response.json();
  return (body.message?.items || []).map(item => ({
    title: clean(item.title?.[0]), journal: clean(item["container-title"]?.[0]),
    url: item.DOI ? `https://doi.org/${item.DOI}` : "", provider: "Crossref"
  })).filter(item => item.title && item.url);
}

export async function scholarlyReadingSuggestions(question) {
  const query = String(question || "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (query.length < 3) return [];
  try {
    const semantic = await semanticScholar(query);
    const results = semantic.length ? semantic : await openAlex(query);
    return (results.length ? results : await crossref(query)).slice(0, 3);
  } catch {
    try { return (await crossref(query)).slice(0, 3); } catch { return []; }
  }
}
