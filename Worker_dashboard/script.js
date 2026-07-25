(function () {
  'use strict';

  const FLASK       = 'https://skillchain-backend-gce5.onrender.com';
  const LOGIN_PAGE  = '/Login/index.html';
  const SESSION_DUR = 30 * 60 * 1000;
  const HTML2CANVAS_URL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

  let allMyJobs   = [];
  let allOpenJobs = [];
  let activeFilter = 'all';
  let user = null;

  const sidebar      = document.getElementById('sidebar');
  const sidebarScrim = document.getElementById('sidebar-scrim');
  const burger       = document.getElementById('burger');
  const navItems     = document.querySelectorAll('.nav-item');
  const views        = document.querySelectorAll('.view');
  const filterBtns   = document.querySelectorAll('.filter-tab');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose   = document.getElementById('modal-close');
  const modalBody    = document.getElementById('modal-body');

  /* ══════════════════════════════════════════════
     ICON LIBRARY
  ══════════════════════════════════════════════ */
  const ICON = {
    check:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x:      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    clock:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pin:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.2" stroke="currentColor" stroke-width="2"/></svg>',
    user:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    box:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 7l8-4 8 4M4 7v10l8 4 8-4V7M4 7l8 4 8-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wallet: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M2 10h20" stroke="currentColor" stroke-width="1.8"/></svg>',
    alert:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
    download:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 4v11M7 11l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    shield: '<svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '★', starEmpty: '☆'
  };
  function ic(name) { return ICON[name] || ''; }

  const TRADE_ICON = {
    Mechanic:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 00-5.6 5.1L3 17.5V21h3.5l6.1-6.1a4 4 0 005.1-5.6l-2.6 2.6-2-2 2.6-2.6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Electrician:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Plumber:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4h6v6a4 4 0 004 4h2v6h-6v-6a4 4 0 00-4-4H6V4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Carpenter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 21l7-7M14 3l7 7-9 9-7-7 9-9z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Painter:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3c4 0 8 2 8 6 0 2-1.5 3-3 3h-2a2 2 0 000 4 2 2 0 010 4c-5 0-9-4-9-9a8 8 0 016-8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    Welder:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3s-3 3-3 6a3 3 0 006 0c0-1-1-2-1-3 1 1 3 2 3 4a5 5 0 01-10 0c0-4 5-7 5-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    Tailor:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.7"/><circle cx="7" cy="17" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M20 5L5 15M9 9l11 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    Mason:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="7" height="5" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="10" width="7" height="5" stroke="currentColor" stroke-width="1.6"/><rect x="8.5" y="5" width="7" height="5" stroke="currentColor" stroke-width="1.6"/></svg>',
    'HVAC Technician':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M4.2 6.5l15.6 11M19.8 6.5L4.2 17.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    Other:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/></svg>'
  };
  function tradeIcon(trade) { return TRADE_ICON[trade] || TRADE_ICON.Other; }

  /* ══════════════════════════════════════════════
     THEME
  ══════════════════════════════════════════════ */
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel  = document.getElementById('theme-toggle-label');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sc-theme', theme);
    if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  themeToggle?.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  function swalTheme() {
    const s = getComputedStyle(document.documentElement);
    return { background: s.getPropertyValue('--surface').trim(), color: s.getPropertyValue('--text').trim() };
  }

  /* ══════════════════════════════════════════════
     AUTH / NAVIGATION
  ══════════════════════════════════════════════ */
  window.addEventListener('pageshow', () => {
    const stored = localStorage.getItem('userData');
    if (!stored) { window.location.replace(LOGIN_PAGE); return; }
    const parsed = JSON.parse(stored);
    if (Date.now() - parsed.loginTime > SESSION_DUR) {
      localStorage.removeItem('userData');
      window.location.replace(LOGIN_PAGE);
    }
  });

  function showView(viewId) {
    views.forEach(v => v.classList.remove('is-active'));
    const el = document.getElementById(`view-${viewId}`);
    if (el) el.classList.add('is-active');
    navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === viewId));
    sidebar.classList.remove('is-open');
    sidebarScrim?.classList.remove('is-open');

    if (viewId === 'find-jobs') loadOpenJobs();
    if (viewId === 'my-jobs')   renderMyJobsList(allMyJobs);
    if (viewId === 'earnings')  renderEarnings();
    if (viewId === 'profile')   renderProfile();
  }

  navItems.forEach(item => item.addEventListener('click', e => { e.preventDefault(); showView(item.dataset.view); }));
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]');
    if (t && !t.classList.contains('nav-item')) { e.preventDefault(); showView(t.dataset.view); }
  });
  burger?.addEventListener('click', () => { sidebar.classList.toggle('is-open'); sidebarScrim?.classList.toggle('is-open'); });
  sidebarScrim?.addEventListener('click', () => { sidebar.classList.remove('is-open'); sidebarScrim.classList.remove('is-open'); });

  document.getElementById('logout-btn')?.addEventListener('click', e => {
    e.preventDefault();
    Swal.fire({
      title: 'Log out?', text: 'You will need to log back in.',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#E85C00', cancelButtonColor: '#9A968E',
      confirmButtonText: 'Log out', cancelButtonText: 'Stay signed in', ...swalTheme()
    }).then(r => {
      if (r.isConfirmed) {
        localStorage.removeItem('userData');
        fetch(`${FLASK}/logout-api`, { method: 'POST', credentials: 'include' }).finally(() => window.location.replace(LOGIN_PAGE));
      }
    });
  });

  /* ══════════════════════════════════════════════
     LOAD USER / PROFILE / JOBS
  ══════════════════════════════════════════════ */
  function loadUser() {
    const stored = localStorage.getItem('userData');
    if (!stored) { window.location.replace(LOGIN_PAGE); return false; }
    user = JSON.parse(stored);
    if (Date.now() - user.loginTime > SESSION_DUR) {
      localStorage.removeItem('userData');
      window.location.replace(LOGIN_PAGE);
      return false;
    }
    user.loginTime = Date.now();
    localStorage.setItem('userData', JSON.stringify(user));

    const initial = user.name ? user.name[0].toUpperCase() : 'W';
    const hr = new Date().getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('welcome-name').textContent = `${greeting}, ${user.name.split(' ')[0]}`;
    document.getElementById('overview-date').textContent = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    document.getElementById('nav-name').textContent      = user.name;
    document.getElementById('nav-avatar').textContent    = initial;
    document.getElementById('topbar-avatar').textContent = initial;
    return true;
  }

  // BUG FIX: previously loadProfile() called renderStats() before allMyJobs
  // had loaded, causing the Overview stats to briefly show wrong numbers.
  // Stats are now only rendered once both profile and jobs have resolved.
  async function loadProfile() {
    try {
      const res = await fetch(`${FLASK}/api/worker/profile?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      user.profile = data;
      renderTrustCard(data.trust_score, data.jobs_completed);
      renderWalletCard(data);
    } catch (e) {
      console.error('loadProfile:', e);
      renderTrustCard(user.trust_score || 0, user.jobs_completed || 0);
    }
  }

  async function loadMyJobs() {
    try {
      const res = await fetch(`${FLASK}/api/worker/jobs?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const newJobs = data.jobs || [];
      const removedJobs = allMyJobs.filter(old => !newJobs.find(n => n.id === old.id));
      allMyJobs = newJobs;

      removedJobs.forEach(removed => {
        if (removed.status === 'pending_review') {
          Swal.fire({ title: 'Job removed', text: `The job "${removed.title}" was deleted by the client.`, icon: 'warning', confirmButtonColor: '#E85C00', timer: 5000, ...swalTheme() });
        }
      });

      renderRecentJobs(allMyJobs.slice(0, 5));
      renderMyJobsList(allMyJobs);
      if (user.profile) renderStats(user.profile);
    } catch (e) { console.error('loadMyJobs:', e); }
  }

  async function loadOpenJobs() {
    const query = (document.getElementById('job-search-text')?.value || '').trim();
    const trade = document.getElementById('job-search-trade')?.value || '';
    const list  = document.getElementById('open-jobs-list');
    list.innerHTML = `<div class="skeleton-list"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;

    try {
      const params = new URLSearchParams({ user_id: user.id });
      if (query) params.append('q', query);
      if (trade) params.append('trade', trade);
      const res  = await fetch(`${FLASK}/api/worker/open-jobs?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      allOpenJobs = data.jobs || [];
      renderOpenJobsList(allOpenJobs);
    } catch (e) {
      console.error('loadOpenJobs:', e);
      list.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('alert')}</div><p>Could not load jobs. Please try again.</p></div>`;
    }
  }
  document.getElementById('btn-search-jobs')?.addEventListener('click', loadOpenJobs);
  document.getElementById('job-search-text')?.addEventListener('keydown', e => { if (e.key === 'Enter') loadOpenJobs(); });
  document.getElementById('job-search-trade')?.addEventListener('change', loadOpenJobs);

  /* ══════════════════════════════════════════════
     STATUS BADGES / CARDS
  ══════════════════════════════════════════════ */
  function statusBadge(status) {
    const labels = { open: 'Open', pending_review: 'Awaiting Approval', assigned: 'Assigned', pending_verification: 'Pending', verified: 'Verified', paid: 'Paid', disputed: 'Disputed' };
    return `<span class="badge badge--${status}">${labels[status] || status}</span>`;
  }

  /* ══════════════════════════════════════════════
     TRUST CARD
  ══════════════════════════════════════════════ */
  const RING_CIRCUMFERENCE = 2 * Math.PI * 66; // r=66 to match the SVG

  function renderTrustCard(score, jobsDone) {
    score = parseFloat(score) || 0;
    const pct = Math.min(100, Math.round((score / 5) * 100));

    document.getElementById('trust-score-val').textContent = score.toFixed(1);
    document.getElementById('trust-verified-pill').innerHTML = `${ic('check')} ${jobsDone || 0} Verified Job${jobsDone === 1 ? '' : 's'}`;

    const filled = Math.round(score);
    document.getElementById('trust-stars').innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < filled ? 'is-filled' : ''}">${i < filled ? ICON.star : ICON.starEmpty}</span>`).join('');

    requestAnimationFrame(() => {
      const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * pct / 100);
      document.getElementById('trust-ring-circle').style.strokeDasharray = RING_CIRCUMFERENCE;
      document.getElementById('trust-ring-circle').style.strokeDashoffset = offset;
    });
  }

  /* ══════════════════════════════════════════════
     WALLET CARD
  ══════════════════════════════════════════════ */
  function renderWalletCard(profile) {
    const numEl    = document.getElementById('wallet-num');
    const bankEl   = document.getElementById('wallet-bank');
    const statusEl = document.getElementById('wallet-status');
    if (profile.squad_account_number) {
      numEl.textContent  = profile.squad_account_number;
      bankEl.textContent = profile.squad_bank_name || 'Squad Sandbox Bank';
      statusEl.style.display = 'flex';
    } else {
      numEl.textContent  = 'Wallet not linked yet';
      bankEl.textContent = 'Complete a verified job to activate your wallet';
      statusEl.style.display = 'none';
    }
  }

  /* ══════════════════════════════════════════════
     STATS + LIFECYCLE + SPARKLINE
  ══════════════════════════════════════════════ */
  function renderStats(profile) {
    profile = profile || {};
    const done   = allMyJobs.filter(j => ['verified', 'paid'].includes(j.status)).length;
    const active = allMyJobs.filter(j => ['assigned', 'pending_review', 'pending_verification'].includes(j.status)).length;

    const totalEarned = allMyJobs.filter(j => j.status === 'paid').reduce((s, j) => s + parseFloat(j.amount), 0);
    const withdrawn = parseFloat(profile.total_withdrawn || 0); // BUG FIX: guard against undefined profile
    const availableBalance = totalEarned - withdrawn;

    const pendingEscrow = allMyJobs.filter(j => ['assigned', 'pending_verification', 'verified'].includes(j.status)).reduce((s, j) => s + parseFloat(j.amount), 0);

    document.getElementById('stat-done').textContent   = profile.jobs_completed ?? done;
    document.getElementById('stat-active').textContent = active;

    const balEl  = document.getElementById('stat-earned');
    const hintEl = document.getElementById('stat-earned-hint');
    balEl.textContent = '₦' + availableBalance.toLocaleString();
    balEl.classList.toggle('earn-balance__val--neg', availableBalance < 0);
    hintEl.textContent = availableBalance < 0 ? 'Platform fee deduction pending' : 'Available for withdrawal';

    document.getElementById('stat-escrow').textContent = '₦' + pendingEscrow.toLocaleString();

    // Subtitle on the Overview header
    const sub = document.getElementById('welcome-sub');
    if (sub) {
      const trustMsg = (profile.jobs_completed || 0) === 0 ? 'Your trust score is building up.' : 'Keep up the great work.';
      sub.innerHTML = active > 0
        ? `You have <strong>${active}</strong> active job${active === 1 ? '' : 's'} awaiting completion. ${trustMsg}`
        : `No active jobs right now. ${trustMsg}`;
    }

    const badge = document.getElementById('active-badge');
    if (badge) { badge.textContent = active > 0 ? active : ''; badge.classList.toggle('is-visible', active > 0); }
    const pill = document.getElementById('active-pill');
    if (pill) {
      if (active > 0) { pill.style.display = 'inline-flex'; pill.innerHTML = `${ic('clock')} ${active} Active Assignment${active === 1 ? '' : 's'}`; }
      else pill.style.display = 'none';
    }

    renderLifecycle();
    renderSparkline();
  }

  const LIFECYCLE_LABELS = ['Assigned', 'In Progress', 'Review', 'Done'];
  function renderLifecycle() {
    // Reflect the most-advanced non-final job among the worker's active jobs.
    let step = 0;
    if (allMyJobs.some(j => j.status === 'pending_verification')) step = 2;
    else if (allMyJobs.some(j => j.status === 'assigned')) step = 1;
    else if (allMyJobs.some(j => ['verified', 'paid'].includes(j.status))) step = 3;

    const el = document.getElementById('lifecycle-row');
    if (!el) return;
    el.innerHTML = LIFECYCLE_LABELS.map((label, i) => {
      const cls = i < step ? 'lifecycle-step--done' : i === step ? 'lifecycle-step--active' : '';
      const content = i < step ? ic('check') : (i + 1);
      const connector = i < LIFECYCLE_LABELS.length - 1 ? `<div class="lifecycle-connector ${i < step ? 'is-done' : ''}"></div>` : '';
      return `<div class="lifecycle-step ${cls}"><div class="lifecycle-dot">${content}</div><span class="lifecycle-step__label">${label}</span></div>${connector}`;
    }).join('');
  }

  function renderSparkline() {
    const el = document.getElementById('sparkline-bars');
    if (!el) return;
    const weeks = 12;
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const buckets = Array(weeks).fill(0);

    allMyJobs.filter(j => j.status === 'paid').forEach(j => {
      const t = new Date(j.paid_at || j.created_at).getTime();
      const weeksAgo = Math.floor((now - t) / weekMs);
      if (weeksAgo >= 0 && weeksAgo < weeks) buckets[weeks - 1 - weeksAgo] += Number(j.amount || 0);
    });

    const max = Math.max(...buckets, 1);
    el.innerHTML = buckets.map((v, i) => {
      const h = Math.max(3, Math.round((v / max) * 44));
      const isCurrent = i === weeks - 1;
      return `<div class="sparkline__bar ${isCurrent ? 'is-current' : ''}" style="height:${h}px" title="₦${v.toLocaleString()}"></div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     JOB CARDS
  ══════════════════════════════════════════════ */
  function myJobCardHTML(job) {
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    let rightBtn = '';
    if (job.status === 'assigned') {
      rightBtn = `<button class="complete-btn" data-job-id="${job.id}">Complete <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    } else if (job.status === 'pending_review') {
      rightBtn = `<span class="awaiting-tag">${ic('clock')} Awaiting Approval</span>`;
    } else if (job.status === 'verified') {
      rightBtn = `<span class="awaiting-tag">${ic('clock')} Awaiting Client Review</span>`;
    }
    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-card__icon">${tradeIcon(job.trade)}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">
            ${statusBadge(job.status)}
            <span>${ic('pin')} ${job.site_address || '—'}</span>
            <span>${date}</span>
          </div>
        </div>
        <div class="job-card__right">
          <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
          <span class="job-card__amount-hint">Fixed Rate</span>
          ${rightBtn}
        </div>
      </div>`;
  }

  function renderRecentJobs(jobs) {
    const el = document.getElementById('recent-jobs-list');
    const empty = document.getElementById('recent-empty');
    if (!jobs.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    el.innerHTML = jobs.map(myJobCardHTML).join('');
    attachMyJobListeners(el);
  }

  function renderMyJobsList(jobs) {
    const filtered = activeFilter === 'all' ? jobs : jobs.filter(j => j.status === activeFilter);
    const el = document.getElementById('my-jobs-list');
    el.innerHTML = filtered.length ? filtered.map(myJobCardHTML).join('')
      : `<div class="empty-state"><div class="icon-sq">${ic('box')}</div><p>No ${activeFilter === 'all' ? '' : activeFilter} jobs.</p></div>`;
    if (filtered.length) attachMyJobListeners(el);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      renderMyJobsList(allMyJobs);
    });
  });

  function attachMyJobListeners(container) {
    container.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.complete-btn')) return;
        const job = allMyJobs.find(j => j.id === parseInt(card.dataset.jobId));
        if (job) openMyJobModal(job);
      });
    });
    container.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const job = allMyJobs.find(j => j.id === parseInt(btn.dataset.jobId));
        if (job) openMyJobModal(job);
      });
    });
  }

  function renderOpenJobsList(jobs) {
    const el = document.getElementById('open-jobs-list');
    if (!jobs.length) { el.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('search')}</div><p>No open jobs match your search.</p></div>`; return; }
    el.innerHTML = jobs.map(openJobCardHTML).join('');
    attachOpenJobListeners(el);
  }

  function openJobCardHTML(job) {
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    return `
      <div class="job-card job-card--open" data-job-id="${job.id}">
        <div class="job-card__icon">${tradeIcon(job.trade)}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">
            <span>${job.trade || 'General'}</span>
            <span>${ic('pin')} ${job.site_address || '—'}</span>
            <span>${date}</span>
            ${job.client_name ? `<span>${ic('user')} ${job.client_name}</span>` : ''}
          </div>
        </div>
        <div class="job-card__right">
          <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
          <button class="accept-btn" data-job-id="${job.id}">View & Accept</button>
        </div>
      </div>`;
  }

  function attachOpenJobListeners(container) {
    container.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const job = allOpenJobs.find(j => j.id === parseInt(btn.dataset.jobId));
        if (job) openAcceptModal(job);
      });
    });
  }

  /* ══════════════════════════════════════════════
     ACCEPT / BARGAIN MODAL
  ══════════════════════════════════════════════ */
  function openAcceptModal(job) {
    modalBody.innerHTML = `
      <p class="modal-title">${job.title}</p>
      <p class="modal-amount">₦${Number(job.amount).toLocaleString()}</p>
      ${statusBadge('open')}
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">${ic('pin')} ${job.site_address || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade || '—'}</p></div>
      ${job.client_name ? `<div class="modal-field"><p class="modal-field__label">Posted By</p><p class="modal-field__val">${ic('user')} ${job.client_name}</p></div>` : ''}
      <div class="modal-divider"></div>

      <button class="btn btn--primary btn--wide" id="confirm-accept-btn">Accept at ₦${Number(job.amount).toLocaleString()}</button>

      <div class="bargain-box">
        <p class="bargain-box__label">Counter-Offer</p>
        <input type="number" id="bargain-price-input" placeholder="Your price, e.g. 12000" min="100" step="100">
        <textarea id="bargain-message-input" placeholder="Optional message to client…"></textarea>
        <button class="btn btn--secondary btn--wide" id="submit-bargain-btn">Send Counter-Offer</button>
        <p class="bargain-box__err" id="bargain-err"></p>
      </div>
    `;
    modalOverlay.classList.add('is-open');

    const acceptBtn = document.getElementById('confirm-accept-btn');
    const acceptBtnOriginal = acceptBtn.textContent;
    acceptBtn.addEventListener('click', () => acceptJob(job.id, acceptBtn, acceptBtnOriginal));

    const submitBtn = document.getElementById('submit-bargain-btn');
    const submitBtnOriginal = submitBtn.textContent;
    submitBtn.addEventListener('click', async () => {
      const priceInput = document.getElementById('bargain-price-input');
      const msgInput   = document.getElementById('bargain-message-input');
      const errEl      = document.getElementById('bargain-err');
      const price      = parseFloat(priceInput.value);

      errEl.textContent = '';
      if (!price || price < 100) { errEl.textContent = 'Enter a valid price (min ₦100).'; return; }

      submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
      try {
        const res  = await fetch(`${FLASK}/api/worker/bargain`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ job_id: job.id, user_id: user.id, proposed_price: price, message: msgInput.value.trim() })
        });
        const data = await res.json();
        if (data.success) {
          modalOverlay.classList.remove('is-open');
          Swal.fire({ title: 'Offer sent', text: `Your counter-offer of ₦${price.toLocaleString()} has been sent to the client.`, icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
        } else {
          errEl.textContent = data.message || 'Could not send offer.';
          submitBtn.disabled = false; submitBtn.textContent = submitBtnOriginal;
        }
      } catch (err) {
        errEl.textContent = 'Network error. Please try again.';
        submitBtn.disabled = false; submitBtn.textContent = submitBtnOriginal;
      }
    });
  }

  async function acceptJob(jobId, btn, originalText) {
    if (btn) { btn.disabled = true; btn.textContent = 'Accepting…'; }
    try {
      const res  = await fetch(`${FLASK}/api/worker/accept-job`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ job_id: jobId, user_id: user.id })
      });
      const data = await res.json();
      if (data.success) {
        modalOverlay.classList.remove('is-open');
        await loadMyJobs();
        await loadOpenJobs();
        Swal.fire({ title: 'Job accepted', text: 'Your application has been sent. Wait for the client to approve you.', icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
      } else {
        Swal.fire({ title: 'Error', text: data.message || 'Could not accept job.', icon: 'error', ...swalTheme() });
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      }
    } catch (err) {
      console.error('acceptJob:', err);
      Swal.fire({ title: 'Network error', text: 'Could not reach the server.', icon: 'error', ...swalTheme() });
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  }

  /* ══════════════════════════════════════════════
     MY JOB DETAIL MODAL
  ══════════════════════════════════════════════ */
  function openMyJobModal(job) {
    const created  = new Date(job.created_at).toLocaleString('en-NG');
    const verified = job.verified_at ? new Date(job.verified_at).toLocaleString('en-NG') : '—';

    let actionBtn = '';
    if (job.status === 'assigned') {
      actionBtn = `<button class="btn btn--primary btn--wide" id="modal-complete-btn" data-job-id="${job.id}">${ic('pin')} Submit Proof of Presence</button>`;
    } else if (job.status === 'pending_review') {
      actionBtn = `<div class="notice notice--warning"><p class="notice__title">${ic('clock')} Awaiting Client Approval</p><p>The client will assign or decline your application.</p></div>`;
    } else if (job.status === 'verified') {
      const deadline = job.review_deadline ? new Date(job.review_deadline).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
      actionBtn = `<div class="notice notice--warning"><p class="notice__title">${ic('clock')} Awaiting Client Review</p><p>You've submitted proof of completion. The client is reviewing it before releasing payment.${deadline ? ` If they don't respond, payment auto-releases by <strong>${deadline}</strong>.` : ''}</p></div>`;
    }

    modalBody.innerHTML = `
      <p class="modal-title">${job.title}</p>
      <p class="modal-amount">₦${Number(job.amount).toLocaleString()}</p>
      ${statusBadge(job.status)}
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">${ic('pin')} ${job.site_address || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade || '—'}</p></div>
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Accepted</p><p class="modal-field__val">${created}</p></div>
      <div class="modal-field"><p class="modal-field__label">Verified At</p><p class="modal-field__val">${verified}</p></div>
      ${job.distance_meters != null ? `<div class="modal-field"><p class="modal-field__label">GPS Distance</p><p class="modal-field__val">${Number(job.distance_meters).toFixed(0)}m from site</p></div>` : ''}
      ${job.transfer_reference ? `<div class="modal-field"><p class="modal-field__label">Transfer Ref</p><p class="modal-field__val" style="font-family:var(--font-mono);font-size:.8rem">${job.transfer_reference}</p></div>` : ''}
      ${actionBtn ? `<div class="modal-actions">${actionBtn}</div>` : ''}
    `;
    modalOverlay.classList.add('is-open');

    document.getElementById('modal-complete-btn')?.addEventListener('click', () => {
      const jobId = document.getElementById('modal-complete-btn').dataset.jobId;
      window.location.href = `/Complete_job/index.html?job_id=${jobId}`;
    });
  }

  modalClose?.addEventListener('click', e => { e.stopPropagation(); modalOverlay.classList.remove('is-open'); });
  modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  /* ══════════════════════════════════════════════
     EARNINGS / PROFILE
  ══════════════════════════════════════════════ */
  function renderEarnings() {
    const paid    = allMyJobs.filter(j => j.status === 'paid');
    const pending = allMyJobs.filter(j => ['assigned', 'pending_verification', 'verified'].includes(j.status));
    const pendAmt = pending.reduce((s, j) => s + parseFloat(j.amount), 0);
    const totalEarned = paid.reduce((s, j) => s + parseFloat(j.amount), 0);
    const withdrawn = parseFloat((user.profile || {}).total_withdrawn || 0); // BUG FIX: guard undefined profile
    const availableBalance = totalEarned - withdrawn;

    document.getElementById('earn-total').textContent   = '₦' + availableBalance.toLocaleString();
    document.getElementById('earn-count').textContent   = paid.length;
    document.getElementById('earn-pending').textContent = '₦' + pendAmt.toLocaleString();

    const list = document.getElementById('earnings-list');
    list.innerHTML = paid.length ? paid.map(job => {
      const date = new Date(job.paid_at || job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
      return `<div class="payment-row">
        <div class="payment-row__icon">${ic('wallet')}</div>
        <div class="payment-row__info"><p class="payment-row__title">${job.title}</p><p class="payment-row__date">${date} · ${job.transfer_reference || 'No ref'}</p></div>
        <span class="payment-row__amount">₦${Number(job.amount).toLocaleString()}</span>
      </div>`;
    }).join('') : `<div class="empty-state"><div class="icon-sq">${ic('wallet')}</div><p>No earnings yet. Complete verified jobs to get paid.</p></div>`;
  }

  function renderProfile() {
    const p       = user.profile || {};
    const name    = p.name  || user.name  || '—';
    const trade   = p.trade || user.trade || '—';
    const email   = p.email || user.email || '—';
    const phone   = p.phone || '';
    const bio     = p.bio   || '';
    const score   = parseFloat(p.trust_score || 0).toFixed(1);
    const initial = name[0]?.toUpperCase() || 'W';

    // Avatar — show uploaded photo if available, else initial
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarInitial = document.getElementById('profile-avatar-initial');
    const storedPhoto = localStorage.getItem(`sc-avatar-${user.id}`);
    if (storedPhoto) {
      avatarImg.style.backgroundImage = `url(${storedPhoto})`;
      avatarImg.style.backgroundSize  = 'cover';
      avatarImg.style.backgroundPosition = 'center';
      if (avatarInitial) avatarInitial.style.display = 'none';
    } else {
      avatarImg.style.backgroundImage = '';
      if (avatarInitial) { avatarInitial.textContent = initial; avatarInitial.style.display = ''; }
    }

    document.getElementById('profile-name').textContent  = name;
    document.getElementById('profile-trade').textContent = trade;
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-trust').textContent = score;

    // Phone
    const phoneEl = document.getElementById('profile-phone');
    if (phone) { phoneEl.textContent = '📞 ' + phone; phoneEl.style.display = ''; }
    else { phoneEl.style.display = 'none'; }

    // Bio
    const bioEl = document.getElementById('profile-bio');
    if (bio) { bioEl.textContent = bio; bioEl.style.display = ''; }
    else { bioEl.style.display = 'none'; }

    // Skills tags
    const skillsEl = document.getElementById('profile-skills');
    const skills = p.top_skills || [];
    skillsEl.innerHTML = skills.length
      ? skills.map(s => `<span class="profile-skill-tag">${s}</span>`).join('')
      : '';

    renderCertButton(p);

    // Balance display — compute available balance
    const totalEarned = allMyJobs.filter(j => j.status === 'paid').reduce((s, j) => s + parseFloat(j.amount || 0), 0);
    const withdrawn   = parseFloat(p.total_withdrawn || 0);
    const balance     = Math.max(0, totalEarned - withdrawn);
    const balEl = document.getElementById('profile-balance-val');
    if (balEl) balEl.textContent = balance.toLocaleString();

    // Saved bank details (if any)
    const walletBody = document.getElementById('profile-wallet-body');
    if (p.bank_account_no && p.bank_name) {
      walletBody.innerHTML = `
        <div class="wallet-detail">
          <div class="wallet-detail__icon">${ic('wallet')}</div>
          <div>
            <p class="wallet-detail__num">${p.bank_account_no}</p>
            <p class="wallet-detail__bank">${p.bank_name} · ${p.bank_account_name || ''}</p>
          </div>
          <span class="wallet-detail__status"><span class="wallet-dot" style="background:var(--success)"></span> Saved</span>
        </div>`;
    } else {
      walletBody.innerHTML = `
        <p style="font-size:.82rem;color:var(--text-3);padding:8px 0">
          No bank account saved yet. You'll be asked when you withdraw.
        </p>`;
    }

    // Verification stats
    const verLogs = p.verification_logs || [];
    const total   = verLogs.length;
    const passed  = verLogs.filter(v => v.result === 'pass').length;
    const failed  = total - passed;
    const rate    = total > 0 ? Math.round((passed / total) * 100) : 0;

    document.getElementById('vs-total').textContent = total;
    document.getElementById('vs-pass').textContent  = passed;
    document.getElementById('vs-fail').textContent  = failed;
    document.getElementById('vs-rate').textContent  = `${rate}%`;
  }

  /* ── Avatar upload / camera capture ── */
  window.triggerAvatarUpload = function() {
    document.getElementById('avatar-file-input')?.click();
  };

  window.handleAvatarUpload = async function(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately from local FileReader (instant UX)
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const avatarImg = document.getElementById('profile-avatar-img');
      const initial   = document.getElementById('profile-avatar-initial');
      avatarImg.style.backgroundImage    = `url(${dataUrl})`;
      avatarImg.style.backgroundSize     = 'cover';
      avatarImg.style.backgroundPosition = 'center';
      if (initial) initial.style.display = 'none';
      // Cache locally as fallback
      localStorage.setItem(`sc-avatar-${user.id}`, dataUrl);
    };
    reader.readAsDataURL(file);

    // Upload to server — store properly in DB
    try {
      const fd = new FormData();
      fd.append('user_id', user.id);
      fd.append('photo',   file, file.name || 'avatar.jpg');

      const res  = await fetch(`${FLASK}/api/worker/upload-avatar`, {
        method: 'POST', body: fd, credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        // Store server path in profile so cert + other views can use it
        user.profile = user.profile || {};
        user.profile.profile_photo = data.path;
        Swal.fire({ title: 'Photo saved!', icon: 'success', timer: 1400, showConfirmButton: false, ...swalTheme() });
      } else {
        Swal.fire({ title: 'Upload failed', text: data.message, icon: 'error', confirmButtonColor: '#E85C00', ...swalTheme() });
      }
    } catch {
      // Server unreachable — localStorage preview still shows, warn user
      Swal.fire({
        title: 'Saved locally only',
        text: 'Could not reach the server. Photo will show on this device but won\'t sync to other devices.',
        icon: 'warning', confirmButtonColor: '#E85C00', ...swalTheme()
      });
    }
  };

  /* ── Edit Profile modal ── */
  window.openEditProfileModal = async function() {
    const p = user.profile || {};
    const { value: formValues } = await Swal.fire({
      title: 'Edit Profile',
      html: `
        <input id="ep-phone" class="wd-field" placeholder="Phone number (e.g. 08012345678)" value="${p.phone || ''}">
        <textarea id="ep-bio" class="wd-field" rows="3" placeholder="Short bio — what you do, your experience…" style="resize:vertical">${p.bio || ''}</textarea>
        <input id="ep-skills" class="wd-field" placeholder="Skills (comma-separated, e.g. Wiring, Solar, Inverter)" value="${(p.top_skills || []).join(', ')}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#E85C00',
      cancelButtonColor: '#9A968E',
      ...swalTheme(),
      preConfirm: () => ({
        phone:      document.getElementById('ep-phone').value.trim(),
        bio:        document.getElementById('ep-bio').value.trim(),
        top_skills: document.getElementById('ep-skills').value.split(',').map(s => s.trim()).filter(Boolean)
      })
    });

    if (!formValues) return;

    try {
      const res = await fetch(`${FLASK}/api/worker/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: user.id, ...formValues })
      });
      const data = await res.json();
      if (data.success) {
        // Merge into local profile
        user.profile = { ...(user.profile || {}), ...formValues };
        renderProfile();
        Swal.fire({ title: 'Profile updated', icon: 'success', timer: 1500, showConfirmButton: false, ...swalTheme() });
      } else {
        Swal.fire({ title: 'Update failed', text: data.message, icon: 'error', confirmButtonColor: '#E85C00', ...swalTheme() });
      }
    } catch {
      // If the endpoint doesn't exist yet, save locally and still update UI
      user.profile = { ...(user.profile || {}), ...formValues };
      renderProfile();
      Swal.fire({ title: 'Saved locally', text: 'Changes saved. Will sync when server endpoint is ready.', icon: 'info', timer: 2000, showConfirmButton: false, ...swalTheme() });
    }
  };

  window.openEditProfileModal = window.openEditProfileModal;

  /* ══════════════════════════════════════════════
     CERTIFICATE — tier logic + downloadable document
  ══════════════════════════════════════════════ */
  function getCertTier(jobsDone, avgRating) {
    const score = (jobsDone || 0) + ((avgRating || 0) * 4);
    if (score >= 40) return 'gold';
    if (score >= 15) return 'silver';
    return 'bronze';
  }
  const TIER_LABEL = { bronze: 'Bronze Certified', silver: 'Silver Certified', gold: 'Gold Verified' };
  function certVerificationId(workerId) {
    return `SC-${String(workerId || 0).padStart(5, '0')}-${(Date.now() % 1000000).toString(36).toUpperCase()}`;
  }

  function makeQRSVG(text, size = 60) {
    const cells = 9, cell = Math.floor(size / cells);
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    let squares = '';
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const on = ((hash >> ((r * cells + c) % 30)) & 1) || (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
        if (on) squares += `<rect x="${c * cell}" y="${r * cell}" width="${cell - 1}" height="${cell - 1}" rx="1"/>`;
      }
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${squares}</svg>`;
  }

  // Tier color palettes — each cert looks visually distinct
  const TIER_PALETTE = {
    bronze: {
      bg:      'linear-gradient(145deg, #2C1A08 0%, #1A0F05 100%)',
      accent:  '#D4822A',
      accent2: '#F0A84A',
      badge:   'linear-gradient(135deg,#C97B28,#E8A050)',
      border:  'rgba(212,130,42,.4)',
      inner:   'rgba(212,130,42,.12)',
      label:   '#F5C98A',
      sub:     'rgba(245,201,138,.6)',
      metric:  'rgba(212,130,42,.15)',
      skill:   'rgba(212,130,42,.18)',
    },
    silver: {
      bg:      'linear-gradient(145deg, #141820 0%, #0D1118 100%)',
      accent:  '#8CA0BE',
      accent2: '#B0C4DE',
      badge:   'linear-gradient(135deg,#6B80A0,#9AAFC8)',
      border:  'rgba(140,160,190,.4)',
      inner:   'rgba(140,160,190,.1)',
      label:   '#C8D8EE',
      sub:     'rgba(200,216,238,.6)',
      metric:  'rgba(140,160,190,.15)',
      skill:   'rgba(140,160,190,.18)',
    },
    gold: {
      bg:      'linear-gradient(145deg, #1E1500 0%, #120D00 100%)',
      accent:  '#D4AF37',
      accent2: '#F0D060',
      badge:   'linear-gradient(135deg,#C9A227,#EDD050)',
      border:  'rgba(212,175,55,.5)',
      inner:   'rgba(212,175,55,.14)',
      label:   '#F5E090',
      sub:     'rgba(245,224,144,.65)',
      metric:  'rgba(212,175,55,.18)',
      skill:   'rgba(212,175,55,.2)',
    }
  };

  function buildCertDocHTML(profile, tier, verId) {
    const name   = profile.name || 'Worker';
    const trade  = profile.trade || 'General';
    const jobs   = profile.jobs_completed || 0;
    const trust  = parseFloat(profile.trust_score || 0).toFixed(1);
    const filled = Math.round(profile.trust_score || 0);
    const stars  = Array.from({length:5},(_,i) => `<span style="color:${i<filled?p.accent2:'rgba(255,255,255,.2)'}">${i<filled?'★':'☆'}</span>`).join('');
    const skills = profile.top_skills?.length ? profile.top_skills : [trade, 'GPS Verified', 'Escrow Payments'];
    const issued = new Date().toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' });

    // Pull stored photo if available
    const storedPhoto = localStorage.getItem(`sc-avatar-${profile.id || user?.id}`);
    const avatarHTML  = storedPhoto
      ? `<div class="cert-photo" style="background-image:url(${storedPhoto})"></div>`
      : `<div class="cert-photo cert-photo--initial" style="background:${p.metric}">${name[0]?.toUpperCase()}</div>`;

    const p = TIER_PALETTE[tier];

    // Tier-specific header text
    const tierDesc = {
      bronze: 'Completing their first verified jobs on SkillChain.',
      silver: 'Consistently delivering GPS-verified, escrow-secured work.',
      gold:   'An elite verified artisan with an outstanding trust record.'
    }[tier];

    return `
      <div class="cert-doc cert-doc--${tier}" id="cert-doc-printable"
           style="background:${p.bg};border-color:${p.border}">
        <!-- Decorative corner marks -->
        <div class="cert-corner cert-corner--tl" style="border-color:${p.accent}"></div>
        <div class="cert-corner cert-corner--tr" style="border-color:${p.accent}"></div>
        <div class="cert-corner cert-corner--bl" style="border-color:${p.accent}"></div>
        <div class="cert-corner cert-corner--br" style="border-color:${p.accent}"></div>

        <!-- Header -->
        <div class="cert-header">
          <div class="cert-header__left">
            <div class="cert-tier-badge" style="background:${p.badge}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${TIER_LABEL[tier].toUpperCase()}
            </div>
            <p class="cert-eyebrow" style="color:${p.sub}">SkillChain Artisan Certificate</p>
            <p class="cert-platform" style="color:${p.accent}">skillchain.app</p>
          </div>
          ${avatarHTML}
        </div>

        <!-- Name + trade -->
        <div class="cert-identity" style="border-bottom:1px solid ${p.inner}">
          <p class="cert-name" style="color:${p.label}">${name}</p>
          <p class="cert-trade" style="color:${p.accent2}">${trade}</p>
          <p class="cert-desc" style="color:${p.sub}">${tierDesc}</p>
        </div>

        <!-- Metrics -->
        <div class="cert-metrics">
          <div class="cert-metric" style="background:${p.metric};border-color:${p.inner}">
            <div class="cert-metric__val" style="color:${p.accent2}">${jobs}</div>
            <div class="cert-metric__label" style="color:${p.sub}">Jobs Done</div>
          </div>
          <div class="cert-metric" style="background:${p.metric};border-color:${p.inner}">
            <div class="cert-metric__val" style="color:${p.accent2}">${trust}</div>
            <div class="cert-metric__label" style="color:${p.sub}">Trust Score</div>
          </div>
          <div class="cert-metric" style="background:${p.metric};border-color:${p.inner}">
            <div class="cert-metric__val" style="font-size:1rem;letter-spacing:1px">${stars}</div>
            <div class="cert-metric__label" style="color:${p.sub}">Rating</div>
          </div>
        </div>

        <!-- Skills -->
        <div class="cert-skills">
          ${skills.map(s => `<span class="cert-skill" style="background:${p.skill};border-color:${p.inner};color:${p.label}">${s}</span>`).join('')}
        </div>

        <!-- Footer -->
        <div class="cert-footer" style="border-top:1px solid ${p.inner}">
          <div class="cert-footer__id" style="color:${p.sub}">
            <span style="font-size:.6rem;letter-spacing:.1em">CERTIFICATE ID</span><br>
            <strong style="color:${p.label};font-size:.76rem;font-family:var(--font-mono)">${verId}</strong><br>
            <span style="font-size:.64rem">Issued ${issued} · GPS-authenticated · Escrow-secured</span>
          </div>
          <div class="cert-qr" style="border-color:${p.inner}">
            <div style="color:${p.accent}">${makeQRSVG(verId, 54)}</div>
            <p style="font-size:.54rem;color:${p.sub};margin-top:4px;text-align:center">Scan to verify</p>
          </div>
        </div>
      </div>`;
  }

  function renderCertButton(profile) {
    const container = document.getElementById('profile-cert-area');
    if (!container || !profile) return;
    const jobs  = profile.jobs_completed || 0;
    const trust = parseFloat(profile.trust_score || 0);
    const tier  = getCertTier(jobs, trust);

    container.innerHTML = `
      <button class="cert-trigger-btn cert-trigger-btn--${tier}" onclick="openCertModal()">
        ${ic('shield').replace('width="46" height="46"', 'width="16" height="16"')} View My ${TIER_LABEL[tier].replace(' Certified', '').replace(' Verified', '')} Certificate
      </button>`;

    window._certProfile = profile;
    window._certTier    = tier;
    window._certVerId   = certVerificationId(profile.id || user.id);
  }

  function openCertModal() {
    let overlay = document.getElementById('cert-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cert-modal-overlay';
      overlay.className = 'cert-overlay';
      overlay.innerHTML = `
        <div class="cert-sheet" id="cert-sheet">
          <button class="cert-close" onclick="closeCertModal()">${ic('x')}</button>
          <div class="cert-sheet__body" id="cert-content"></div>
          <div class="cert-actions">
            <button class="btn btn--secondary" onclick="closeCertModal()">Close</button>
            <button class="btn btn--primary" id="cert-download-btn" onclick="downloadCertificate()">${ic('download')} Download Certificate</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeCertModal(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCertModal(); });
    }

    const profile = window._certProfile || {};
    const tier    = window._certTier    || 'bronze';
    const verId   = window._certVerId   || certVerificationId(user.id);

    document.getElementById('cert-content').innerHTML = buildCertDocHTML(profile, tier, verId);
    overlay.classList.add('is-open');
  }

  function closeCertModal() { document.getElementById('cert-modal-overlay')?.classList.remove('is-open'); }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function downloadCertificate() {
    const btn = document.getElementById('cert-download-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner spinner--dark"></span> Preparing…`;

    try {
      if (!window.html2canvas) await loadScriptOnce(HTML2CANVAS_URL);
      const node = document.getElementById('cert-doc-printable');
      const canvas = await window.html2canvas(node, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff',
        scale: 2, useCORS: true
      });
      const link = document.createElement('a');
      link.download = `SkillChain-Certificate-${window._certVerId || 'worker'}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error('downloadCertificate:', e);
      Swal.fire({ title: 'Could not generate download', text: 'Please try again in a moment.', icon: 'error', ...swalTheme() });
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  window.openWithdrawModal   = openWithdrawModal;
  window.openCertModal       = openCertModal;
  window.closeCertModal      = closeCertModal;
  window.downloadCertificate = downloadCertificate;

  /* ══════════════════════════════════════════════
     WITHDRAW TO BANK
  ══════════════════════════════════════════════ */
  async function openWithdrawModal() {
    Swal.fire({ title: 'Loading banks…', allowOutsideClick: false, ...swalTheme(), didOpen: () => Swal.showLoading() });

    try {
      const [profileRes, banksRes] = await Promise.all([
        fetch(`${FLASK}/api/worker/profile?user_id=${user.id}`, { credentials: 'include' }),
        fetch(`${FLASK}/api/banks`, { credentials: 'include' })
      ]);
      const profileData = await profileRes.json();
      const banksData = await banksRes.json();
      const profile = profileData.profile || profileData || {};
      const banks = banksData.banks || [];

      Swal.close();

      if (!banks.length) {
        Swal.fire({ title: 'Bank list unavailable', text: 'Could not load banks. Please try again.', icon: 'warning', confirmButtonColor: '#E85C00', ...swalTheme() });
        return;
      }

      const hasSavedDetails = profile.bank_account_no && profile.bank_code;
      const bankOptionsHTML = banks.map(b => `<option value="${b.code}" ${profile.bank_code === b.code ? 'selected' : ''}>${b.name}</option>`).join('');

      await Swal.fire({
        title: 'Withdraw to Bank',
        html: `
          <p style="color:var(--text-2);font-size:.82rem;margin-bottom:14px;text-align:left">Funds will arrive in your bank account within 1–5 minutes.</p>
          <select id="wd-bank-code" class="wd-field">
            <option value="">Select your bank</option>
            ${bankOptionsHTML}
          </select>
          <input id="wd-account-no" maxlength="10" placeholder="Your 10-digit account number" value="${profile.bank_account_no || ''}" class="wd-field">
          <div id="wd-acct-name" class="wd-acct-name"></div>
          <input type="number" id="wd-amount" min="100" placeholder="Amount in ₦ (min ₦100)" class="wd-field">
        `,
        confirmButtonText: 'Withdraw Now', confirmButtonColor: '#E85C00',
        showCancelButton: true, cancelButtonText: 'Cancel', cancelButtonColor: '#9A968E',
        ...swalTheme(),
        didOpen: () => {
          let verifyTimeout = null;
          async function tryVerify() {
            const accountNo = document.getElementById('wd-account-no').value.trim();
            const bankCode  = document.getElementById('wd-bank-code').value;
            const nameEl    = document.getElementById('wd-acct-name');
            if (accountNo.length === 10 && bankCode) {
              nameEl.style.color = '#D97706';
              nameEl.textContent = 'Verifying account…';
              try {
                const res  = await fetch(`${FLASK}/api/verify-account?account_no=${accountNo}&bank_code=${bankCode}`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                  nameEl.style.color = '#16A34A';
                  nameEl.textContent = data.account_name;
                  nameEl.dataset.verified = 'true';
                  nameEl.dataset.accountName = data.account_name;
                } else {
                  nameEl.style.color = '#DC2626';
                  nameEl.textContent = data.message || 'Account not found';
                  nameEl.dataset.verified = 'false';
                  nameEl.dataset.accountName = '';
                }
              } catch {
                nameEl.style.color = '#DC2626';
                nameEl.textContent = 'Could not verify — check connection';
                nameEl.dataset.verified = 'false';
              }
            } else {
              nameEl.textContent = '';
              nameEl.dataset.verified = 'false';
            }
          }
          document.getElementById('wd-account-no').addEventListener('input', () => { clearTimeout(verifyTimeout); verifyTimeout = setTimeout(tryVerify, 700); });
          document.getElementById('wd-bank-code').addEventListener('change', () => { clearTimeout(verifyTimeout); verifyTimeout = setTimeout(tryVerify, 300); });
          if (hasSavedDetails) tryVerify();
        },
        preConfirm: () => {
          const amount    = document.getElementById('wd-amount')?.value;
          const bankCode  = document.getElementById('wd-bank-code')?.value;
          const accountNo = document.getElementById('wd-account-no')?.value?.trim();
          const nameEl    = document.getElementById('wd-acct-name');
          const acctName  = nameEl?.dataset.accountName || '';
          const bankSelect= document.getElementById('wd-bank-code');
          const bankName  = bankSelect?.options[bankSelect.selectedIndex]?.text || '';

          if (!bankCode) { Swal.showValidationMessage('Please select your bank'); return false; }
          if (!accountNo || accountNo.length !== 10) { Swal.showValidationMessage('Enter a valid 10-digit account number'); return false; }
          if (!amount || Number(amount) < 100) { Swal.showValidationMessage('Minimum withdrawal is ₦100'); return false; }
          return { amount, bankCode, accountNo, bankName, acctName };
        }
      }).then(async result => {
        if (!result.isConfirmed || !result.value) return;
        const { amount, bankCode, accountNo, bankName, acctName } = result.value;

        Swal.fire({ title: 'Processing…', text: 'Sending withdrawal request.', allowOutsideClick: false, ...swalTheme(), didOpen: () => Swal.showLoading() });

        try {
          const res = await fetch(`${FLASK}/api/worker/withdraw`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ user_id: user.id, amount: Number(amount), bank_code: bankCode, account_no: accountNo, bank_name: bankName, account_name: acctName })
          });
          const data = await res.json();
          Swal.fire({ title: data.success ? 'Withdrawal initiated' : 'Failed', text: data.message, icon: data.success ? 'success' : 'error', confirmButtonColor: '#E85C00', ...swalTheme() });

          if (data.success) {
            user.profile = user.profile || {};
            user.profile.total_withdrawn = (parseFloat(user.profile.total_withdrawn) || 0) + Number(amount);
            renderStats(user.profile);
            renderEarnings();
          }
        } catch (e) {
          Swal.fire({ title: 'Network error', text: 'Could not reach the server.', icon: 'error', confirmButtonColor: '#E85C00', ...swalTheme() });
        }
      });
    } catch (e) {
      Swal.close();
      console.error('openWithdrawModal:', e);
      Swal.fire({ title: 'Error', text: 'Something went wrong loading the form.', icon: 'error', ...swalTheme() });
    }
  }

  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */
  async function init() {
    const ok = loadUser();
    if (!ok) return;
    await Promise.all([loadProfile(), loadMyJobs()]);
    if (user.profile) renderStats(user.profile); // BUG FIX: ensure stats reflect fully-loaded profile + jobs

    setInterval(async () => {
      await loadMyJobs();
    }, 10_000);
  }
  init();

})();