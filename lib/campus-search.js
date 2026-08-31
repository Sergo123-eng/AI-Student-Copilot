// Official-campus lookup only. A Brave Search key is required in production;
// results are filtered to .edu domains before the application can show them.
export async function findCampusCounselingOffice(institution) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  const school = String(institution || "").trim().slice(0, 140);
  if (!key || !school) return [];
  try {
    const url = "https://api.search.brave.com/res/v1/web/search?q=" + encodeURIComponent(school + " counseling center official") + "&count=5";
    const response = await fetch(url, {
      headers: { Accept: "application/json", "X-Subscription-Token": key },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return [];
    const body = await response.json();
    return (body.web?.results || [])
      .filter(item => /^https:\/\/(?:[\w-]+\.)+edu(?:\/|$)/i.test(String(item.url || "")))
      .slice(0, 3)
      .map(item => ({ name: String(item.title || "Official campus counseling office").slice(0, 120), url: String(item.url), kind: "site", query: "Official counseling office" }));
  } catch {
    return [];
  }
}
