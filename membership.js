/* StudentSpark Copilot — secure subscription gate.
   Loaded after the legacy sign-in module and before the application mount. */
(function () {
  const { useEffect, useState } = React;

  const PLAN_COPY = {
    day: {
      eyebrow: "24-hour pass",
      title: "$1 Starter",
      price: "$1 / day",
      detail: "One topic, explained in plain language with a memorable analogy.",
      items: ["One guided topic", "Analogy-first explanation", "Made for absolute beginners"],
      button: "Get 24-hour access"
    },
    student: {
      eyebrow: "Most popular",
      title: "Student Guide",
      price: "$3 / month",
      detail: "The complete StudentSpark guide experience, including your study workflow.",
      items: ["Ask, My Week, and Guidelines", "Personalized study guidance", "Cancel any time"],
      button: "Start Student Guide"
    },
    academic: {
      eyebrow: "Best value",
      title: "Academic Plus",
      price: "$30 / year",
      detail: "Trusted academic sources and a polished, color-coded learning view.",
      items: ["Three quality academic sources", "Definitions, rules, and examples in clear colors", "Source-aware analogies and comparisons"],
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

    useEffect(() => {
      fetch("/api/session", { credentials: "same-origin" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data && data.active) setSession(data); })
        .catch(() => {})
        .finally(() => setReady(true));
    }, []);

    async function choose(plan) {
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/create-checkout", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan })
        });
        const data = await r.json();
        if (!r.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");
        window.location.assign(data.url);
      } catch (e) {
        setError(e.message || "Checkout could not be started.");
        setBusy(false);
      }
    }

    async function signOut() {
      await fetch("/api/sign-out", { method: "POST", credentials: "same-origin" }).catch(() => {});
      setSession(null);
    }

    if (!ready) return <div className="auth"><div className="auth-card"><p className="auth-p">Checking your secure access…</p></div></div>;
    if (session) return children({ name: session.name || session.email, email: session.email, plan: session.plan }, signOut);

    return <div className="ss-gate">
      <section className="ss-hero">
        <div className="brand"><span className="brand-mark">SS</span><span className="brand-n">StudentSpark <b>Copilot</b></span></div>
        <p className="ss-kicker">Study help that makes difficult ideas click.</p>
        <h1>Learn with clarity. <span>Start with a plan.</span></h1>
        <p className="ss-lede">Create your secure account through checkout. A subscription is required before you can enter StudentSpark Copilot.</p>
      </section>
      <section className="ss-plans" aria-label="Subscription plans">
        {Object.keys(PLAN_COPY).map(plan => <PlanCard key={plan} plan={plan} busy={busy} choose={choose} />)}
      </section>
      {error && <p className="ss-error">{error}</p>}
      <p className="ss-foot">Payments are securely processed by Stripe. You can manage or cancel a recurring subscription from the customer portal.</p>
    </div>;
  }

  window.AuthGate = AuthGate;
  document.title = "StudentSpark Copilot";
  const style = document.createElement("style");
  style.textContent = `
    .brand-mark{font-size:0}.brand-mark:after{content:'SS';font-size:12px}.brand-n{font-size:0}.brand-n:after{content:'StudentSpark Copilot';font-size:16px}.ss-gate{min-height:100%;padding:44px 24px 56px;background:radial-gradient(circle at 15% 8%,#263f6b 0,transparent 30%),radial-gradient(circle at 88% 12%,#4d2358 0,transparent 30%),var(--bg);color:var(--ink)}
    .ss-hero{max-width:940px;margin:0 auto 28px;text-align:center}.ss-hero .brand{justify-content:center;margin-bottom:30px}.ss-kicker,.ss-eyebrow{font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--flame-2)}.ss-hero h1{font-size:clamp(38px,6vw,70px);line-height:1.02;letter-spacing:-.055em;margin:10px auto 14px;max-width:800px}.ss-hero h1 span{color:#f7c7ef}.ss-lede{max-width:610px;margin:0 auto;color:var(--ink-2);font-size:16px;line-height:1.6}
    .ss-plans{max-width:1120px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch}.ss-plan{background:rgba(23,31,45,.88);border:1px solid var(--line-2);border-radius:20px;padding:24px;display:flex;flex-direction:column;box-shadow:0 16px 45px rgba(0,0,0,.18)}.ss-plan.ss-student{border-color:#819cf4;transform:translateY(-7px);background:linear-gradient(160deg,#263b67,#1c2637)}.ss-plan.ss-academic{border-color:#c977ba;background:linear-gradient(160deg,#472f5e,#20283a)}.ss-plan h2{font-size:23px;margin:8px 0 2px}.ss-price{font-size:25px;font-weight:800;color:var(--honey);margin:0 0 13px}.ss-detail{color:var(--ink-2);font-size:13.5px;line-height:1.5;min-height:62px}.ss-plan ul{list-style:none;margin:14px 0 24px;padding:0;display:flex;flex-direction:column;gap:10px}.ss-plan li{font-size:13px;color:var(--ink-2);padding-left:22px;position:relative;line-height:1.4}.ss-plan li:before{content:'✓';position:absolute;left:0;color:var(--teal);font-weight:800}.ss-cta{margin-top:auto;width:100%}.ss-academic .ss-cta{background:#e69bd4}.ss-error{max-width:680px;margin:22px auto 0;padding:10px 14px;border:1px solid #9b4f69;background:#402434;color:#ffc4d6;border-radius:10px;text-align:center}.ss-foot{max-width:620px;text-align:center;color:var(--muted);font-size:12px;line-height:1.5;margin:20px auto 0}@media(max-width:800px){.ss-plans{grid-template-columns:1fr;max-width:480px}.ss-plan.ss-student{transform:none}.ss-detail{min-height:0}}
  `;
  document.head.appendChild(style);
})();
