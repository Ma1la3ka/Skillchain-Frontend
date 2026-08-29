/* ═══════════════════════════════════════════════════
   SKILLCHAIN — Landing Page Interactions
   Everything here is CSS transforms/opacity + IntersectionObserver.
   No canvas, no WebGL, no per-frame JS loop — cheap on any phone.
═══════════════════════════════════════════════════ */

function initNavScroll() {
  const nav = document.getElementById('sc-nav');
  if (!nav) return;
  const tick = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', tick, { passive: true });
  tick();
}

function initMobileNav() {
  const btn = document.getElementById('sc-hamburger');
  const links = document.getElementById('sc-nav-links');
  if (!btn || !links) return;

  const close = () => {
    btn.classList.remove('open');
    links.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });

  links.querySelectorAll('a, button').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !links.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const t = document.querySelector(href);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* the ticket stepper: as each step crosses the trigger line, mark
   everything above it "done" (stamped) and the current one "active" */
function initStepper() {
  const steps = document.querySelectorAll('.js-step');
  if (!steps.length) return;
  let deepest = -1;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const idx = [...steps].indexOf(entry.target);
      if (idx > deepest) deepest = idx;
      steps.forEach((s, i) => {
        s.classList.remove('is-active', 'is-done');
        if (i < deepest) s.classList.add('is-done');
        if (i === deepest) s.classList.add('is-active');
      });
    });
  }, { threshold: 0.6, rootMargin: '-70px 0px -100px 0px' });

  steps.forEach((s) => obs.observe(s));
}

function initRevealGroup(selector, parentSelector, delayStep) {
  const items = document.querySelectorAll(selector);
  if (!items.length) return;
  const obs = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      items.forEach((item, i) => setTimeout(() => item.classList.add('is-in'), i * delayStep));
      obs.disconnect();
    }
  }, { threshold: 0.1 });
  const parent = items[0].closest(parentSelector);
  obs.observe(parent || items[0]);
}

/* live receipts wall — cycles the highlighted row, pauses off-screen */
function initReceiptCycle() {
  const rows = document.querySelectorAll('.js-receipt');
  if (!rows.length) return;
  let current = 0;
  rows[0].classList.add('is-active');
  let interval = null;

  function advance() {
    rows[current].classList.remove('is-active');
    current = (current + 1) % rows.length;
    rows[current].classList.add('is-active');
  }

  const list = rows[0].closest('.receipt-list');
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      if (!interval) interval = setInterval(advance, 2500);
    } else if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }, { threshold: 0.35 });
  obs.observe(list);
}

function initContactModal() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  const openBtns = [document.getElementById('footer-contact')].filter(Boolean);
  if (!overlay || !closeBtn) return;

  function openModal(e) { e.preventDefault(); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeModal() { overlay.classList.remove('open'); document.body.style.overflow = ''; }

  openBtns.forEach((btn) => btn.addEventListener('click', openModal));
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const result = document.getElementById('result');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const name = form.querySelector('input[name="name"]').value;
    const message = form.querySelector('textarea[name="message"]').value;

    if (name.trim().length < 3) {
      result.textContent = 'Please enter your full name.';
      result.style.color = '#C1391F';
      return;
    }
    if (message.trim().length < 10) {
      result.textContent = 'Message is too short — please give more detail.';
      result.style.color = '#C1391F';
      return;
    }

    const formData = new FormData(form);
    const json = JSON.stringify(Object.fromEntries(formData));

    result.textContent = 'Sending…';
    result.style.color = '#857a63';
    submitBtn.disabled = true;

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: json
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 200) {
          result.textContent = 'Message sent successfully.';
          result.style.color = '#1E7145';
          form.reset();
        } else {
          result.textContent = data.message || 'Something went wrong.';
          result.style.color = '#C1391F';
        }
      })
      .catch(() => {
        result.textContent = 'Network error — please try again.';
        result.style.color = '#C1391F';
      })
      .finally(() => {
        submitBtn.disabled = false;
        setTimeout(() => { result.textContent = ''; }, 5000);
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initMobileNav();
  initSmoothScroll();
  initStepper();
  initRevealGroup('.js-engine', '.engines__grid', 90);
  initReceiptCycle();
  initContactModal();
});