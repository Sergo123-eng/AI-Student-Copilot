# Publish Lantern Copilot — do these in order

This folder is the whole site. Two files matter:

```
deploy/
  index.html      the app (one self-contained file)
  api/ask.js      the backend that holds your API key
```

Nothing else is needed. Follow the steps in order and stop at the check at the end of each one — that is what keeps this from going wrong.

---

## Step 0 — Decide the risk you are taking

The only thing that can cost you money or leak is the API key. Rules, no exceptions:

- The key goes in the host's **Environment Variables** screen. Never in `index.html`, never in a commit, never in a screenshot.
- Set a **spending limit** in your provider console before the site is public.
- If a key is ever pasted somewhere public, delete it in the console and make a new one. Deleted keys stop working instantly.

## Step 1 — Get an API key

1. Go to console.anthropic.com → API keys → create a key. Copy it once; you cannot see it again.
2. Billing → set a monthly spend limit you are comfortable losing (start small, e.g. $10).

**Check:** you have a key in your clipboard and a spend cap set.

## Step 2 — Put the folder on GitHub

1. Download this project (the download card in chat) and find the `deploy` folder.
2. github.com → New repository → name it `lantern-copilot` → **Private** is fine.
3. Upload the *contents* of `deploy` — so the repo root has `index.html` and an `api` folder with `ask.js` in it.

**Check:** browsing the repo, you see `index.html` at the top level, and `api/ask.js`. If `index.html` is inside a `deploy` folder in the repo, drag it up one level or the site will 404.

## Step 3 — Deploy on Vercel

1. vercel.com → sign in with GitHub → **Add New Project** → pick the repo.
2. Framework preset: **Other**. Leave build command and output directory empty.
3. Before clicking Deploy, open **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key
   - Environments: Production, Preview, Development (all three)
4. Deploy.

**Check:** you get a URL like `lantern-copilot.vercel.app` and the sign-in screen loads.

## Step 4 — Test it in this order

1. Open the URL in a private window.
2. Try to sign up with `you@gmail.com` → you must see the "personal email" refusal.
3. Sign up with a `.edu` address and a password → you land on Ask.
4. Ask "I have a chemistry exam tomorrow" → you should get a real answer plus the improvement plan.
   - If you get "I couldn't reach my sources", the key is the problem. Vercel → your project → Logs, look at the `/api/ask` line. `Server is missing ANTHROPIC_API_KEY` means step 3.3 did not save; add it and **redeploy** (env vars only apply to new deployments).
5. Build a week in My Week, reload the page → your blocks are still there.
6. Open it on your phone.

**Check:** all six pass. Now it is safe to share.

## Step 5 — Share it with a few students first

Send it to 5-10 people, not a whole campus. Watch what they ask and where they stop. Every change you make after that is worth ten you would have guessed at.

---

## If you would rather use Netlify

Netlify functions have a different signature. Create `netlify/functions/ask.js`:

```js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };
  const key = process.env.ANTHROPIC_API_KEY;
  const b = JSON.parse(event.body || "{}");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: Math.min(b.max_tokens || 1200, 4000),
      system: b.system || "",
      messages: (b.messages || []).slice(-20)
    })
  });
  const j = await r.json();
  return { statusCode: 200, body: JSON.stringify({ text: (j.content || []).map(c => c.text || "").join("") }) };
};
```

and add `netlify.toml` at the repo root:

```toml
[build]
  publish = "."
[[redirects]]
  from = "/api/ask"
  to = "/.netlify/functions/ask"
  status = 200
```

Set `ANTHROPIC_API_KEY` under Site settings → Environment variables, then deploy.

---

## What is still a prototype after publishing

Be clear-eyed about these before you charge anyone:

- **Sign-in is not verification.** The `.edu` check is a format check in the browser; anyone can type a fake `.edu`. Real verification = email the student a magic link (Supabase Auth or Clerk, both have free tiers) so they must open the inbox at that address. Do this before you take money.
- **Data lives in the browser only.** Chats, week, savings plan are in that device's localStorage. Clearing the browser wipes them, and nothing syncs to another device. A database comes with the auth step.
- **No rate limiting.** Anyone with your URL can call `/api/ask` repeatedly and spend your credits. The spend cap in step 1 is your backstop; add per-user limits when you add real accounts.
- **Never accept transcripts or degree audits yet.** Educational records carry legal obligations (FERPA). Storing them needs a plan, not a folder.

## Updating the site later

Change the source in this project, re-bundle to `deploy/index.html`, replace the file in the repo. Vercel redeploys on commit. Your students' saved data is untouched by a redeploy.
