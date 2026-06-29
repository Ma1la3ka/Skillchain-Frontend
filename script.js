/* ═══════════════════════════════════════════════════
   SKILLCHAIN — Landing Page JS
   Purposeful interactions only — no scattered effects
═══════════════════════════════════════════════════ */

/* ── Nav scroll shadow ── */
function initNavScroll() {
  const nav = document.getElementById('sc-nav');
  if (!nav) return;
  const tick = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', tick, { passive: true });
  tick();
}

/* ── Mobile nav ── */
function initMobileNav() {
  const btn   = document.getElementById('sc-hamburger');
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

  links.querySelectorAll('a, button').forEach(el => el.addEventListener('click', close));
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !links.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ── Hero artisan cards: staggered slide-in from right ── */
function initHeroCards() {
  const cards = document.querySelectorAll('.artisan-card');
  cards.forEach((card, i) => {
    setTimeout(() => card.classList.add('card-in'), 420 + i * 90);
  });
}

/* ── How-it-works: step activates when it enters viewport ──
   Uses IntersectionObserver to light up each step in sequence
   as the user scrolls through, like following the process.     */
function initHowSteps() {
  const steps = document.querySelectorAll('.js-howstep');
  if (!steps.length) return;

  // We track which is the current "deepest seen" step
  let deepest = -1;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = [...steps].indexOf(entry.target);
      if (idx > deepest) deepest = idx;

      // Mark all before as done, current as active
      steps.forEach((s, i) => {
        s.classList.remove('step-active', 'step-done');
        if (i < deepest) s.classList.add('step-done');
        if (i === deepest) s.classList.add('step-active');
      });
    });
  }, { threshold: 0.6, rootMargin: '-80px 0px -120px 0px' });

  steps.forEach(s => obs.observe(s));
}

/* ── Diff section items: stagger in when parent enters view ── */
function initDiffItems() {
  const items = document.querySelectorAll('.js-diffitem');
  if (!items.length) return;

  const obs = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      items.forEach((item, i) => {
        setTimeout(() => item.classList.add('item-in'), i * 100);
      });
      obs.disconnect();
    }
  }, { threshold: 0.15 });

  // Observe the parent grid
  const grid = items[0].closest('.diff-grid');
  if (grid) obs.observe(grid);
}

/* ── Talent cards: stagger in as grid enters view ── */
function initTalentCards() {
  const cards = document.querySelectorAll('.js-talentcard');
  if (!cards.length) return;

  const obs = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) {
      cards.forEach((card, i) => {
        setTimeout(() => card.classList.add('card-in'), i * 70);
      });
      obs.disconnect();
    }
  }, { threshold: 0.08 });

  const grid = cards[0].closest('.talent-grid');
  if (grid) obs.observe(grid);
}

/* ── Smooth anchor scrolling ── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/* ── Active artisan card: cycle highlight every 3s
   Gives the list a sense of a live, real-time feed    ── */
function initActiveCard() {
  const cards = document.querySelectorAll('.artisan-card');
  if (!cards.length) return;
  let current = 0;

  function advance() {
    cards[current].classList.remove('artisan-card--active');
    current = (current + 1) % cards.length;
    cards[current].classList.add('artisan-card--active');
  }
  
// ── Contact Modal ─────────────────────────────────────────────
const overlay = document.getElementById('modal-overlay');
const openBtns = [
    document.getElementById('open-contact'),
    document.getElementById('footer-contact')
];
const closeBtn = document.getElementById('modal-close');

function openModal() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}

openBtns.forEach(btn => btn && btn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
}));

closeBtn.addEventListener('click', closeModal);

overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});


const form = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = form.querySelector('input[name="name"]').value;
    const message = form.querySelector('textarea[name="message"]').value;

    if (name.length < 3) {
        result.textContent = "Please enter your full name.";
        result.style.color = "#ff4d4d";
        return;
    }

    if (message.length < 10) {
        result.textContent = "Message is too short. Please give more detail.";
        result.style.color = "#ff4d4d";
        return;
    }

    const formData = new FormData(form);
    const json = JSON.stringify(Object.fromEntries(formData));

    result.textContent = "Sending...";
    result.style.color = "#6366f1";
    submitBtn.disabled = true;

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: json
    })
    .then(async response => {
        const data = await response.json();
        if (response.status === 200) {
            result.textContent = "✓ Message sent successfully!";
            result.style.color = "#00DFD8";
            form.reset();
        } else {
            result.textContent = data.message || "Something went wrong.";
            result.style.color = "#ff4d4d";
        }
    })
    .catch(() => {
        result.textContent = "Network error. Please try again.";
        result.style.color = "#ff4d4d";
    })
    .finally(() => {
        submitBtn.disabled = false;
        setTimeout(() => { result.textContent = ""; }, 5000);
    });
});


  // Don't start until cards are in view
  const obs = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      const interval = setInterval(advance, 3000);
      // Clean up if list leaves view
      const cleanup = new IntersectionObserver((e) => {
        if (!e[0].isIntersecting) clearInterval(interval);
      });
      cleanup.observe(cards[0].closest('.artisan-list'));
      obs.disconnect();
    }
  }, { threshold: 0.5 });

  const list = cards[0].closest('.artisan-list');
  if (list) obs.observe(list);
}

document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initMobileNav();
  initHeroCards();
  initHowSteps();
  initDiffItems();
  initTalentCards();
  initSmoothScroll();
  initActiveCard();
});