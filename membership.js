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
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [billingConsent, setBillingConsent] = useState(false);
    const [refundConsent, setRefundConsent] = useState(false);
    const [privacyConsent, setPrivacyConsent] = useState(false);
    const [supportMessage, setSupportMessage] = useState("");
    const [supportStatus, setSupportStatus] = useState("");
    const [theme, setTheme] = useState(() => {
      try { return localStorage.getItem("studentspark-theme") || "aurora"; } catch { return "aurora"; }
    });
    const [surface, setSurface] = useState(() => {
      try { return localStorage.getItem("studentspark-surface") || "night"; } catch { return "night"; }
    });
    const [frame, setFrame] = useState(() => {
      try { return localStorage.getItem("studentspark-frame") || "glass"; } catch { return "glass"; }
    });
    const [promptColor, setPromptColor] = useState(() => {
      try { return localStorage.getItem("studentspark-prompt") || "blue"; } catch { return "blue"; }
    });
    const [mascot, setMascot] = useState(() => {
      try { return localStorage.getItem("studentspark-mascot") || "kind"; } catch { return "kind"; }
    });
    const [mascotOpen, setMascotOpen] = useState(false);
    const [styleOpen, setStyleOpen] = useState(false);

    // A real whitespace matcher is important here.  The previous double-escaped
    // version treated the letter "s" as invalid, rejecting valid addresses such
    // as snb159@scarletmail.rutgers.edu.
    function isEduEmail(value) { return /^[^\s@]+@[^\s@]+\.edu$/i.test(String(value || "").trim()); }

    useEffect(() => {
      let cancelled = false;
      fetch("/api/session", { credentials: "same-origin" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (!cancelled && data && data.active) setSession(data); })
        .catch(() => {})
      return () => { cancelled = true; };
    }, []);

    // A browser-back from Stripe restores the page from its cache. Clear the
    // checkout spinner on pageshow so another plan can be selected right away.
    useEffect(() => {
      const releaseCheckout = () => setBusy(false);
      window.addEventListener("pageshow", releaseCheckout);
      return () => window.removeEventListener("pageshow", releaseCheckout);
    }, []);

    // Themes are purely local presentation preferences: no AI request, account
    // data, or paid service is used to change colors.
    useEffect(() => {
      document.documentElement.dataset.studentsparkTheme = theme;
      try { localStorage.setItem("studentspark-theme", theme); } catch {}
    }, [theme]);
    useEffect(() => {
      document.documentElement.dataset.studentsparkSurface = surface;
      try { localStorage.setItem("studentspark-surface", surface); } catch {}
    }, [surface]);
    useEffect(() => {
      document.documentElement.dataset.studentsparkFrame = frame;
      try { localStorage.setItem("studentspark-frame", frame); } catch {}
    }, [frame]);
    useEffect(() => {
      document.documentElement.dataset.studentsparkPrompt = promptColor;
      try { localStorage.setItem("studentspark-prompt", promptColor); } catch {}
    }, [promptColor]);
    useEffect(() => {
      document.documentElement.dataset.studentsparkMascot = mascot;
      try { localStorage.setItem("studentspark-mascot", mascot); } catch {}
    }, [mascot]);

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
      if (!(billingConsent && refundConsent && privacyConsent)) { setError("Please review and check each required billing, refund, and privacy box before continuing to secure checkout."); return; }
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/create-checkout", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, email: email.trim() })
        });
        const data = await r.json();
        if (!r.ok || !data.url) throw new Error(data.error || "Checkout could not be started.");
        setBusy(false);
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
        // The server has now written the signed access cookie. Reloading from
        // that cookie is more reliable than trying to swap the legacy app in
        // place, especially after a mobile browser restores a cached page.
        window.location.reload();
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
        setBusy(false);
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
        setBusy(false);
        window.location.assign(data.url);
      } catch (e) { setError(e.message || "Study Credits could not be started."); setBusy(false); }
    }

    async function redeem(event) {
      event.preventDefault();
      if (!isEduEmail(email)) { setError("Enter a valid .edu student email address for the promo code."); return; }
      if (!billingConsent || !refundConsent || !privacyConsent) {
        setError("Please read and check all three acknowledgments before redeeming a promo code.");
        return;
      }
      setBusy(true); setError("");
      try {
        const r = await fetch("/api/redeem-code", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code })
        });
        const data = await r.json();
        if (!r.ok || !data.active) throw new Error(data.error || "That code could not be used.");
        // Promo redemption also writes the signed access cookie. Use a clean
        // page load so the legacy chat shell receives that session reliably.
        window.location.reload();
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

    const subscriptionPlan = ['plus', 'pro', 'super'].includes(session?.plan);
    const paidMember = subscriptionPlan && !session?.promo;
    const choiceRow = (label, choices, selected, setSelected) => <div className="ss-theme-row"><span>{label}</span>{choices.map(([value, title]) => <button key={value} type="button" className={selected === value ? "selected" : ""} onClick={() => setSelected(value)}>{title}</button>)}</div>;
    const themePicker = <div className="ss-style-dock" aria-label="Color customization">
      <button type="button" className="ss-style-launch" aria-expanded={styleOpen} onClick={() => setStyleOpen(open => !open)}>✦ Style</button>
      {styleOpen && <div className="ss-theme-picker"><strong>Make it yours</strong>
        {choiceRow("Theme", [['aurora', 'Aurora'], ['ocean', 'Ocean'], ['rose', 'Rose'], ['midnight', 'Midnight'], ['forest', 'Forest'], ['sunset', 'Sunset']], theme, setTheme)}
        {choiceRow("Background", [['night', 'Night'], ['navy', 'Navy'], ['plum', 'Plum'], ['slate', 'Slate']], surface, setSurface)}
        {choiceRow("Frame", [['glass', 'Glass'], ['violet', 'Violet'], ['gold', 'Gold'], ['mint', 'Mint']], frame, setFrame)}
        {choiceRow("My prompts", [['blue', 'Blue'], ['mint', 'Mint'], ['pink', 'Pink'], ['amber', 'Amber']], promptColor, setPromptColor)}
      </div>}
    </div>;
    const mascotChoices = [['kind', 'Kind'], ['focused', 'Focused'], ['funny', 'Funny'], ['bold', 'Bold'], ['calm', 'Calm'], ['spark', 'Spark']];
    const mascotPicker = subscriptionPlan && <div className="ss-mascot-dock">
      <button type="button" className="ss-mascot-launch" aria-label="Choose your StudentSpark mascot" aria-expanded={mascotOpen} onClick={() => setMascotOpen(open => !open)}>
        <img src={`/assets/mascots/${mascot}.png`} alt="" />
      </button>
      <div className={`ss-mascot-panel ${mascotOpen ? "open" : ""}`} aria-hidden={!mascotOpen}>
        <strong>Choose your mascot</strong><span>Saved only on this device.</span>
        <div>{mascotChoices.map(([value, title]) => <button key={value} type="button" className={mascot === value ? "selected" : ""} onClick={() => { setMascot(value); setMascotOpen(false); }}><img src={`/assets/mascots/${value}.png`} alt="" />{title}</button>)}</div>
      </div>
    </div>;
    if (session) return <React.Fragment>
      {children({ name: session.name || session.email, email: session.email, plan: session.plan }, signOut)}
      {subscriptionPlan && <button className="ss-manage" onClick={manageMembership} disabled={busy || !paidMember}>{paidMember ? "Manage or cancel membership" : "Manage or cancel membership (trial)"}</button>}
      {subscriptionPlan && !paidMember && <p className="ss-trial-cancel">Promo access ends automatically. There is no paid membership to cancel.</p>}
      {paidMember && <button className="ss-credits" onClick={buyStudyCredits} disabled={busy}>Add Study Credits</button>}
      {themePicker}
      {mascotPicker}
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
      <div className="ss-consents" aria-label="Required purchase acknowledgments">
        <label className="ss-consent"><input type="checkbox" checked={billingConsent} onChange={e => setBillingConsent(e.target.checked)} /> <span>I have read and agree to the <a href="/terms.html">Terms of Use</a>. I understand that Stripe processes payments and monthly or annual plans renew until canceled.</span></label>
        <label className="ss-consent"><input type="checkbox" checked={refundConsent} onChange={e => setRefundConsent(e.target.checked)} /> <span>I have read the <a href="/refunds.html">Refund &amp; Cancellation Policy</a>, including that digital access is generally not automatically refundable after use.</span></label>
        <label className="ss-consent"><input type="checkbox" checked={privacyConsent} onChange={e => setPrivacyConsent(e.target.checked)} /> <span>I have read the <a href="/privacy.html">Privacy Notice</a>.</span></label>
      </div>
      <p className="ss-checkout-note">Enter your .edu address and check the agreement above to unlock secure Stripe checkout.</p>
      <p className="ss-checkout-legal"><b>Before you choose:</b> Day Passes are one-time purchases. Monthly and annual plans renew until canceled. Read the <a href="/terms.html">Terms</a>, <a href="/refunds.html">Refund &amp; Cancellation Policy</a>, and <a href="/privacy.html">Privacy Notice</a>.</p>
      <section className="ss-plans" aria-label="Subscription plans">
        {Object.keys(PLAN_COPY).map(plan => <PlanCard key={plan} plan={plan} busy={busy} canCheckout={isEduEmail(email) && billingConsent && refundConsent && privacyConsent} choose={choose} />)}
      </section>
      <section className="ss-how" aria-label="How to use StudentSpark">
        <p className="ss-eyebrow">How it works</p><h2>Four simple steps to get unstuck.</h2>
        <div><p><b>1. Choose your support.</b> Pick the plan that fits your semester.</p><p><b>2. Ask naturally.</b> Type a question or choose a prompt category.</p><p><b>3. Learn the method.</b> Get a clear answer, a next step, and trusted further reading when available.</p><p><b>4. Plan your week.</b> Eligible plans can turn your own commitments into an editable My Week schedule.</p></div>
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
        <button className="ghost" disabled={busy || !isEduEmail(email) || !billingConsent || !refundConsent || !privacyConsent} type="submit">{busy ? "Checking…" : "Agree above to unlock"}</button>
      </form>
      <p className="ss-foot">Payments are securely processed by Stripe. You can manage or cancel a recurring subscription from the customer portal.</p>
      <p className="ss-legal"><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/refunds.html">Refunds & cancellations</a></p>
      {supportForm}
    </div>;
  }

  window.AuthGate = AuthGate;
  document.title = "StudentSpark Copilot";
  const style = document.createElement("style");
  style.textContent = `
    .ss-gate .brand-mark{font-size:0;background:#172948 url('/assets/mascots/kind.png') center/cover no-repeat;overflow:hidden}.ss-gate .brand-mark:after{content:''}.brand-n{font-size:0}.brand-n:after{content:'StudentSpark Copilot';font-size:16px}.ss-gate{min-height:100%;padding:44px 24px 56px;background:radial-gradient(circle at 15% 8%,#263f6b 0,transparent 30%),radial-gradient(circle at 88% 12%,#4d2358 0,transparent 30%),var(--bg);color:var(--ink)}
    .ss-hero{max-width:940px;margin:0 auto 28px;text-align:center}.ss-hero .brand{justify-content:center;margin-bottom:30px}.ss-kicker,.ss-eyebrow{font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--flame-2)}.ss-hero h1{font-size:clamp(38px,6vw,70px);line-height:1.02;letter-spacing:-.055em;margin:10px auto 14px;max-width:800px}.ss-hero h1 span{color:#f7c7ef}.ss-lede{max-width:710px;margin:0 auto;color:var(--ink-2);font-size:16px;line-height:1.6}.ss-email{display:block;max-width:440px;margin:0 auto 24px;text-align:left}.ss-email span{display:block;font-size:12px;font-weight:800;margin:0 0 6px}.ss-email input{width:100%;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);border-radius:10px;padding:11px 12px;font:inherit}.ss-email small{display:block;color:var(--muted);font-size:11px;margin-top:6px}
    .ss-consents{max-width:650px;margin:0 auto 18px;display:grid;gap:8px}.ss-consent{display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(23,31,45,.54);color:var(--ink-2);font-size:12px;line-height:1.45}.ss-consent input{margin-top:3px;accent-color:var(--flame);flex:none}.ss-consent a{color:var(--teal);font-weight:750}.ss-checkout-note{max-width:650px;margin:0 auto 10px;text-align:center;color:var(--teal);font-size:12px;font-weight:700}.ss-checkout-legal{max-width:650px;margin:0 auto 20px;text-align:center;color:var(--muted);font-size:11.5px;line-height:1.5}.ss-checkout-legal a{color:var(--teal);font-weight:750}.ss-plans{max-width:1260px;margin:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;align-items:stretch}.ss-plan{background:rgba(23,31,45,.88);border:1px solid var(--line-2);border-radius:20px;padding:20px;display:flex;flex-direction:column;box-shadow:0 16px 45px rgba(0,0,0,.18)}.ss-plan-image{width:100%;aspect-ratio:1.45;object-fit:cover;object-position:center;border-radius:13px;margin:0 0 16px;background:#071534}.ss-plan.ss-student{border-color:#62c8ed;transform:translateY(-7px);background:linear-gradient(160deg,#123753,#1a2939)}.ss-plan.ss-academic_monthly{border-color:#e56bd3;background:linear-gradient(160deg,#42184d,#22253e)}.ss-plan.ss-academic{border-color:#f0bd4e;background:linear-gradient(160deg,#4d3610,#25243a)}.ss-plan h2{font-size:23px;margin:8px 0 2px}.ss-price{font-size:25px;font-weight:800;color:var(--honey);margin:0 0 5px}.ss-detail{color:var(--ink-2);font-size:13.5px;line-height:1.5;min-height:62px}.ss-plan ul{list-style:none;margin:14px 0 24px;padding:0;display:flex;flex-direction:column;gap:10px}.ss-plan li{font-size:13px;color:var(--ink-2);padding-left:22px;position:relative;line-height:1.4}.ss-plan li:before{content:'✓';position:absolute;left:0;color:var(--teal);font-weight:800}.ss-billing-actions{margin-top:auto}.ss-cta{width:100%}.ss-cta:disabled{opacity:.58;cursor:not-allowed}.ss-annual{display:block;width:100%;margin-top:8px;border:0;background:transparent;color:var(--teal);font:inherit;font-size:12px;font-weight:800;text-decoration:underline;text-underline-offset:3px}.ss-annual:hover:not(:disabled){color:var(--honey)}.ss-academic .ss-cta{background:#e69bd4}.ss-error{max-width:680px;margin:22px auto 0;padding:10px 14px;border:1px solid #9b4f69;background:#402434;color:#ffc4d6;border-radius:10px;text-align:center}.ss-live-error{position:fixed;z-index:90;right:18px;bottom:104px;max-width:340px;margin:0;padding:10px 14px;border:1px solid #9b4f69;background:#402434;color:#ffc4d6;border-radius:10px;font-size:13px}.ss-manage,.ss-credits{position:fixed;z-index:90;right:18px;border:1px solid var(--line-2);background:var(--card);color:var(--ink-2);border-radius:100px;padding:9px 14px;font:inherit;font-size:12px;font-weight:800;box-shadow:0 6px 20px rgba(0,0,0,.22)}.ss-manage{bottom:18px}.ss-credits{bottom:62px;border-color:var(--teal);color:var(--teal)}.ss-manage:hover:not(:disabled),.ss-credits:hover:not(:disabled){border-color:var(--flame);color:var(--flame-deep)}.ss-trial-cancel{position:fixed;z-index:90;right:18px;bottom:58px;max-width:245px;margin:0;color:var(--muted);font-size:10px;line-height:1.35;text-align:right}.ss-foot{max-width:620px;text-align:center;color:var(--muted);font-size:12px;line-height:1.5;margin:20px auto 0}@media(max-width:1050px){.ss-plans{grid-template-columns:repeat(2,1fr);max-width:700px}.ss-plan.ss-student{transform:none}}@media(max-width:800px){.ss-plans{grid-template-columns:1fr;max-width:480px}.ss-detail{min-height:0}.ss-trial-cancel{right:10px;bottom:54px}}
  `;
  document.head.appendChild(style);
  style.textContent += `.ss-compare,.ss-why,.ss-how{max-width:1120px;margin:32px auto 0;padding:24px;border-radius:18px;background:linear-gradient(125deg,rgba(54,69,111,.68),rgba(75,38,89,.64));border:1px solid var(--line-2)}.ss-compare h2,.ss-why h2,.ss-how h2{font-size:25px;margin:6px 0 14px}.ss-table-wrap{overflow-x:auto}.ss-compare table{width:100%;border-collapse:collapse;min-width:650px;text-align:center;font-size:13px}.ss-compare th,.ss-compare td{padding:12px 10px;border-bottom:1px solid var(--line-2)}.ss-compare thead th{color:var(--honey);font-size:12px;text-transform:uppercase;letter-spacing:.07em}.ss-compare tbody th{text-align:left;color:var(--ink-2);font-weight:650}.ss-compare td{color:var(--teal);font-size:16px;font-weight:800}.ss-compare-note{color:var(--muted);font-size:12px;line-height:1.5;margin:14px 0 0}.ss-why>div,.ss-how>div{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.ss-how>div{grid-template-columns:repeat(4,1fr)}.ss-why p,.ss-how p{font-size:13.5px;color:var(--ink-2);line-height:1.55}.ss-why b,.ss-how b{color:var(--honey)}.ss-free{display:block;margin:18px auto 0;border:1px solid var(--teal);background:transparent;color:var(--teal);border-radius:999px;padding:9px 16px;font-weight:800;font-size:13px}.ss-free:hover:not(:disabled){background:rgba(68,209,184,.13)}.ss-code{max-width:760px;margin:24px auto 0;display:grid;grid-template-columns:1.05fr 1fr 1fr auto;gap:8px;align-items:center;background:rgba(23,31,45,.72);border:1px solid var(--line);padding:12px;border-radius:14px}.ss-code strong{font-size:13px}.ss-code input,.ss-support input,.ss-support textarea{min-width:0;border:1px solid var(--line-2);background:var(--card-2);color:var(--ink);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}.ss-code .ghost{padding:8px 13px}.ss-support{max-width:760px;margin:24px auto 0;display:grid;gap:8px;padding:14px;border-radius:14px;background:rgba(23,31,45,.72);border:1px solid var(--line)}.ss-support strong{font-size:15px}.ss-support span,.ss-support small{font-size:12px;color:var(--muted)}.ss-support textarea{min-height:88px;resize:vertical}.ss-support .ghost{justify-self:start}.ss-theme-picker{position:fixed;z-index:90;left:18px;bottom:18px;display:grid;gap:7px;width:min(440px,calc(100vw - 36px));padding:11px 12px;border:1px solid var(--line-2);border-radius:14px;background:var(--card);box-shadow:0 6px 20px rgba(0,0,0,.22)}.ss-theme-picker strong{font-size:12px;color:var(--ink)}.ss-theme-row{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.ss-theme-row span{width:74px;font-size:10px;color:var(--muted);font-weight:800}.ss-theme-picker button{border:1px solid var(--line-2);background:var(--card-2);color:var(--ink-2);border-radius:999px;padding:4px 7px;font:inherit;font-size:10px;font-weight:750}.ss-theme-picker button.selected{border-color:var(--teal);color:var(--teal);box-shadow:0 0 0 1px var(--teal) inset}:root[data-studentspark-theme="ocean"]{--bg:#061d2c;--card:#0a2a3e;--card-2:#103a51;--line:#285a72;--line-2:#3f7895;--ink:#edfaff;--ink-2:#b9dae8;--muted:#88b4c8;--flame:#66ddeb;--flame-2:#99f0ff;--flame-deep:#c5f6ff;--teal:#71edcf;--honey:#f0d67c}:root[data-studentspark-theme="rose"]{--bg:#260d2b;--card:#35133b;--card-2:#4c1c52;--line:#783878;--line-2:#a9589f;--ink:#fff3fd;--ink-2:#f3cde9;--muted:#d0a3c7;--flame:#ff9bdc;--flame-2:#ffd0ed;--flame-deep:#fff0f9;--teal:#9bf0d2;--honey:#ffdb8a}:root[data-studentspark-theme="midnight"]{--bg:#080b17;--card:#11152a;--card-2:#1a2040;--line:#353d67;--line-2:#515d94;--ink:#f5f7ff;--ink-2:#cdd4ee;--muted:#9da8ca;--flame:#a9b7ff;--flame-2:#d0d8ff;--flame-deep:#f0f2ff;--teal:#8ce6dc;--honey:#f7d983}:root[data-studentspark-theme="forest"]{--bg:#071e19;--card:#0d3129;--card-2:#164438;--line:#2c7061;--line-2:#459582;--ink:#effff9;--ink-2:#c0e9da;--muted:#8dbdaf;--flame:#70e0b6;--flame-2:#a4f6d7;--flame-deep:#d5ffeb;--teal:#6fd6e9;--honey:#f5d776}:root[data-studentspark-theme="sunset"]{--bg:#25101b;--card:#391827;--card-2:#542139;--line:#824158;--line-2:#af6479;--ink:#fff4f4;--ink-2:#f2d0d2;--muted:#d3a3aa;--flame:#ff956b;--flame-2:#ffc09f;--flame-deep:#ffe4d4;--teal:#9fe7ca;--honey:#ffd06d}:root[data-studentspark-surface="navy"]{--bg:#0b1530;--bg-2:#0a1024}:root[data-studentspark-surface="plum"]{--bg:#25122f;--bg-2:#1d0e26}:root[data-studentspark-surface="slate"]{--bg:#18202b;--bg-2:#111820}:root[data-studentspark-frame="violet"]{--card:#2d1a47;--card-2:#452764;--line:#65458a;--line-2:#8862b1}:root[data-studentspark-frame="gold"]{--card:#332b1b;--card-2:#4d4025;--line:#77633a;--line-2:#a58b53}:root[data-studentspark-frame="mint"]{--card:#123832;--card-2:#1d5147;--line:#397568;--line-2:#59a892}:root[data-studentspark-prompt="mint"]{--flame:#61d9b9;--flame-2:#9cefd8;--flame-deep:#d2fff2}:root[data-studentspark-prompt="pink"]{--flame:#ed78b6;--flame-2:#ffb4dc;--flame-deep:#ffe0f2}:root[data-studentspark-prompt="amber"]{--flame:#f4b75e;--flame-2:#ffda94;--flame-deep:#fff0cd}@media(max-width:800px){.ss-code{grid-template-columns:1fr}.ss-code .ghost{width:100%}.ss-why>div,.ss-how>div{grid-template-columns:1fr}.ss-compare,.ss-why,.ss-how{padding:18px}.ss-theme-picker{left:10px;bottom:10px;width:calc(100vw - 20px)}}`;
  style.textContent += `.top .brand-mark{font-size:0;background:#172948 url('/assets/mascots/kind.png') center/cover no-repeat;overflow:hidden}.top .brand-mark:after{content:''}:root[data-studentspark-mascot="focused"] .top .brand-mark{background-image:url('/assets/mascots/focused.png')}:root[data-studentspark-mascot="funny"] .top .brand-mark{background-image:url('/assets/mascots/funny.png')}:root[data-studentspark-mascot="bold"] .top .brand-mark{background-image:url('/assets/mascots/bold.png')}:root[data-studentspark-mascot="calm"] .top .brand-mark{background-image:url('/assets/mascots/calm.png')}:root[data-studentspark-mascot="spark"] .top .brand-mark{background-image:url('/assets/mascots/spark.png')}.ss-style-dock{position:fixed;z-index:91;left:18px;bottom:18px}.ss-style-launch,.ss-legal-dock>button{border:1px solid var(--line-2);background:var(--card);color:var(--ink-2);border-radius:100px;padding:9px 14px;font:800 12px inherit;box-shadow:0 6px 20px rgba(0,0,0,.22)}.ss-style-launch:hover,.ss-legal-dock>button:hover{border-color:var(--flame);color:var(--flame-deep)}.ss-style-dock .ss-theme-picker{position:absolute;left:0;bottom:46px}.ss-legal-dock{position:fixed;z-index:90;right:18px;bottom:106px}.ss-legal-dock>div{position:absolute;right:0;bottom:42px;display:grid;gap:5px;min-width:180px;padding:10px;border:1px solid var(--line-2);border-radius:12px;background:var(--card);box-shadow:0 6px 20px rgba(0,0,0,.22)}.ss-legal-dock a{font-size:12px;font-weight:750;text-decoration:none;color:var(--ink-2)}.ss-legal-dock a:hover{color:var(--flame-deep)}@media(max-width:800px){.ss-style-dock{left:10px;bottom:10px}.ss-style-dock .ss-theme-picker{left:0;bottom:44px}.ss-legal-dock{right:10px;bottom:101px}.ss-theme-picker{width:min(440px,calc(100vw - 20px))}}`;
  style.textContent += `.ss-mascot-dock{position:fixed;z-index:94;left:22px;top:12px}.ss-mascot-launch{width:35px;height:35px;border:1px solid var(--line-2);border-radius:10px;padding:0;background:var(--card);overflow:hidden;cursor:pointer;box-shadow:0 5px 18px rgba(0,0,0,.25)}.ss-mascot-launch img{width:100%;height:100%;display:block;object-fit:cover}.ss-mascot-panel{position:absolute;left:44px;top:0;width:262px;padding:12px;border:1px solid var(--line-2);border-radius:14px;background:var(--card);box-shadow:0 14px 38px rgba(0,0,0,.42);opacity:0;transform:translateX(-12px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}.ss-mascot-panel.open{opacity:1;transform:translateX(0);pointer-events:auto}.ss-mascot-panel strong{display:block;font-size:12px;color:var(--ink)}.ss-mascot-panel>span{display:block;font-size:10.5px;color:var(--muted);margin:2px 0 9px}.ss-mascot-panel>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.ss-mascot-panel button{display:grid;justify-items:center;gap:3px;border:1px solid var(--line-2);border-radius:9px;background:var(--card-2);color:var(--ink-2);padding:5px 3px;font:700 10px inherit;cursor:pointer}.ss-mascot-panel button.selected{border-color:var(--teal);color:var(--teal);box-shadow:0 0 0 1px var(--teal) inset}.ss-mascot-panel img{width:31px;height:31px;border-radius:8px;object-fit:cover}@media(max-width:800px){.ss-mascot-dock{left:11px;top:11px}.ss-mascot-panel{left:42px;width:245px}}`;
})();
