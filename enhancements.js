/* StudentSpark visual choices, answer feedback, and accuracy reminder.
   This is deliberately local-only: changing a mascot does not send data or use AI. */
(() => {
  document.title = 'StudentSpark Copilot | Source-aware study help';
  const choices = [
    ['kind', 'Kind'], ['focused', 'Focused'], ['funny', 'Funny'], ['bold', 'Bold'],
    ['calm', 'Calm'], ['spark', 'Spark']
  ];
  const key = 'studentspark-mascot';
  const asset = id => `/assets/mascots/${id}.png`;
  const selected = () => localStorage.getItem(key) || 'kind';
  const setSelected = id => { localStorage.setItem(key, id); decorate(); };
  const image = (id = selected()) => `<img src="${asset(id)}" alt="${choices.find(x => x[0] === id)?.[1] || 'StudentSpark'} mascot">`;

  function decorate() {
    document.querySelectorAll('.brand-mark, .a-mark').forEach(el => {
      if (el.dataset.ssMascot === selected()) return;
      el.dataset.ssMascot = selected();
      el.innerHTML = image();
    });
    const button = document.querySelector('.ss-mascot-launch');
    if (button) button.innerHTML = image() + '<span>Mascot</span>';
  }

  function addMascotControl() {
    const brand = document.querySelector('.top .brand');
    if (!brand || document.querySelector('.ss-mascot-launch')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'ss-mascot-launch';
    button.title = 'Choose your StudentSpark mascot';
    const picker = document.createElement('div');
    picker.className = 'ss-mascot-picker'; picker.hidden = true;
    picker.innerHTML = '<strong>Choose your mascot</strong><span>Saved only on this device.</span><div class="ss-mascot-options">' + choices.map(([id, label]) => `<button type="button" data-mascot="${id}">${image(id)}<b>${label}</b></button>`).join('') + '</div>';
    button.addEventListener('click', () => { picker.hidden = !picker.hidden; });
    picker.addEventListener('click', event => {
      const choice = event.target.closest('[data-mascot]');
      if (!choice) return;
      setSelected(choice.dataset.mascot); picker.hidden = true;
    });
    brand.insertAdjacentElement('afterend', button);
    button.insertAdjacentElement('afterend', picker);
  }

  function addAccuracyNote() {
    const wrap = document.querySelector('.composer-wrap');
    if (!wrap || wrap.querySelector('.ss-ai-notice')) return;
    const note = document.createElement('p');
    note.className = 'ss-ai-notice';
    note.textContent = 'StudentSpark is AI and can make mistakes. Check important information with your instructor, official school sources, or the original source.';
    wrap.appendChild(note);
  }

  function addFeedback() {
    document.querySelectorAll('.a-row .answer:not([data-ss-feedback])').forEach(answerEl => {
      answerEl.dataset.ssFeedback = '1';
      const controls = document.createElement('div');
      controls.className = 'ss-answer-feedback';
      controls.innerHTML = '<span>Was this helpful?</span><button type="button" data-rating="like" aria-label="Like this answer">👍</button><button type="button" data-rating="dislike" aria-label="Dislike this answer">👎</button><small></small><form hidden><label>What should StudentSpark improve?<textarea required minlength="5" maxlength="1500" placeholder="For example: the explanation missed a step or a source was not relevant."></textarea></label><button type="submit">Send feedback</button></form>';
      const status = controls.querySelector('small');
      const form = controls.querySelector('form');
      const answerText = () => answerEl.cloneNode(true).textContent.trim().slice(0, 6000);
      controls.addEventListener('click', async event => {
        const rating = event.target.dataset.rating;
        if (!rating) return;
        if (rating === 'dislike') { form.hidden = false; status.textContent = 'Tell us what was inaccurate or unhelpful.'; return; }
        try {
          await fetch('/api/feedback', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 'like', answer: answerText() }) });
          status.textContent = 'Thanks for the feedback.';
        } catch { status.textContent = 'Thanks for the feedback.'; }
      });
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const note = form.querySelector('textarea').value.trim();
        status.textContent = 'Sending…';
        try {
          const response = await fetch('/api/feedback', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 'dislike', note, answer: answerText() }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Could not send feedback.');
          form.hidden = true; status.textContent = 'Thank you—your feedback was sent to the StudentSpark team.';
        } catch (error) { status.textContent = error.message || 'Could not send feedback.'; }
      });
      answerEl.appendChild(controls);
    });
  }

  function mountStandaloneGate(gate) {
    if (document.getElementById('ss-public-gate')) return true;
    // This sits outside React's #root. The legacy bundle cannot receive its
    // events, which makes the public payment gate reliable on mobile and
    // desktop even when the original bundle is cached or partially hydrated.
    const panel = document.createElement('main');
    panel.id = 'ss-public-gate';
    panel.innerHTML = `<section class="ssg-shell"><header class="ssg-head"><div class="ssg-brand"><span>✦</span><b>StudentSpark</b> Copilot</div><p>Study help that makes difficult ideas click.</p></header><section class="ssg-hero"><p class="ssg-kicker">FOR .EDU STUDENTS</p><h1>Learn with clarity.<br>Start with a plan.</h1><p>Your calm study partner for difficult classes, memorable analogies, and source-aware further reading.</p></section><section class="ssg-card"><label>Student email<input id="ssg-student-id" type="text" spellcheck="false" placeholder="you@school.edu"></label><small>StudentSpark is available to .edu student addresses only.</small><div class="ssg-consents"><label><input type="checkbox"> I agree to the <a href="/terms.html" target="_blank">Terms of Use</a>.</label><label><input type="checkbox"> I have read the <a href="/refunds.html" target="_blank">Refund & Cancellation Policy</a>.</label><label><input type="checkbox"> I have read the <a href="/privacy.html" target="_blank">Privacy Notice</a>.</label></div><p class="ssg-status" aria-live="polite"></p></section><section class="ssg-plans"><article><b>DAY PASS</b><h2>$1.99 <small>/ 24 hours</small></h2><p>Focused study guidance, trusted-source suggestions, and a short practice set.</p><button data-plan="day">Get 24-hour access</button></article><article class="hot"><b>PLUS</b><h2>$5 <small>/ month</small></h2><p>Study guidance, My Week planning, practice questions, and trusted reading suggestions.</p><button data-plan="plus_monthly">Choose Plus</button><button class="ssg-link" data-plan="plus_annual">$50 / year — 2 months free</button></article><article><b>PRO</b><h2>$7.99 <small>/ month</small></h2><p>More academic depth with explanations, analogies, practice, and sources.</p><button data-plan="pro_monthly">Choose Pro</button><button class="ssg-link" data-plan="pro_annual">$79.90 / year — 2 months free</button></article><article><b>SUPER</b><h2>$15 <small>/ month</small></h2><p>Complete support with sources, analogies, practice, My Week, and opt-in reminders.</p><button data-plan="super_monthly">Choose Super</button><button class="ssg-link" data-plan="super_annual">$150 / year — 2 months free</button></article></section><section class="ssg-more"><button id="ssg-trial">Try StudentSpark free for 3 days — no card needed</button><form id="ssg-promo"><b>Have a promo code?</b><input id="ssg-promo-student" type="text" placeholder="name@college.edu"><input id="ssg-code" placeholder="Promo code"><button>Unlock access</button></form><form id="ssg-support"><b>Need support?</b><input id="ssg-contact-id" type="text" placeholder="name@college.edu"><textarea id="ssg-support-message" placeholder="Tell the StudentSpark team how we can help."></textarea><button>Send support request</button></form><p>Payments are securely processed by Stripe. Recurring subscriptions can be managed or canceled in Stripe's customer portal.</p></section></section>`;
    document.body.appendChild(panel);
    gate.style.display = 'none';
    const $ = selector => panel.querySelector(selector);
    const email = $('#ssg-student-id');
    const status = $('.ssg-status');
    const validEmail = value => /^[^\s@]+@[^\s@]+\.edu$/i.test((value || '').trim());
    const agreed = () => [...panel.querySelectorAll('.ssg-consents input')].every(box => box.checked);
    const say = text => { status.textContent = text || ''; };
    const post = async (path, body) => {
      const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'StudentSpark could not complete that request.');
      return data;
    };
    const checkout = async plan => {
      if (!validEmail(email.value)) return say('Enter a valid .edu student email address.');
      if (!agreed()) return say('Please read and check all three purchase acknowledgments first.');
      try { say('Opening secure Stripe checkout…'); const data = await post('/api/create-checkout', { plan, email: email.value.trim() }); location.assign(data.url); }
      catch (error) { say(error.message || 'Checkout could not be started.'); }
    };
    panel.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => checkout(button.dataset.plan)));
    $('#ssg-trial').addEventListener('click', async () => {
      if (!validEmail(email.value)) return say('Enter a valid .edu student email address to start the free trial.');
      try { say('Starting your trial…'); await post('/api/free-trial', { email: email.value.trim() }); location.reload(); }
      catch (error) { say(error.message || 'The free trial could not be started.'); }
    });
    $('#ssg-promo').addEventListener('submit', async event => {
      event.preventDefault(); const promoEmail = $('#ssg-promo-student').value.trim(); const code = $('#ssg-code').value.trim();
      if (!validEmail(promoEmail)) return say('Enter a valid .edu student email address for the promo code.');
      if (!code) return say('Enter your promo code.');
      try { say('Unlocking your access…'); await post('/api/redeem-code', { email: promoEmail, code }); location.reload(); }
      catch (error) { say(error.message || 'That promo code could not be used.'); }
    });
    $('#ssg-support').addEventListener('submit', async event => {
      event.preventDefault(); const supportEmail = $('#ssg-contact-id').value.trim(); const message = $('#ssg-support-message').value.trim();
      if (!supportEmail || !message) return say('Enter your email and support request first.');
      try { say('Sending your support request…'); await post('/api/support', { email: supportEmail, message }); $('#ssg-support-message').value = ''; say('Your support request was sent.'); }
      catch (error) { say(error.message || 'Your support request could not be sent.'); }
    });
    return true;
  }

  // The original app is a legacy browser bundle. On a few browsers it can
  // paint React-controlled fields without delivering their change events.
  // Replace only the public gate controls with native equivalents so typing,
  // consent boxes, checkout, free trials, and promo redemption remain usable.
  function repairGateControls() {
    const gate = document.querySelector('.ss-gate');
    if (gate && mountStandaloneGate(gate)) return;
    if (!gate || gate.dataset.ssGateReady) return;
    gate.dataset.ssGateReady = '1';

    const native = element => {
      if (!element || element.dataset.ssNative) return element;
      const copy = element.cloneNode(true);
      copy.dataset.ssNative = '1';
      if (copy.type === 'checkbox') {
        copy.checked = element.checked;
        copy.removeAttribute('checked');
      } else {
        copy.value = element.value || '';
        // The legacy React bundle only reclaims `type=email` controls. Keep
        // the familiar email keyboard/autofill hints but validate .edu on the
        // server and in `validEmail` rather than through that broken path.
        if (copy.type === 'email') {
          copy.type = 'text';
          copy.inputMode = 'email';
          copy.autocomplete = 'email';
          copy.spellcheck = false;
        }
      }
      element.replaceWith(copy);
      return copy;
    };
    const email = native(gate.querySelector('[aria-label="Student .edu email address"]'));
    const promoEmail = native(gate.querySelector('[aria-label="Email address"]'));
    const promoCode = native(gate.querySelector('[aria-label="Promo code"]'));
    const supportEmail = native(gate.querySelector('[aria-label="Support email"]'));
    const supportRequest = native(gate.querySelector('[aria-label="Support request"]'));
    const consents = [...gate.querySelectorAll('.ss-consent input[type="checkbox"]')].map(native);
    // React's document-level event handler still sees events from cloned
    // controls and can re-apply the old controlled value (an empty string).
    // Keep native field events inside the native controls; their own listeners
    // below still run, while the legacy bundle cannot reset what was typed.
    [email, promoEmail, promoCode, supportEmail, supportRequest, ...consents]
      .filter(Boolean)
      .forEach(control => ['input', 'change', 'click'].forEach(type => {
        control.addEventListener(type, event => event.stopPropagation());
      }));
    const replaceSelection = (control, text) => {
      const start = control.selectionStart ?? control.value.length;
      const end = control.selectionEnd ?? start;
      control.value = control.value.slice(0, start) + text + control.value.slice(end);
      const cursor = start + text.length;
      control.setSelectionRange?.(cursor, cursor);
      control.dispatchEvent(new Event('ss-native-input'));
    };
    // In this legacy bundle React listens at document capture phase, before a
    // normal input listener can stop it. Handling `beforeinput` ourselves
    // prevents the browser's controlled-input update entirely and preserves
    // keystrokes (including mobile keyboards and paste) in the native copy.
    [email, promoEmail, promoCode, supportEmail, supportRequest]
      .filter(Boolean)
      .forEach(control => {
        control.addEventListener('beforeinput', event => {
          const type = event.inputType || '';
          let text = event.data;
          if (type === 'insertFromPaste') text = event.dataTransfer?.getData('text/plain') || '';
          if (type.startsWith('insert') && text != null) {
            event.preventDefault(); replaceSelection(control, text); return;
          }
          if (type === 'deleteContentBackward') {
            event.preventDefault();
            const start = control.selectionStart ?? control.value.length;
            const end = control.selectionEnd ?? start;
            if (start !== end) replaceSelection(control, '');
            else if (start) { control.setSelectionRange?.(start - 1, start); replaceSelection(control, ''); }
          }
          if (type === 'deleteContentForward') {
            event.preventDefault();
            const start = control.selectionStart ?? control.value.length;
            const end = control.selectionEnd ?? start;
            if (start !== end) replaceSelection(control, '');
            else { control.setSelectionRange?.(start, start + 1); replaceSelection(control, ''); }
          }
        });
        control.addEventListener('paste', event => {
          event.preventDefault();
          replaceSelection(control, event.clipboardData?.getData('text/plain') || '');
        });
      });
    const status = document.createElement('p');
    status.className = 'ss-error'; status.hidden = true;
    gate.appendChild(status);
    const message = text => { status.textContent = text; status.hidden = !text; };
    const validEmail = value => /^[^\s@]+@[^\s@]+\.edu$/i.test((value || '').trim());
    const agreed = () => consents.every(box => box.checked);
    const post = async (path, body) => {
      const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'StudentSpark could not complete that request.');
      return data;
    };
    const requireCheckout = () => {
      if (!validEmail(email?.value)) { message('Enter a valid .edu student email address.'); return false; }
      if (!agreed()) { message('Please read and check all three purchase acknowledgments first.'); return false; }
      return true;
    };
    const checkoutButtons = [];
    const replaceButton = (button, handler) => {
      if (!button || button.dataset.ssNative) return;
      const copy = button.cloneNode(true);
      copy.dataset.ssNative = '1'; copy.disabled = false;
      button.replaceWith(copy);
      copy.addEventListener('click', handler);
      return copy;
    };
    const planFor = card => card.classList.contains('ss-day') ? 'day' : card.classList.contains('ss-student') ? 'plus' : card.classList.contains('ss-academic_monthly') ? 'pro' : 'super';
    gate.querySelectorAll('.ss-plan').forEach(card => {
      const prefix = planFor(card);
      const monthly = replaceButton(card.querySelector('.ss-cta'), async () => {
        if (!requireCheckout()) return;
        try {
          message('Opening secure Stripe checkout…');
          const data = await post('/api/create-checkout', { plan: prefix === 'day' ? 'day' : prefix + '_monthly', email: email.value.trim() });
          window.location.assign(data.url);
        } catch (error) { message(error.message || 'Checkout could not be started.'); }
      });
      if (monthly) checkoutButtons.push({ button: monthly, plan: prefix });
      replaceButton(card.querySelector('.ss-annual'), async () => {
        if (!requireCheckout()) return;
        try {
          message('Opening secure Stripe checkout…');
          const data = await post('/api/create-checkout', { plan: prefix + '_annual', email: email.value.trim() });
          window.location.assign(data.url);
        } catch (error) { message(error.message || 'Checkout could not be started.'); }
      });
    });
    replaceButton(gate.querySelector('.ss-free'), async () => {
      if (!validEmail(email?.value)) { message('Enter a valid .edu student email address to start the free trial.'); return; }
      try { message('Starting your trial…'); await post('/api/free-trial', { email: email.value.trim() }); window.location.reload(); }
      catch (error) { message(error.message || 'The free trial could not be started.'); }
    });
    replaceButton(gate.querySelector('.ss-code button'), async () => {
      if (!validEmail(promoEmail?.value)) { message('Enter a valid .edu student email address for the promo code.'); return; }
      if (!promoCode?.value.trim()) { message('Enter your promo code.'); return; }
      try { message('Unlocking your access…'); await post('/api/redeem-code', { email: promoEmail.value.trim(), code: promoCode.value.trim() }); window.location.reload(); }
      catch (error) { message(error.message || 'That promo code could not be used.'); }
    });
    replaceButton(gate.querySelector('.ss-support button'), async () => {
      if (!supportEmail?.value || !supportRequest?.value) { message('Enter your email and support request first.'); return; }
      try {
        message('Sending your support request…');
        await post('/api/support', { email: supportEmail.value.trim(), message: supportRequest.value.trim() });
        supportRequest.value = ''; message('Your support request was sent.');
      } catch (error) { message(error.message || 'Your support request could not be sent.'); }
    });
    const refreshCheckoutLabels = () => {
      const eligible = validEmail(email?.value) && agreed();
      checkoutButtons.forEach(({ button, plan }) => {
        button.textContent = eligible ? (plan === 'day' ? 'Get 24-hour access' : `Choose ${plan[0].toUpperCase()}${plan.slice(1)}`) : 'Enter .edu email + agree first';
        button.setAttribute('aria-disabled', eligible ? 'false' : 'true');
      });
    };
    [email, ...consents].filter(Boolean).forEach(control => {
      control.addEventListener('input', refreshCheckoutLabels);
      control.addEventListener('change', refreshCheckoutLabels);
      control.addEventListener('ss-native-input', refreshCheckoutLabels);
    });
    refreshCheckoutLabels();
  }

  const style = document.createElement('style');
  style.textContent = `.brand-mark img,.a-mark img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}.ss-mascot-launch{position:absolute;left:158px;top:12px;border:1px solid var(--line-2);background:var(--card);color:var(--ink-2);border-radius:999px;padding:4px 9px 4px 5px;display:flex;gap:5px;align-items:center;font:700 11px inherit}.ss-mascot-launch img{width:22px;height:22px;border-radius:7px;object-fit:cover}.ss-mascot-picker{position:fixed;z-index:70;top:56px;left:18px;width:min(330px,calc(100vw - 36px));padding:13px;border:1px solid var(--line-2);border-radius:14px;background:var(--card);box-shadow:0 14px 40px rgba(0,0,0,.4)}.ss-mascot-picker strong{display:block;font-size:13px}.ss-mascot-picker>span{display:block;font-size:11px;color:var(--muted);margin:2px 0 10px}.ss-mascot-options{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.ss-mascot-options button{border:1px solid var(--line-2);border-radius:10px;background:var(--card-2);color:var(--ink-2);padding:6px 4px;font:700 10px inherit}.ss-mascot-options button:hover{border-color:var(--flame)}.ss-mascot-options img{display:block;width:38px;height:38px;margin:0 auto 3px;border-radius:10px;object-fit:cover}.ss-ai-notice{max-width:740px;margin:9px auto 0;text-align:center;color:var(--muted);font-size:11px;line-height:1.45}.ss-answer-feedback{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:14px;padding-top:10px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)}.ss-answer-feedback button{border:1px solid var(--line-2);border-radius:8px;background:var(--card);color:var(--ink-2);padding:3px 7px;font:inherit}.ss-answer-feedback button:hover{border-color:var(--flame)}.ss-answer-feedback small{flex-basis:100%;font-size:11px;color:var(--flame-deep)}.ss-answer-feedback form{flex-basis:100%;display:grid;gap:6px}.ss-answer-feedback label{display:grid;gap:4px;color:var(--ink-2);font-weight:700}.ss-answer-feedback textarea{min-height:70px;border:1px solid var(--line-2);border-radius:8px;background:var(--card-2);color:var(--ink);padding:8px;font:inherit;font-size:12px}.ss-answer-feedback form button{justify-self:start;padding:6px 10px}.e-day-actions{display:flex;gap:4px;align-items:center}.e-day.all{border-color:var(--flame);color:var(--flame-deep)}.e-day.none{font-size:10px;white-space:nowrap;border-color:var(--line-2);color:var(--muted)}@media(max-width:600px){.ss-mascot-launch{left:auto;right:12px;top:11px}.ss-mascot-launch span{display:none}.ss-mascot-picker{left:10px;top:57px}}`;
  document.head.appendChild(style);
  const mascotGridStyle = document.createElement('style');
  mascotGridStyle.textContent = '.ss-mascot-options{grid-template-columns:repeat(3,1fr)}';
  document.head.appendChild(mascotGridStyle);
  const publicGateStyle = document.createElement('style');
  publicGateStyle.textContent = `#ss-public-gate{position:fixed;inset:0;z-index:999999;overflow:auto;background:radial-gradient(circle at 20% 0,#394a75 0,#1d2638 42%,#111827 100%);color:#eef4ff;font:15px/1.5 Outfit,ui-sans-serif,system-ui,sans-serif}#ss-public-gate *{box-sizing:border-box}#ss-public-gate .ssg-shell{width:min(1120px,100%);margin:auto;padding:22px 22px 50px}#ss-public-gate .ssg-head{display:flex;justify-content:space-between;align-items:center;color:#b9c6dc;font-size:13px}#ss-public-gate .ssg-head p{margin:0}.ssg-brand{font-size:18px}.ssg-brand span{display:inline-grid;place-items:center;width:27px;height:27px;border-radius:9px;background:#78a6ff;color:#101a2b;margin-right:6px}.ssg-hero{text-align:center;max-width:680px;margin:34px auto 22px}.ssg-kicker{font-size:11px;font-weight:800;letter-spacing:.15em;color:#9fc1ff}.ssg-hero h1{font-size:clamp(34px,6vw,59px);line-height:1.03;letter-spacing:-.05em;margin:8px 0 13px}.ssg-hero>p:last-child{color:#c6d2e7;font-size:17px}.ssg-card,.ssg-plans article,.ssg-more{background:rgba(35,48,72,.92);border:1px solid #526686;border-radius:16px;box-shadow:0 14px 30px rgba(0,0,0,.2)}.ssg-card{max-width:720px;margin:0 auto 18px;padding:18px}.ssg-card>label{display:grid;gap:6px;font-weight:700}.ssg-card input,.ssg-more input,.ssg-more textarea{width:100%;border:1px solid #5c7093;background:#162136;color:#f5f8ff;border-radius:9px;padding:11px;font:inherit;outline:none}.ssg-card input:focus,.ssg-more input:focus,.ssg-more textarea:focus{border-color:#91b7ff;box-shadow:0 0 0 3px #75a8ff33}.ssg-card small{display:block;color:#aebbd1;margin-top:5px}.ssg-consents{display:grid;gap:7px;margin-top:15px;color:#d8e2f1;font-size:13px}.ssg-consents label{display:flex;gap:8px;align-items:flex-start}.ssg-consents input{width:auto;margin-top:3px}.ssg-consents a{color:#a7c5ff}.ssg-status{min-height:23px;color:#ffd1db;font-weight:650;margin:12px 0 0}.ssg-plans{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.ssg-plans article{padding:17px;display:flex;flex-direction:column}.ssg-plans article.hot{border-color:#88adff;background:linear-gradient(155deg,#2a3f68,#25344e)}.ssg-plans b{font-size:11px;letter-spacing:.12em;color:#9dc0ff}.ssg-plans h2{font-size:26px;margin:8px 0 4px}.ssg-plans h2 small{font-size:13px;color:#b8c6db}.ssg-plans p{color:#c3d0e3;font-size:13px;flex:1}.ssg-plans button,.ssg-more button{border:0;border-radius:9px;background:#8db4ff;color:#12203a;font:700 13px inherit;padding:10px;cursor:pointer;margin-top:9px}.ssg-plans button:hover,.ssg-more button:hover{filter:brightness(1.08)}.ssg-plans .ssg-link{background:transparent;color:#b8d0ff;border:1px solid #566b90;padding:8px}.ssg-more{margin-top:18px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:15px}.ssg-more form{display:grid;gap:8px}.ssg-more textarea{min-height:90px;resize:vertical}.ssg-more>p{grid-column:1/-1;color:#aebbd1;margin:0;font-size:12px}.ssg-more>#ssg-trial{grid-column:1/-1;background:#67d1b5}@media(max-width:800px){.ssg-plans{grid-template-columns:1fr 1fr}}@media(max-width:570px){#ss-public-gate .ssg-shell{padding:14px 12px 35px}.ssg-head p{display:none}.ssg-hero{margin:24px auto 16px}.ssg-hero>p:last-child{font-size:15px}.ssg-card{padding:14px}.ssg-plans,.ssg-more{grid-template-columns:1fr}.ssg-more>#ssg-trial,.ssg-more>p{grid-column:auto}}`;
  document.head.appendChild(publicGateStyle);
  const update = () => { addMascotControl(); decorate(); addAccuracyNote(); addFeedback(); repairGateControls(); };
  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', update);
  update();
})();
