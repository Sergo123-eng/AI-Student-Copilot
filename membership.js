/* StudentSpark Copilot — secure subscription gate.
   Loaded after the legacy sign-in module and before the application mount. */
(function () {
  const { useEffect, useState } = React;

  const PLAN_COPY = {
    day: {
      eyebrow: "24-hour pass",
      title: "Day Pass",
      price: "$1.99 / day",
      image: "/assets/plans/day-pass.png",
      imageAlt: "StudentSpark Day Pass — 24-hour access",
      detail: "A focused 24-hour pass for guidance, trusted-source suggestions, and a short practice set.",
      items: ["Focused study guidance for the day", "Trusted academic reading suggestions", "A short practice set when helpful"],
      button: "Get 24-hour access"
    },
    student: {
      eyebrow: "Most popular",
      title: "Plus",
      price: "$5 / month",
      annualPrice: "$50 / year — 2 months free",
      image: "/assets/plans/plus.png",
      imageAlt: "StudentSpark Plus",
      detail: "A focused study coach for planning, understanding assignments, and staying on track.",
      items: ["Ask, My Week, and Guidelines", "Practice questions and personalized study guidance", "Trusted academic reading suggestions"],
      button: "Choose Plus"
    },
    academic_monthly: {
      eyebrow: "Academic support",
      title: "Pro",
      price: "$7.99 / month",
      annualPrice: "$79.90 / year — 2 months free",
      image: "/assets/plans/pro.png",
      imageAlt: "StudentSpark Pro",
      detail: "More academic depth for explanations, analogies, practice, and source-aware study support.",
      items: ["Everything in Plus", "Academic explanations + practice", "Source-aware further reading when available"],
      button: "Choose Pro"
    },
    academic: {
      eyebrow: "Best value",
      title: "Super",
      price: "$15 / month",
      annualPrice: "$150 / year — 2 months free",
      image: "/assets/plans/super.png",
      imageAlt: "StudentSpark Super",
      detail: "The most complete study companion: sources, analogies, practice, My Week, and gentle opt-in study reminders.",
      items: ["Everything in Plus and Pro", "Easy, medium, and hard practice with concise answers", "Opt-in study reminders and source-aware support"],
      button: "Choose Super"
    }
  };

  function PlanCard({ plan, busy, canCheckout, choose }) {
    const p = PLAN_COPY[plan];
    return <article className={"ss-plan ss-" + plan}>
      <img className="ss-plan-image" src={p.image} alt={p.imageAlt} />
      <p className="ss-eyebrow">{p.eyebrow}</p>
      <h2>{p.title}</h2>
      <p className="ss-price">{p.price}</p>
      <p className="ss-detail">{p.detail}</p>
      <ul>{p.items.map(item => <li key={item}>{item}</li>)}</ul>
      {plan === "day" ? <button className="cta ss-cta" disabled={busy || !canCheckout} onClick={() => choose("day")}>
        {busy ? "Opening secure checkout…" : canCheckout ? p.button : "Enter .edu email + agree first"}
      </button> : <div className="ss-billing-actions">
        <button className="cta ss-cta" disabled={busy || !canCheckout} onClick={() => choose(plan === "student" ? "plus_monthly" : plan === "academic_monthly" ? "pro_monthly" : "super_monthly")}>
          {busy ? "Opening secure checkout…" : canCheckout ? p.button : "Enter .edu email + agree first"}
        </button>
        <button className="ss-annual" disabled={busy || !canCheckout} onClick={() => choose(plan === "student" ? "plus_annual" : plan === "academic_monthly" ? "pro_annual" : "super_annual")}>{p.annualPrice}</button>
      </div>}
    </article>;
  }

  function AuthGate({ children }) {
    const [session, setSession] = useState(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [billingConsent, setBillingConsent] = useState(false);
    const [supportMessage, setSupportMessage] = useState("");
    const [supportStatus, setSupportStatus] = useState("");

    function isEduEmail(value) { return /^[^\\s@]+@[^\\s@]+\\.edu$/i.test(String(value || "").trim()); }

    useEffect(() => {
      fetch("/api/session", { credentials: "same-origin" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data && data.active) setSession(data); })
        .catch(() => {})
        .finally(() => setReady(true));
    }, []);

    // A Day Pass can ask questions but cannot use My Week. The original
    // bundled UI owns the navigation, so enforce this at the gate boundary
    // before a click reaches that older component.
    useEffect(() => {
      if (session?.plan !== "day") return;
      const blockMyWeek = event => {
        const button = event.target?.closest?.("button");
        if (button && button.textContent.trim() === "My Week") {
          event.preventDefault(); event.stopPropagation();
          setError("My Week is available with Plus, Pro, or Super. Upgrade to unlock scheduling.");
        }
      };
      document.addEventListener("click", blockMyWeek, true);
      return () => document.removeEventListener("click", blockMyWeek, true);
    }, [session?.plan]);

    async function choose(plan) {
      if (!isEduEmail(email)) { setError("Use a valid .edu student email address to continue."); return; }
      if (!billingConsent) { setError("Please confirm that you understand the selected paid plan before continuing to secure checkout."); return; }
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

    async function manageMembership() {
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/customer-portal", { method: "POST", credentials: "same-origin" });
        const data = await r.json();
        if (!r.ok || !data.url) throw new Error(data.error || "The membership portal could not be opened.");
        window.location.assign(data.url);
      } catch (e) {
        setError(e.message || "The membership portal could not be opened.");
        setBusy(false);
      }
    }

    async function buyStudyCredits() {
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/create-checkout", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "study_credits", email: session.email })
        });
        const data = await r.json();
        if (!r.ok || !data.url) throw new Error(data.error || "Study Credits could not be started.");
        window.location.assign(data.url);
      } catch (e) { setError(e.message || "Study Credits could not be started."); setBusy(false); }
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

    async function sendSupport(event) {
      event.preventDefault();
      const supportEmail = session?.email || email;
      setSupportStatus("");
      try {
        const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: supportEmail, message: supportMessage }) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Your request could not be sent.");
        setSupportMessage(""); setSupportStatus("Your support request was sent.");
      } catch (e) { setSupportStatus(e.message || "Your request could not be sent."); }
    }

    const supportForm = <form className="ss-support" onSubmit={sendSupport}>
      <strong>Need support?</strong><span>Send a request directly to the StudentSpark team.</span>
      <input type="email" required value={session?.email || email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" aria-label="Support email" />
      <textarea required minLength="20" maxLength="2000" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Tell us what you need help with" aria-label="Support request" />
      <button className="ghost" type="submit">Send support request</button>{supportStatus && <small>{supportStatus}</small>}
    </form>;

    if (!ready) return <div className="auth"><div className="auth-card"><p className="auth-p">Checking your secure access…</p></div></div>;
    if (session) return <React.Fragment>
      {children({ name: session.name || session.email, email: session.email, plan: session.plan }, signOut)}
      {['plus', 'pro', 'super'].includes(session.plan) && <button className="ss-manage" onClick={manageMembership} disabled={busy}>Manage or cancel membership</button>}
      {['plus', 'pro', 'super'].includes(session.plan) && <button className="ss-credits" onClick={buyStudyCredits} disabled={busy}>Add Study Credits</button>}
      {supportForm}
      {error && <p className="ss-live-error">{error}</p>}
    </React.Fragment>;

    return <div className="ss-gate">
      <section className="ss-hero">
        <div className="brand"><span className="brand-mark">SS</span><span className="brand-n">StudentSpark <b>Copilot</b></span></div>
        <p className="ss-kicker">Study help that makes difficult ideas click.</p>
        <h1>Learn with clarity. <span>Start with a plan.</span></h1>
        <p className="ss-lede">Your calm study partner for difficult classes. StudentSpark makes concepts click with guidance, memorable analogies, and scholarly reading suggestions when your plan includes Academic support.</p>
      </section>
      <label className="ss-email"><span>Student email</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" aria-label="Student .edu email address" /><small>StudentSpark is available to .edu student addresses only.</small></label>
      <label className="ss-consent"><input type="checkbox" checked={billingConsent} onChange={e => setBillingConsent(e.target.checked)} /> <span>I understand that paid plans are processed by Stripe. Monthly and annual plans renew until I cancel them in the customer portal.</span></label>
      <p className="ss-checkout-note">Enter your .edu address and check the agreement above to unlock secure Stripe checkout.</p>
      <section className="ss-plans" aria-label="Subscription plans">
        {Object.keys(PLAN_COPY).map(plan => <PlanCard key={plan} plan={plan} busy={busy} canCheckout={isEduEmail(email) && billingConsent} choose={choose} />)}
      </section>
      <section className="ss-compare" aria-label="Compare StudentSpark plans">
        <p className="ss-eyebrow">Compare plans</p>
        <h2>Choose the support that fits your semester.</h2>
        <div className="ss-table-wrap"><table>
          <thead><tr><th>Feature</th><th>Day Pass</th><th>Plus</th><th>Pro</th><th>Super</th></tr></thead>
          <tbody>
            <tr><th>Study guidance and next steps</th><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><th>My Week planning tools</th><td>Upgrade</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><th>Clear academic explanations</th><td>Source-aware help</td><td>Practice + sources</td><td>✓</td><td>✓</td></tr>
            <tr><th>Analogies and practice support</th><td>Practice</td><td>Practice</td><td>✓</td><td>✓</td></tr>
            <tr><th>Source-aware study reading</th><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
            <tr><th>Opt-in study reminders</th><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
          </tbody>
        </table></div>
        <p className="ss-compare-note">StudentSpark cites or recommends sources when a verified source is available. It does not claim access to private university systems.</p>
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
      {supportForm}
    </div>;
  }

  window.AuthGate = AuthGate;
  document.title = "StudentSpark Copilot";
  const style = document.createElement("style");
  style.textContent = `
    .brand-mark{font-size:0}.brand-mark:after{content:'SS';font-size:12px}.brand-n{font-size:0}.brand-n:after{content:'StudentSpark Copilot';font-size:16px}.ss-gate{min-height:100%;padding:44px 24px 56px;background:radial-gradient(circle at 15% 8%,#263f6b 0,transparent 30%),radial-gradient(circle at 88% 12%,#4d2358 0,transparent 30%),var(--bg);color:var(--ink)}
    .ss-hero{max-width:940px;margin:0 auto 28px;text-align:center}.ss-hero .brand{justify-content:center;margin-bottom:30px}.ss-kicker,.ss-eyebrow{font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--flame-2)}.ss-hero h1{font-size:clamp(38px,6vw,70px);line-height:1.02;letter-spacing:-.055em;margin:10px auto 14px;max-width:800px}.ss-hero h1 span{color:#f7c7ef}.ss-lede{max-width:710px;margin:0 auto;color:var(--ink-2);font-size:16px;line-height:1.6}.ss-email{display:block;max-width:440px;margin:0 auto 24px;text-align:left}.ss-email span{display:block;font-size:12px;font-weight:800;margin:0 0 6px}.ss-email input{width:100%;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);border-radius:10px;padding:11px 12px;font:inherit}.ss-email small{display:block;color:var(--muted);font-size:11px;margin-top:6px}
    .ss-consent{display:flex;gap:9px;align-items:flex-start;max-width:650px;margin:0 auto 18px;color:var(--ink-2);font-size:12px;line-height:1.45}.ss-consent input{margin-top:3px;accent-color:var(--flame);flex:none}.ss-checkout-note{max-width:650px;margin:0 auto 18px;text-align:center;color:var(--teal);font-size:12px;font-weight:700}.ss-plans{max-width:1260px;margin:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:stretch}.ss-plan{background:rgba(23,31,45,.88);border:1px solid var(--line-2);border-radius:20px;padding:20px;display:flex;flex-direction:column;box-shadow:0 16px 45px rgba(0,0,0,.18)}.ss-plan-image{width:100%;aspect-ratio:1.45;object-fit:cover;object-position:center;border-radius:13px;margin:0 0 16px;background:#071534}.ss-plan.ss-student{border-color:#62c8ed;transform:translateY(-7px);background:linear-gradient(160deg,#123753,#1a2939)}.ss-plan.ss-academic_monthly{border-color:#e56bd3;background:linear-gradient(160deg,#42184d,#22253e)}.ss-plan.ss-academic{border-color:#f0bd4e;background:linear-gradient(160deg,#4d3610,#25243a)}.ss-plan h2{font-size:23px;margin:8px 0 2px}.ss-price{font-size:25px;font-weight:800;color:var(--honey);margin:0 0 5px}.ss-detail{color:var(--ink-2);font-size:13.5px;line-height:1.5;min-height:62px}.ss-plan ul{list-style:none;margin:14px 0 24px;padding:0;display:flex;flex-direction:column;gap:10px}.ss-plan li{font-size:13px;color:var(--ink-2);padding-left:22px;position:relative;line-height:1.4}.ss-plan li:before{content:'✓';position:absolute;left:0;color:var(--teal);font-weight:800}.ss-billing-actions{margin-top:auto}.ss-cta{width:100%}.ss-cta:disabled{opacity:.58;cursor:not-allowed}.ss-annual{display:block;width:100%;margin-top:8px;border:0;background:transparent;color:var(--teal);font:inherit;font-size:12px;font-weight:800;text-decoration:underline;text-underline-offset:3px}.ss-annual:hover:not(:disabled){color:var(--honey)}.ss-academic .ss-cta{background:#e69bd4}.ss-error{max-width:680px;margin:22px auto 0;padding:10px 14px;border:1px solid #9b4f69;background:#402434;color:#ffc4d6;border-radius:10px;text-align:center}.ss-live-error{position:fixed;z-index:90;right:18px;bottom:104px;max-width:340px;margin:0;padding:10px 14px;border:1px solid #9b4f69;background:#402434;color:#ffc4d6;border-radius:10px;font-size:13px}.ss-manage,.ss-credits{position:fixed;z-index:90;right:18px;border:1px solid var(--line-2);background:var(--card);color:var(--ink-2);border-radius:100px;padding:9px 14px;font:inherit;font-size:12px;font-weight:800;box-shadow:0 6px 20px rgba(0,0,0,.22)}.ss-manage{bottom:18px}.ss-credits{bottom:62px;border-color:var(--teal);color:var(--teal)}.ss-manage:hover:not(:disabled),.ss-credits:hover:not(:disabled){border-color:var(--flame);color:var(--flame-deep)}.ss-foot{max-width:620px;text-align:center;color:var(--muted);font-size:12px;line-height:1.5;margin:20px auto 0}@media(max-width:1050px){.ss-plans{grid-template-columns:repeat(2,1fr);max-width:700px}.ss-plan.ss-student{transform:none}}@media(max-width:800px){.ss-plans{grid-template-columns:1fr;max-width:480px}.ss-detail{min-height:0}}
  `;
  document.head.appendChild(style);
  style.textContent += `.ss-compare,.ss-why{max-width:1120px;margin:32px auto 0;padding:24px;border-radius:18px;background:linear-gradient(125deg,rgba(54,69,111,.68),rgba(75,38,89,.64));border:1px solid var(--line-2)}.ss-compare h2,.ss-why h2{font-size:25px;margin:6px 0 14px}.ss-table-wrap{overflow-x:auto}.ss-compare table{width:100%;border-collapse:collapse;min-width:650px;text-align:center;font-size:13px}.ss-compare th,.ss-compare td{padding:12px 10px;border-bottom:1px solid var(--line-2)}.ss-compare thead th{color:var(--honey);font-size:12px;text-transform:uppercase;letter-spacing:.07em}.ss-compare tbody th{text-align:left;color:var(--ink-2);font-weight:650}.ss-compare td{color:var(--teal);font-size:16px;font-weight:800}.ss-compare-note{color:var(--muted);font-size:12px;line-height:1.5;margin:14px 0 0}.ss-why>div{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.ss-why p{font-size:13.5px;color:var(--ink-2);line-height:1.55}.ss-why b{color:var(--honey)}.ss-free{display:block;margin:18px auto 0;border:1px solid var(--teal);background:transparent;color:var(--teal);border-radius:999px;padding:9px 16px;font-weight:800;font-size:13px}.ss-free:hover:not(:disabled){background:rgba(68,209,184,.13)}.ss-code{max-width:760px;margin:24px auto 0;display:grid;grid-template-columns:1.05fr 1fr 1fr auto;gap:8px;align-items:center;background:rgba(23,31,45,.72);border:1px solid var(--line);padding:12px;border-radius:14px}.ss-code strong{font-size:13px}.ss-code input,.ss-support input,.ss-support textarea{min-width:0;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}.ss-code .ghost{padding:8px 13px}.ss-support{max-width:760px;margin:24px auto 0;display:grid;gap:8px;padding:14px;border-radius:14px;background:rgba(23,31,45,.72);border:1px solid var(--line)}.ss-support strong{font-size:15px}.ss-support span,.ss-support small{font-size:12px;color:var(--muted)}.ss-support textarea{min-height:88px;resize:vertical}.ss-support .ghost{justify-self:start}@media(max-width:800px){.ss-code{grid-template-columns:1fr}.ss-code .ghost{width:100%}.ss-why>div{grid-template-columns:1fr}.ss-compare,.ss-why{padding:18px}}`;
})();
