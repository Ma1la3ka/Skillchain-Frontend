/* ═══════════════════════════════════════════════════
   SKILLCHAIN — Landing Page JS
═══════════════════════════════════════════════════ */

/**
 * Animate a number counter from 0 to target
 */
function animateCounter(el, end, prefix = '', duration = 1800) {
  if (!el || end === 0) return;
  const startTime = performance.now();

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = Math.floor(eased * end);
    el.textContent = prefix + current.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * Intersection Observer — trigger counters when stats bar enters viewport
 */
function initStatsCounter() {
  const statsBar = document.querySelector('.stats-bar');
  if (!statsBar) return;

  const workerEl = document.getElementById('stat-workers');
  const jobsEl   = document.getElementById('stat-jobs');
  const paidEl   = document.getElementById('stat-paid');

  const targets = { workers: 0, jobs: 0, paid: 0 };

  fetch('/api/stats')
    .then(r => r.json())
    .then(data => {
      targets.workers = data.workers || 0;
      targets.jobs    = data.jobs    || 0;
      targets.paid    = data.paid    || 0;
    })
    .catch(() => {})
    .finally(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          animateCounter(workerEl, targets.workers, '',  1600);
          animateCounter(jobsEl,   targets.jobs,    '',  1800);
          animateCounter(paidEl,   targets.paid,    '₦', 2000);
          observer.disconnect();
        });
      }, { threshold: 0.3 });

      observer.observe(statsBar);
    });
}

/**
 * Smooth scroll for nav anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/**
 * Scroll-reveal for feature cards and steps
 */
function initScrollReveal() {
  const items = document.querySelectorAll('.feature-card, .steps-ol__item');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      entry.target.style.animationDelay = `${i * 0.07}s`;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  items.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(16px)';
    item.style.transition = 'opacity 0.48s ease, transform 0.48s ease';
    observer.observe(item);
  });
}

/**
 * Mobile nav — dropdown (open/close)
 */
function initMobileNav() {
  const hamburger = document.getElementById('sc-hamburger');
  const navLinks  = document.getElementById('sc-nav-links');
  if (!hamburger || !navLinks) return;

  function closeMenu() {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close when any link inside is tapped
  navLinks.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('click', closeMenu);
  });

  // Close on outside tap
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      closeMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Inject is-revealed class
  const style = document.createElement('style');
  style.textContent = `.is-revealed { opacity: 1 !important; transform: translateY(0) !important; }`;
  document.head.appendChild(style);

  initMobileNav();
  initStatsCounter();
  initSmoothScroll();
  initScrollReveal();
});