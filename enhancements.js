/* StudentSpark visual choices, answer feedback, and accuracy reminder.
   This is deliberately local-only: changing a mascot does not send data or use AI. */
(() => {
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

  // The original app is a legacy browser bundle. On a few browsers it can
  // paint React-controlled fields without delivering their change events.
  // Replace only the public gate controls with native equivalents so typing,
  // consent boxes, checkout, free trials, and promo redemption remain usable.
  function repairGateControls() {
    const gate = document.querySelector('.ss-gate');
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
    });
    refreshCheckoutLabels();
  }

  const style = document.createElement('style');
  style.textContent = `.brand-mark img,.a-mark img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}.ss-mascot-launch{position:absolute;left:158px;top:12px;border:1px solid var(--line-2);background:var(--card);color:var(--ink-2);border-radius:999px;padding:4px 9px 4px 5px;display:flex;gap:5px;align-items:center;font:700 11px inherit}.ss-mascot-launch img{width:22px;height:22px;border-radius:7px;object-fit:cover}.ss-mascot-picker{position:fixed;z-index:70;top:56px;left:18px;width:min(330px,calc(100vw - 36px));padding:13px;border:1px solid var(--line-2);border-radius:14px;background:var(--card);box-shadow:0 14px 40px rgba(0,0,0,.4)}.ss-mascot-picker strong{display:block;font-size:13px}.ss-mascot-picker>span{display:block;font-size:11px;color:var(--muted);margin:2px 0 10px}.ss-mascot-options{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.ss-mascot-options button{border:1px solid var(--line-2);border-radius:10px;background:var(--card-2);color:var(--ink-2);padding:6px 4px;font:700 10px inherit}.ss-mascot-options button:hover{border-color:var(--flame)}.ss-mascot-options img{display:block;width:38px;height:38px;margin:0 auto 3px;border-radius:10px;object-fit:cover}.ss-ai-notice{max-width:740px;margin:9px auto 0;text-align:center;color:var(--muted);font-size:11px;line-height:1.45}.ss-answer-feedback{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:14px;padding-top:10px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted)}.ss-answer-feedback button{border:1px solid var(--line-2);border-radius:8px;background:var(--card);color:var(--ink-2);padding:3px 7px;font:inherit}.ss-answer-feedback button:hover{border-color:var(--flame)}.ss-answer-feedback small{flex-basis:100%;font-size:11px;color:var(--flame-deep)}.ss-answer-feedback form{flex-basis:100%;display:grid;gap:6px}.ss-answer-feedback label{display:grid;gap:4px;color:var(--ink-2);font-weight:700}.ss-answer-feedback textarea{min-height:70px;border:1px solid var(--line-2);border-radius:8px;background:var(--card-2);color:var(--ink);padding:8px;font:inherit;font-size:12px}.ss-answer-feedback form button{justify-self:start;padding:6px 10px}.e-day-actions{display:flex;gap:4px;align-items:center}.e-day.all{border-color:var(--flame);color:var(--flame-deep)}.e-day.none{font-size:10px;white-space:nowrap;border-color:var(--line-2);color:var(--muted)}@media(max-width:600px){.ss-mascot-launch{left:auto;right:12px;top:11px}.ss-mascot-launch span{display:none}.ss-mascot-picker{left:10px;top:57px}}`;
  document.head.appendChild(style);
  const mascotGridStyle = document.createElement('style');
  mascotGridStyle.textContent = '.ss-mascot-options{grid-template-columns:repeat(3,1fr)}';
  document.head.appendChild(mascotGridStyle);
  const update = () => { addMascotControl(); decorate(); addAccuracyNote(); addFeedback(); repairGateControls(); };
  new MutationObserver(update).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', update);
  update();
})();
