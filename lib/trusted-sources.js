// Fetches reading suggestions from Crossref's scholarly DOI metadata index.
// It deliberately does not use Wikipedia, Reddit, or unverified social content.
export async function scholarlyReadingSuggestions(question) {
  const query = String(question || "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (query.length < 3) return [];
  try {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&filter=type:journal-article&rows=3&select=title,DOI,container-title,published`;
    const response = await fetch(url, { headers: { "User-Agent": "StudentSpark-Copilot/1.0 (academic-reading-suggestions)" }, signal: AbortSignal.timeout(3500) });
    if (!response.ok) return [];
    const body = await response.json();
    return (body.message?.items || [])
      .map(item => ({
        title: String(item.title?.[0] || "").trim(),
        journal: String(item["container-title"]?.[0] || "").trim(),
        url: item.DOI ? `https://doi.org/${item.DOI}` : ""
      }))
      .filter(item => item.title && item.url)
      .slice(0, 3);
  } catch {
    return [];
  }
}
