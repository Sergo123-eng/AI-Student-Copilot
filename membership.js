/* StudentSpark Copilot — secure subscription gate.
   Loaded after the legacy sign-in module and before the application mount. */
(function () {
  const { useEffect, useState } = React;

  const PLAN_COPY = {
    day: {
      eyebrow: "24-hour pass",
      title: "$1 Day Pass",
      price: "$1 / day",
      detail: "A full day of Student Guide and Academic support, with clear explanations and analogies.",
      items: ["Unlimited prompts for 24 hours", "Guide + academic explanations", "Trusted-source reading suggestions"],
      button: "Get 24-hour access"
    },
    student: {
      eyebrow: "Most popular",
      title: "Student Guide",
      price: "$3 / month",
      detail: "A focused study coach for planning, understanding assignments, and staying on track.",
      items: ["Ask, My Week, and Guidelines", "Personalized study guidance", "Guide tools only — no academic source mode"],
      button: "Start Student Guide"
    },
    academic: {
      eyebrow: "Best value",
      title: "Academic Plus",
      price: "$30 / year",
      detail: "The complete year of academic support: concepts, analogies, and trusted-source reading suggestions.",
      items: ["Academic help + Student Guide", "Definitions, rules, and examples in clear sections", "Up to three relevant scholarly reading suggestions"],
      button: "Choose Academic Plus"
    }
  };

  function PlanCard({ plan, busy, choose }) {
    const p = PLAN_COPY[plan];
    return <article className={"ss-plan ss-" + plan}>
      <p className="ss-eyebrow">{p.eyebrow}</p>
      <h2>{p.title}</h2>
      <p className="ss-price">{p.price}</p>
      <p className="ss-detail">{p.detail}</p>
      <ul>{p.items.map(item => <li key={item}>{item}</li>)}</ul>
      <button className="cta ss-cta" disabled={busy} onClick={() => choose(plan)}>
        {busy ? "Opening secure checkout…" : p.button}
      </button>
    </article>;
  }

  function AuthGate({ children }) {
    const [session, setSession] = useState(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    function isEduEmail(value) { return /^[^\\s@]+@[^\\s@]+\\.edu$/i.test(String(value || "").trim()); }

    useEffect(() => {
      fetch("/api/session", { credentials: "same-origin" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data && data.active) setSession(data); })
        .catch(() => {})
        .finally(() => setReady(true));
    }, []);

    async function choose(plan) {
      if (!isEduEmail(email)) { setError("Use a valid .edu student email address to continue."); return; }
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/create-checkout", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, email: email.trim() })
        });
        const data = await r.json();
        if (!r.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");
        window.location.assign(data.url);
      } catch (e) {
        setError(e.message || "Checkout could not be started.");
        setBusy(false);
      }
    }

    async function startFreeTrial() {
      if (!isEduEmail(email)) { setError("Use a valid .edu student email address to start the free trial."); return; }
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/free-trial", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
        const data = await r.json();
        if (!r.ok || !data.active) throw new Error(data.error || "The free trial could not be started.");
        setSession(data);
      } catch (e) { setError(e.message || "The free trial could not be started."); }
      finally { setBusy(false); }
    }

    async function signOut() {
      await fetch("/api/sign-out", { method: "POST", credentials: "same-origin" }).catch(() => {});
      setSession(null);
    }

    async function redeem(event) {
      event.preventDefault();
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/redeem-code", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code })
        });
        const data = await r.json();
        if (!r.ok || !data.active) throw new Error(data.error || "That code could not be used.");
        setSession(data);
      } catch (e) { setError(e.message || "That code could not be used."); }
      finally { setBusy(false); }
    }

    if (!ready) return <div className="auth"><div className="auth-card"><p className="auth-p">Checking your secure access…</p></div></div>;
    if (session) return children({ name: session.name || session.email, email: session.email, plan: session.plan }, signOut);

    return <div className="ss-gate">
      <section className="ss-hero">
        <div className="brand"><span className="brand-mark">SS</span><span className="brand-n">StudentSpark <b>Copilot</b></span></div>
        <p className="ss-kicker">Study help that makes difficult ideas click.</p>
        <h1>Learn with clarity. <span>Start with a plan.</span></h1>
        <p className="ss-lede">Your calm study partner for difficult classes. StudentSpark makes concepts click with guidance, memorable analogies, and scholarly reading suggestions when your plan includes Academic support.</p>
      </section>
      <label className="ss-email"><span>Student email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" aria-label="Student .edu email address" /><small>StudentSpark is available to .edu student addresses only.</small></label>
      <section className="ss-plans" aria-label="Subscription plans">
        {Object.keys(PLAN_COPY).map(plan => <PlanCard key={plan} plan={plan} busy={busy} choose={choose} />)}
      </section>
      <section className="ss-why" aria-label="Why StudentSpark">
        <p className="ss-eyebrow">Why StudentSpark</p>
        <h2>Built for a student’s actual week—not generic answers.</h2>
        <div>
          <p><b>Source-aware.</b> Academic plans include real scholarly further-reading records and vetted learning resources.</p>
          <p><b>Actionable.</b> My Week turns the student’s own classes, clubs, sports, and commitments into a schedule they control.</p>
          <p><b>Honest boundaries.</b> No made-up campus policies, no sexual-content answers, and mental-health questions are handed to real support.</p>
        </div>
      </section>
      <button className="ss-free" disabled={busy} onClick={startFreeTrial}>Try StudentSpark free for 3 days — no card needed</button>
      {error && <p className="ss-error">{error}</p>}
      <form className="ss-code" onSubmit={redeem}>
        <strong>Have a promo code?</strong>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" aria-label="Email address" />
        <input required value={code} onChange={e => setCode(e.target.value)} placeholder="Enter promo code" aria-label="Promo code" />
        <button className="ghost" disabled={busy} type="submit">{busy ? "Checking…" : "Unlock access"}</button>
      </form>
      <p className="ss-foot">Payments are securely processed by Stripe. You can manage or cancel a recurring subscription from the customer portal.</p>
    </div>;
  }

  window.AuthGate = AuthGate;
  document.title = "StudentSpark Copilot";
  const style = document.createElement("style");
  style.textContent = `
    .brand-mark{font-size:0}.brand-mark:after{content:'SS';font-size:12px}.brand-n{font-size:0}.brand-n:after{content:'StudentSpark Copilot';font-size:16px}.ss-gate{min-height:100%;padding:44px 24px 56px;background:radial-gradient(circle at 15% 8%,#263f6b 0,transparent 30%),radial-gradient(circle at 88% 12%,#4d2358 0,transparent 30%),var(--bg);color:var(--ink)}
    .ss-hero{max-width:940px;margin:0 auto 28px;text-align:center}.ss-hero .brand{justify-content:center;margin-bottom:30px}.ss-kicker,.ss-eyebrow{font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--flame-2)}.ss-hero h1{font-size:clamp(38px,6vw,70px);line-height:1.02;letter-spacing:-.055em;margin:10px auto 14px;max-width:800px}.ss-hero h1 span{color:#f7c7ef}.ss-lede{max-width:710px;margin:0 auto;color:var(--ink-2);font-size:16px;line-height:1.6}.ss-email{display:block;max-width:440px;margin:0 auto 24px;text-align:left}.ss-email span{display:block;font-size:12px;font-weight:800;margin:0 0 6px}.ss-email input{width:100%;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);border-radius:10px;padding:11px 12px;font:inherit}.ss-email small{display:block;color:var(--muted);font-size:11px;margin-top:6px}
    .ss-plans{max-width:1120px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch}.ss-plan{background:rgba(23,31,45,.88);border:1px solid var(--line-2);border-radius:20px;padding:24px;display:flex;flex-direction:column;box-shadow:0 16px 45px rgba(0,0,0,.18)}.ss-plan.ss-student{border-color:#819cf4;transform:translateY(-7px);background:linear-gradient(160deg,#263b67,#1c2637)}.ss-plan.ss-academic{border-color:#c977ba;background:linear-gradient(160deg,#472f5e,#20283a)}.ss-plan h2{font-size:23px;margin:8px 0 2px}.ss-price{font-size:25px;font-weight:800;color:var(--honey);margin:0 0 13px}.ss-detail{color:var(--ink-2);font-size:13.5px;line-height:1.5;min-height:62px}.ss-plan ul{list-style:none;margin:14px 0 24px;padding:0;display:flex;flex-direction:column;gap:10px}.ss-plan li{font-size:13px;color:var(--ink-2);padding-left:22px;position:relative;line-height:1.4}.ss-plan li:before{content:'✓';position:absolute;left:0;color:var(--teal);font-weight:800}.ss-cta{margin-top:auto;width:100%}.ss-academic .ss-cta{background:#e69bd4}.ss-error{max-width:680px;margin:22px auto 0;padding:10px 14px;border:1px solid #9b4f69;background:#402434;color:#ffc4d6;border-radius:10px;text-align:center}.ss-foot{max-width:620px;text-align:center;color:var(--muted);font-size:12px;line-height:1.5;margin:20px auto 0}@media(max-width:800px){.ss-plans{grid-template-columns:1fr;max-width:480px}.ss-plan.ss-student{transform:none}.ss-detail{min-height:0}}
  `;
  document.head.appendChild(style);
  style.textContent += `.ss-why{max-width:1120px;margin:32px auto 0;padding:24px;border-radius:18px;background:linear-gradient(125deg,rgba(54,69,111,.68),rgba(75,38,89,.64));border:1px solid var(--line-2)}.ss-why h2{font-size:25px;margin:6px 0 14px}.ss-why>div{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.ss-why p{font-size:13.5px;color:var(--ink-2);line-height:1.55}.ss-why b{color:var(--honey)}.ss-free{display:block;margin:18px auto 0;border:1px solid var(--teal);background:transparent;color:var(--teal);border-radius:999px;padding:9px 16px;font-weight:800;font-size:13px}.ss-free:hover:not(:disabled){background:rgba(68,209,184,.13)}.ss-code{max-width:760px;margin:24px auto 0;display:grid;grid-template-columns:1.05fr 1fr 1fr auto;gap:8px;align-items:center;background:rgba(23,31,45,.72);border:1px solid var(--line);padding:12px;border-radius:14px}.ss-code strong{font-size:13px}.ss-code input{min-width:0;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}.ss-code .ghost{padding:8px 13px}@media(max-width:800px){.ss-code{grid-template-columns:1fr}.ss-code .ghost{width:100%}.ss-why>div{grid-template-columns:1fr}}`;
})();
