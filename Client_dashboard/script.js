(function () {
  'use strict';

  const FLASK      = 'https://skillchain-backend-gce5.onrender.com';
  window.FLASK = FLASK;
  const RETRY_HOST = 'https://bullion-crushing-trickster.ngrok-free.dev';
  const LOGIN_PAGE = '/Login/index.html';
  const SESSION_DUR = 30 * 60 * 1000;

  let allJobs      = [];
  let activeFilter  = 'all';
  let user          = null;

  // ── Map state ──
  let map = null, marker = null, mapReady = false;
  let selectedLat = null, selectedLng = null;

  // ── Media state ──
  let mediaFiles = [];

  // ── DOM refs ──
  const sidebar            = document.getElementById('sidebar');
  const sidebarScrim       = document.getElementById('sidebar-scrim');
  const burger              = document.getElementById('burger');
  const navItems            = document.querySelectorAll('.nav-item');
  const views                = document.querySelectorAll('.view');
  const filterBtns           = document.querySelectorAll('.filter-tab');
  const modalOverlay        = document.getElementById('modal-overlay');
  const modalClose           = document.getElementById('modal-close');
  const modalBody             = document.getElementById('modal-body');
  const workerModalOverlay  = document.getElementById('worker-modal-overlay');
  const workerModalClose    = document.getElementById('worker-modal-close');
  const workerModalBody     = document.getElementById('worker-modal-body');

  /* ══════════════════════════════════════════════
     ICON LIBRARY — small stroke-based SVGs, replaces emoji
  ══════════════════════════════════════════════ */
  const ICON = {
    check:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x:          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    clock:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    alert:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
    shield:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    pin:        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.2" stroke="currentColor" stroke-width="2"/></svg>',
    user:       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    card:       '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M2 10h20" stroke="currentColor" stroke-width="2"/></svg>',
    refresh:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 15A8 8 0 0020 12M18.5 9A8 8 0 004 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    copy:       '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" stroke="currentColor" stroke-width="2"/></svg>',
    heart:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 20s-7-4.35-9.5-8.6C1 8.2 2.7 5 6 5c2 0 3.4 1.1 4 2.3.6-1.2 2-2.3 4-2.3 3.3 0 5 3.2 3.5 6.4C19 15.65 12 20 12 20z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    heartFill:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.35-9.5-8.6C1 8.2 2.7 5 6 5c2 0 3.4 1.1 4 2.3.6-1.2 2-2.3 4-2.3 3.3 0 5 3.2 3.5 6.4C19 15.65 12 20 12 20z"/></svg>',
    comment:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H8l-4 4V4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    box:        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 7l8-4 8 4M4 7v10l8 4 8-4V7M4 7l8 4 8-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash:      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search:     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    handshake:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M8 12h8M8 8h5M6 20l-3-3 3-3M18 4l3 3-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wallet:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M2 10h20" stroke="currentColor" stroke-width="1.8"/></svg>',
    star:       '★', starEmpty: '☆'
  };
  function ic(name){ return ICON[name] || ''; }

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
  function tradeIcon(trade){ return TRADE_ICON[trade] || TRADE_ICON.Other; }

  /* ══════════════════════════════════════════════
     THEME
  ══════════════════════════════════════════════ */
  const themeToggle      = document.getElementById('theme-toggle');
  const themeToggleLabel = document.getElementById('theme-toggle-label');

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sc-theme', theme);
    if (themeToggleLabel) themeToggleLabel.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

  themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  function swalTheme(){
    const styles = getComputedStyle(document.documentElement);
    return {
      background: styles.getPropertyValue('--surface').trim(),
      color:      styles.getPropertyValue('--text').trim()
    };
  }

  // ── Modal close handlers ──
  modalClose?.addEventListener('click', () => modalOverlay.classList.remove('is-open'));
  modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  workerModalClose?.addEventListener('click', () => workerModalOverlay.classList.remove('is-open'));
  workerModalOverlay?.addEventListener('click', e => { if (e.target === workerModalOverlay) workerModalOverlay.classList.remove('is-open'); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { modalOverlay?.classList.remove('is-open'); workerModalOverlay?.classList.remove('is-open'); }
  });

  // ── Retry payment account generation ──
  window.retryPaymentAccount = function (jobId) {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${ic('refresh')} Processing…`;

    fetch(`${RETRY_HOST}/api/client/retry-payment/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 200 || res.success === true) {
          if (res.data && res.data.checkout_url) {
            Swal.fire({ title: 'Redirecting to payment…', text: 'Checkout link generated.', icon: 'success', timer: 1800, showConfirmButton: false, ...swalTheme() })
              .then(() => { window.location.href = res.data.checkout_url; });
          } else {
            Swal.fire({ title: 'Account generated', text: 'Reloading dashboard…', icon: 'success', ...swalTheme() }).then(() => location.reload());
          }
        } else {
          Swal.fire({ title: 'Payment provider error', text: res.message || 'Check your bank details and try again.', icon: 'error', ...swalTheme() });
          btn.disabled = false; btn.innerHTML = originalText;
        }
      })
      .catch(() => {
        Swal.fire({ title: 'Network error', text: 'Could not reach the payment server.', icon: 'error', ...swalTheme() });
        btn.disabled = false; btn.innerHTML = originalText;
      });
  };

  // ── Auth guard ──
  window.addEventListener('pageshow', () => {
    const stored = localStorage.getItem('userData');
    if (!stored) { window.location.replace(LOGIN_PAGE); return; }
    const parsed = JSON.parse(stored);
    if (Date.now() - parsed.loginTime > SESSION_DUR) {
      localStorage.removeItem('userData');
      window.location.replace(LOGIN_PAGE);
    }
  });

  // ── Navigation ──
  function showView(viewId) {
    views.forEach(v => v.classList.remove('is-active'));
    const el = document.getElementById(`view-${viewId}`);
    if (el) el.classList.add('is-active');
    navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === viewId));
    sidebar.classList.remove('is-open');
    sidebarScrim?.classList.remove('is-open');

    if (viewId === 'post-job') {
      if (!mapReady) {
        requestAnimationFrame(() => requestAnimationFrame(initMap));
      } else {
        map.invalidateSize();
      }
    }

    if (viewId === 'my-jobs')      renderJobsList(allJobs);
    if (viewId === 'payments')     renderPayments();
    if (viewId === 'find-workers') searchWorkers();
    if (viewId === 'bargains')     loadBargains();
    if (viewId === 'profile')      renderClientProfile();
    if (viewId === 'messages') loadConversations();
  }

  navItems.forEach(item => item.addEventListener('click', e => { e.preventDefault(); showView(item.dataset.view); }));
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]');
    if (t && !t.classList.contains('nav-item')) { e.preventDefault(); showView(t.dataset.view); }
  });

  burger?.addEventListener('click', () => { sidebar.classList.toggle('is-open'); sidebarScrim?.classList.toggle('is-open'); });
  sidebarScrim?.addEventListener('click', () => { sidebar.classList.remove('is-open'); sidebarScrim.classList.remove('is-open'); });

  // ── Logout ──
  document.getElementById('logout-btn')?.addEventListener('click', e => {
    e.preventDefault();
    Swal.fire({
      title: 'Log out?', text: 'You will need to log back in.',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#E85C00', cancelButtonColor: '#9A968E',
      confirmButtonText: 'Log out', cancelButtonText: 'Stay signed in',
      ...swalTheme()
    }).then(r => {
      if (r.isConfirmed) {
        localStorage.removeItem('userData');
        fetch(`${FLASK}/logout-api`, { method: 'POST', credentials: 'include' }).finally(() => window.location.replace(LOGIN_PAGE));
      }
    });
  });

  // ── Load user ──
  function loadUser() {
    const stored = localStorage.getItem('userData');
    if (!stored) { window.location.replace(LOGIN_PAGE); return false; }
    user = JSON.parse(stored);
    window.USER_ID = user.id;
    if (Date.now() - user.loginTime > SESSION_DUR) {
      localStorage.removeItem('userData');
      window.location.replace(LOGIN_PAGE);
      return false;
    }
    user.loginTime = Date.now();
    localStorage.setItem('userData', JSON.stringify(user));
    window.USER_ID = user.id;

    const welcomeEl = document.getElementById('welcome-name');
    const dateEl    = document.getElementById('overview-date');
    const navNameEl = document.getElementById('nav-name');
    const navAvatar = document.getElementById('nav-avatar');
    const topAvatar = document.getElementById('topbar-avatar');

    const hr = new Date().getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    if (welcomeEl) welcomeEl.textContent = `${greeting}, ${user.name.split(' ')[0]}`;
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    if (navNameEl) navNameEl.textContent = user.name;
    if (navAvatar) navAvatar.textContent = user.name[0].toUpperCase();
    if (topAvatar) topAvatar.textContent = user.name[0].toUpperCase();
    return true;
  }

  // ── Load jobs ──
  async function loadJobs() {
    try {
      const res = await fetch(`${FLASK}/api/client/jobs?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      allJobs = data.jobs || [];
      renderStats(allJobs);
      renderRecentJobs(allJobs.slice(0, 5));
      renderTrackList(allJobs);
    } catch (e) { console.error('loadJobs:', e); }
  }

  function cancelPostJob() {
    document.getElementById('post-job-form').reset();
    clearLocation();
    mediaFiles = [];
    renderMediaPreviews();
    ['err-title', 'err-amount', 'err-address'].forEach(id => { document.getElementById(id).textContent = ''; });
    showView('overview');
  }
  document.getElementById('cancel-post-job')?.addEventListener('click', cancelPostJob);

  // ── Stats ──
  function renderStats(jobs) {
    document.getElementById('stat-total').textContent  = jobs.length;
    document.getElementById('stat-active').textContent = jobs.filter(j => ['open', 'assigned', 'pending_review', 'pending_verification'].includes(j.status)).length;
    document.getElementById('stat-done').textContent   = jobs.filter(j => ['verified', 'paid'].includes(j.status)).length;
    document.getElementById('stat-paid').textContent   = '₦' + jobs.filter(j => j.status === 'paid').reduce((s, j) => s + Number(j.amount || 0), 0).toLocaleString();
  }

  function statusBadge(status) {
    const labels = { open: 'Open', pending_review: 'Awaiting Approval', assigned: 'Assigned', pending_verification: 'Pending', verified: 'Verified', paid: 'Paid' };
    return `<span class="badge badge--${status}">${labels[status] || status}</span>`;
  }

  function jobCardHTML(job) {
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    const canDelete = job.status === 'open';
    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-card__icon">${tradeIcon(job.trade)}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">
            ${statusBadge(job.status)}
            <span>${ic('user')} ${job.worker_name || 'No worker yet'}</span>
            <span>${date}</span>
          </div>
        </div>
        <div class="job-card__right">
          <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
          ${canDelete ? `<button class="job-card__delete" data-job-id="${job.id}" title="Delete job">${ic('trash')} Delete</button>` : ''}
        </div>
      </div>`;
  }

  function renderRecentJobs(jobs) {
    const el = document.getElementById('recent-jobs-list');
    const empty = document.getElementById('recent-empty');
    if (!jobs.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    el.innerHTML = jobs.map(jobCardHTML).join('');
    attachJobCardListeners(el);
  }

  function renderJobsList(jobs) {
    const filtered = activeFilter === 'all' ? jobs
      : jobs.filter(j => activeFilter === 'verified' ? ['verified', 'paid'].includes(j.status) : j.status === activeFilter);
    const el = document.getElementById('all-jobs-list');
    el.innerHTML = filtered.length ? filtered.map(jobCardHTML).join('')
      : `<div class="empty-state"><div class="icon-sq">${ic('box')}</div><p>No ${activeFilter === 'all' ? '' : activeFilter} jobs found.</p></div>`;
    if (filtered.length) attachJobCardListeners(el);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.dataset.filter;
      renderJobsList(allJobs);
    });
  });

  function attachJobCardListeners(container) {
    container.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.job-card__delete')) return;
        const job = allJobs.find(j => j.id === parseInt(card.dataset.jobId));
        if (job) openJobModal(job);
      });
    });
    container.querySelectorAll('.job-card__delete').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteJob(parseInt(btn.dataset.jobId)); });
    });
  }

  /* ══════════════════════════════════════════════
     ACTIVE PROJECT TRACKING (stepper)
  ══════════════════════════════════════════════ */
  const STEP_LABELS = ['Job Posted', 'Assigned', 'In Progress', 'Completed'];
  const STATUS_STEP = { open: 0, pending_review: 1, assigned: 1, pending_verification: 2, verified: 3, paid: 3 };

  function stepperHTML(status) {
    const current = STATUS_STEP[status] ?? 0;
    return `<div class="stepper">${STEP_LABELS.map((label, i) => {
      const cls = i < current ? 'stepper__step--done' : i === current ? 'stepper__step--active' : '';
      const content = i < current ? ic('check') : (i + 1);
      const connector = i < STEP_LABELS.length - 1 ? `<div class="stepper__connector ${i < current ? 'is-done' : ''}"></div>` : '';
      return `<div class="stepper__step ${cls}"><div class="stepper__dot">${content}</div><span class="stepper__label">${label}</span></div>${connector}`;
    }).join('')}</div>`;
  }

  function trackCardHTML(job) {
    const timeAgo = relativeTime(job.created_at);
    return `
      <div class="track-card" data-job-id="${job.id}">
        <div class="track-card__head">
          <span class="track-card__id">J-${String(job.id).padStart(4, '0')}</span>
          <span class="track-card__title">${job.title}</span>
          ${job.trade ? `<span class="trade-tag">${job.trade}</span>` : ''}
        </div>
        ${stepperHTML(job.status)}
        <div class="track-card__foot">
          <span class="track-worker">
            ${job.worker_name
              ? `<span class="track-worker__avatar">${job.worker_name[0].toUpperCase()}</span> ${job.worker_name}`
              : `${ic('user')} No worker assigned yet`}
          </span>
          <span class="track-card__time">${timeAgo}</span>
        </div>
      </div>`;
  }

  function relativeTime(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function renderTrackList(jobs) {
    const el = document.getElementById('track-list');
    if (!el) return;
    const active = jobs.filter(j => !['paid'].includes(j.status)).slice(0, 5);
    if (!active.length) {
      el.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('clock')}</div><p>No active jobs being tracked right now.</p></div>`;
      return;
    }
    el.innerHTML = active.map(trackCardHTML).join('');
    el.querySelectorAll('.track-card').forEach(card => {
      card.addEventListener('click', () => {
        const job = allJobs.find(j => j.id === parseInt(card.dataset.jobId));
        if (job) openJobModal(job);
      });
    });
  }

  /* ══════════════════════════════════════════════
     JOB DETAIL MODAL
  ══════════════════════════════════════════════ */
  async function openJobModal(job) {
    const created  = new Date(job.created_at).toLocaleString('en-NG');
    const verified = job.verified_at ? new Date(job.verified_at).toLocaleString('en-NG') : '—';

    let paymentDetails = null;
    try {
      const pRes = await fetch(`${FLASK}/api/job/payment-details?job_id=${job.id}&user_id=${user.id}`, { credentials: 'include' });
      if (pRes.ok) paymentDetails = await pRes.json();
    } catch (e) {}

    let media = [];
    try {
      const mRes = await fetch(`${FLASK}/api/job/media?job_id=${job.id}&user_id=${user.id}`, { credentials: 'include' });
      if (mRes.ok) { const md = await mRes.json(); media = md.media || []; }
    } catch (e) {}

    let comments = [];
    try {
      const cRes = await fetch(`${FLASK}/api/job/comments?job_id=${job.id}`, { credentials: 'include' });
      if (cRes.ok) { const cd = await cRes.json(); comments = cd.comments || []; }
    } catch (e) {}

    const pd     = paymentDetails || job;
    const amount = Number(pd.amount || job.amount || 0);

    // Review section
    let reviewSection = '';
    if (job.status === 'pending_review') {
      reviewSection = `
        <div class="notice notice--warning">
          <p class="notice__label">${ic('clock')} Worker application — awaiting your decision</p>
          <p><strong style="color:var(--text)">${job.worker_name || 'A worker'}</strong> has applied for this job. Approve to assign them, or decline to reopen it.</p>
          <div class="notice__row">
            <button class="btn btn--success" onclick="reviewWorker(${job.id}, ${job.worker_id}, 'assign')">${ic('check')} Approve Worker</button>
            <button class="btn btn--danger" onclick="reviewWorker(${job.id}, ${job.worker_id}, 'decline')">${ic('x')} Decline</button>
          </div>
        </div>`;
    } else if (job.status === 'verified') {
      const deadline = job.review_deadline ? new Date(job.review_deadline) : null;
      const deadlineStr = deadline ? deadline.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
      reviewSection = `
        <div class="notice notice--warning">
          <p class="notice__label">${ic('alert')} Work submitted — review before payment releases</p>
          <p><strong style="color:var(--text)">${job.worker_name || 'The worker'}</strong> marked this job as done from within the site's GPS boundary. Check the proof below, then approve to release payment or dispute if something's wrong.</p>
          ${deadlineStr ? `<p style="font-size:.76rem;color:var(--text-3);margin-top:6px">${ic('clock')} If you don't respond, payment auto-releases on <strong>${deadlineStr}</strong>.</p>` : ''}
          <div class="notice__row">
            <button class="btn btn--success" onclick="reviewSubmission(${job.id}, 'approve')">${ic('check')} Approve &amp; Release Payment</button>
            <button class="btn btn--danger" onclick="reviewSubmission(${job.id}, 'dispute')">${ic('x')} Dispute</button>
          </div>
        </div>`;
    }

    // Escrow section
    let escrowSection = '';
    if (['open', 'assigned', 'pending_review'].includes(job.status)) {
      const hasAccount = !!pd.collection_account_number;
      const funded = pd.escrow_paid || false;

      if (funded) {
        escrowSection = `
          <div class="notice notice--success" style="display:flex;align-items:center;gap:10px">
            <span style="color:var(--success)">${ic('check')}</span>
            <div><p style="font-weight:700;color:var(--success);font-size:.85rem">Escrow Funded</p>
            <p style="font-size:.76rem;color:var(--text-3)">₦${amount.toLocaleString()} received — worker can now complete the job</p></div>
          </div>`;
      } else if (hasAccount) {
        const isCheckoutUrl = pd.collection_account_number.startsWith('http');
        escrowSection = isCheckoutUrl ? `
          <div class="notice notice--warning">
            <p class="notice__label">${ic('alert')} Payment required — fund escrow to unlock job</p>
            <p style="margin-bottom:12px">Pay exactly <strong style="color:var(--text)">₦${amount.toLocaleString()}</strong> to fund escrow. The worker can only start after payment is confirmed.</p>
            <a href="${pd.collection_account_number}" target="_blank" class="btn btn--primary btn--wide" style="margin-bottom:8px;text-decoration:none">Pay ₦${amount.toLocaleString()} now</a>
            <button onclick="verifyPaymentDemo(${job.id})" class="btn btn--success btn--wide btn--sm">${ic('refresh')} Verify Payment (Demo)</button>
          </div>` : `
          <div class="notice notice--warning">
            <p class="notice__label">${ic('alert')} Awaiting payment — transfer to fund escrow</p>
            <div class="acct-box">
              <p class="acct-box__label">Bank</p>
              <p class="acct-box__bank">${pd.collection_bank_name || 'GTBank'}</p>
              <p class="acct-box__label">Account Number</p>
              <p class="acct-box__num">${pd.collection_account_number}</p>
            </div>
            <button onclick="copyAccNum('${pd.collection_account_number}')" class="btn btn--secondary btn--wide btn--sm" style="margin-bottom:8px">${ic('copy')} Copy Account Number</button>
            <button onclick="verifyPaymentDemo(${job.id})" class="btn btn--success btn--wide btn--sm">${ic('refresh')} Verify Payment (Demo)</button>
          </div>`;
      } else {
        escrowSection = `
          <div class="notice notice--neutral">
            <p style="color:var(--text-2)">Payment account not generated yet.</p>
            <button onclick="retryPaymentAccount(${job.id})" class="btn btn--secondary btn--sm" style="margin-top:8px">${ic('refresh')} Generate Payment Account</button>
          </div>`;
      }
    }

    // Rating section
    const canRate = ['verified', 'paid'].includes(job.status) && job.distance_meters != null && Number(job.distance_meters) <= 100;
    const alreadyRated = job.client_rating != null;
    let ratingSection = '';
    if (['verified', 'paid'].includes(job.status)) {
      if (!canRate) {
        ratingSection = `
          <div class="notice notice--danger" style="margin-top:16px">
            <p style="color:var(--danger)">${ic('alert')} Rating is disabled — worker was not within the GPS boundary (${job.distance_meters ? Math.round(job.distance_meters) + 'm away' : 'no GPS data'}).</p>
          </div>`;
      } else if (alreadyRated) {
        ratingSection = `
          <div class="notice notice--success" style="margin-top:16px">
            <p class="notice__label" style="color:var(--text-3)">Your Rating</p>
            <p style="color:var(--warning);font-size:1.1rem;letter-spacing:2px">${ICON.star.repeat(job.client_rating)}${ICON.starEmpty.repeat(5 - job.client_rating)}</p>
            ${job.client_rating_comment ? `<p style="font-size:.8rem;color:var(--text-2);margin-top:6px">"${job.client_rating_comment}"</p>` : ''}
          </div>`;
      } else {
        ratingSection = `
          <div class="notice notice--success" style="margin-top:16px">
            <p class="notice__label">Rate This Worker</p>
            <div class="star-row" id="star-row">
              ${[1,2,3,4,5].map(n => `<button onclick="selectStar(${n})" id="star-${n}" class="star-btn" title="${n} star${n>1?'s':''}">★</button>`).join('')}
            </div>
            <textarea id="rating-comment" placeholder="Optional comment…" class="field__input field__input--ta" style="min-height:60px;margin-bottom:10px"></textarea>
            <button class="btn btn--primary btn--wide" id="submit-rating-btn" onclick="submitRating(${job.id}, ${job.worker_id || 0})">Submit Rating</button>
          </div>`;
      }
    }

    // Media section
    let mediaSection = '';
    if (media.length) {
      mediaSection = `
        <div class="modal-divider"></div>
        <p class="modal-field__label" style="margin-bottom:10px">Proof Media</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${media.map(m => `
            <div class="proof-media">
              ${m.media_type === 'video'
                ? `<video src="${FLASK}/static/${m.file_path.replace('static/', '')}" controls></video>`
                : `<img src="${FLASK}/static/${m.file_path.replace('static/', '')}">`}
              <div class="proof-media__bar">
                ${m.proof_lat ? `<span class="proof-media__coords">${ic('pin')} ${Number(m.proof_lat).toFixed(4)}, ${Number(m.proof_lng).toFixed(4)}</span>` : ''}
                <button onclick="toggleLikeMedia(${m.id})" id="like-media-${m.id}" class="icon-btn ${m.user_liked ? 'is-liked' : ''}" style="margin-left:auto">
                  ${m.user_liked ? ic('heartFill') : ic('heart')} <span id="like-count-${m.id}">${m.likes}</span>
                </button>
                <button onclick="openMediaComments(${m.id})" class="icon-btn">${ic('comment')} ${m.comment_count}</button>
              </div>
            </div>`).join('')}
        </div>`;
    }

    // Comments section
    const commentsSection = `
      <div class="modal-divider"></div>
      <p class="modal-field__label" style="margin-bottom:10px">Comments</p>
      <div id="job-comments-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        ${comments.length === 0 ? `<p style="font-size:.8rem;color:var(--text-3)">No comments yet.</p>` :
          comments.map(c => `<div class="comment-row"><p class="comment-row__author">${c.user_name || 'Anonymous'}</p><p class="comment-row__body">${c.body}</p></div>`).join('')}
      </div>
      <div class="comment-input-row">
        <input type="text" id="job-comment-input" placeholder="Write a comment…">
        <button onclick="postJobComment(${job.id})" class="btn btn--primary btn--sm">Send</button>
      </div>`;

    modalBody.innerHTML = `
      <p class="modal-title">${job.title}</p>
      <p class="modal-amount">₦${amount.toLocaleString()}</p>
      ${statusBadge(job.status)}
      ${reviewSection}
      ${escrowSection}

      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">${ic('pin')} ${job.site_address || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Worker</p><p class="modal-field__val">${job.worker_name
        ? `<a href="#" onclick="openWorkerPublicProfile(${job.worker_id})">${job.worker_name}</a> · ${job.worker_trust ?? '—'} trust`
        : 'No worker assigned yet'}</p></div>
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Posted</p><p class="modal-field__val">${created}</p></div>
      <div class="modal-field"><p class="modal-field__label">Verified At</p><p class="modal-field__val">${verified}</p></div>
      ${job.distance_meters != null ? `<div class="modal-field"><p class="modal-field__label">GPS Distance</p><p class="modal-field__val">${Number(job.distance_meters).toFixed(0)}m from site</p></div>` : ''}
      ${job.transfer_reference ? `<div class="modal-field"><p class="modal-field__label">Payout Ref</p><p class="modal-field__val" style="font-family:var(--font-mono);font-size:.8rem">${job.transfer_reference}</p></div>` : ''}

      ${ratingSection}
      ${mediaSection}
      ${commentsSection}
    `;

    window._selectedStar = job.client_rating || 0;
    modalOverlay.classList.add('is-open');
  }

  function copyAccNum(num) {
    navigator.clipboard.writeText(num).then(() => {
      Swal.fire({ title: 'Copied', text: num, icon: 'success', timer: 1400, showConfirmButton: false, ...swalTheme() });
    });
  }

  function selectStar(n) {
    window._selectedStar = n;
    [1,2,3,4,5].forEach(i => {
      const el = document.getElementById(`star-${i}`);
      if (el) el.classList.toggle('is-active', i <= n);
    });
  }

  async function submitRating(jobId, workerId) {
    const rating  = window._selectedStar || 0;
    const comment = document.getElementById('rating-comment')?.value.trim() || '';
    if (!rating) { Swal.fire({ title: 'Pick a star rating', icon: 'warning', ...swalTheme() }); return; }

    const btn = document.getElementById('submit-rating-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
      const res  = await fetch(`${FLASK}/api/client/rate-worker`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ job_id: jobId, user_id: user.id, rating, comment })
      });
      const data = await res.json();
      if (data.success) {
        modalOverlay.classList.remove('is-open');
        await loadJobs();
        Swal.fire({ title: 'Rating saved', icon: 'success', ...swalTheme() });
      } else {
        Swal.fire({ title: 'Cannot rate', text: data.message, icon: 'error', ...swalTheme() });
        if (btn) { btn.disabled = false; btn.textContent = 'Submit Rating'; }
      }
    } catch (e) {
      Swal.fire({ title: 'Network error', icon: 'error', ...swalTheme() });
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Rating'; }
    }
  }

  async function toggleLikeMedia(mediaId) {
    const res  = await fetch(`${FLASK}/api/media/like`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ media_id: mediaId, user_id: user.id })
    });
    const data = await res.json();
    if (data.success) {
      const btn = document.getElementById(`like-media-${mediaId}`);
      if (btn) {
        btn.classList.toggle('is-liked', data.liked);
        btn.innerHTML = `${data.liked ? ic('heartFill') : ic('heart')} <span id="like-count-${mediaId}">${data.count}</span>`;
      }
    }
  }

  async function openMediaComments(mediaId) {
    const res  = await fetch(`${FLASK}/api/media/comments?media_id=${mediaId}`, { credentials: 'include' });
    const data = await res.json();
    const comments = data.comments || [];
    const theme = swalTheme();
    await Swal.fire({
      title: 'Comments',
      html: `
        <div style="text-align:left;max-height:280px;overflow-y:auto;margin-bottom:12px">
          ${comments.length === 0 ? '<p style="color:var(--text-3);font-size:.85rem">No comments yet.</p>' :
            comments.map(c => `<div class="comment-row" style="margin-bottom:8px"><p class="comment-row__author">${c.user_name || 'Anonymous'}</p><p class="comment-row__body">${c.body}</p></div>`).join('')}
        </div>
        <input type="text" id="media-comment-input" placeholder="Write a comment…" class="field__input">`,
      showCancelButton: true, confirmButtonText: 'Post Comment', cancelButtonText: 'Close',
      confirmButtonColor: '#E85C00', cancelButtonColor: '#9A968E', ...theme,
      preConfirm: () => document.getElementById('media-comment-input')?.value.trim()
    }).then(async result => {
      if (result.isConfirmed && result.value) {
        await fetch(`${FLASK}/api/media/comment`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ media_id: mediaId, user_id: user.id, user_name: user.name, body: result.value })
        });
      }
    });
  }

  async function postJobComment(jobId) {
    const input = document.getElementById('job-comment-input');
    const body = input?.value.trim();
    if (!body) return;
    input.value = '';
    await fetch(`${FLASK}/api/job/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ job_id: jobId, user_id: user.id, user_name: user.name, body })
    });
    const list = document.getElementById('job-comments-list');
    if (list) list.innerHTML += `<div class="comment-row"><p class="comment-row__author">${user.name}</p><p class="comment-row__body">${body}</p></div>`;
  }

  /* ══════════════════════════════════════════════
     WORKER PUBLIC PROFILE
  ══════════════════════════════════════════════ */
  const AVATAR_PALETTE = ['#E85C00','#2563EB','#16A34A','#7C3AED','#DB2777','#0891B2','#CA8A04'];
  function avatarColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }

  async function openWorkerPublicProfile(workerId) {
    if (!workerId) return;
    modalOverlay.classList.remove('is-open');

    const res = await fetch(`${FLASK}/api/worker/public-profile?worker_id=${workerId}&viewer_id=${user.id}`, { credentials: 'include' });
    if (!res.ok) { Swal.fire({ title: 'Could not load profile', icon: 'error', ...swalTheme() }); return; }
    const data = await res.json();

    const w  = data.worker || {};
    const rs = data.rating_summary || {};
    const initials = w.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'W';
    const color = avatarColor(w.name || 'W');

    workerModalBody.innerHTML = `
      <div style="text-align:center;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:18px">
        <div style="width:60px;height:60px;border-radius:50%;background:${color}18;border:2px solid ${color};color:${color};font-family:var(--font-display);font-size:1.3rem;font-weight:800;display:grid;place-items:center;margin:0 auto 10px">${initials}</div>
        <p style="font-family:var(--font-display);font-size:1.15rem;font-weight:800">${w.name || '—'}</p>
        <p style="color:var(--accent);font-size:.84rem;font-weight:600;margin:3px 0">${w.trade || 'General'}</p>
        <p style="font-size:.76rem;color:var(--text-3)">${w.jobs_completed || 0} verified jobs</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px">
        <div class="acct-box" style="text-align:center;padding:12px"><p style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;color:var(--accent)">${Number(w.trust_score || 0).toFixed(1)}</p><p style="font-size:.66rem;color:var(--text-3)">Trust Score</p></div>
        <div class="acct-box" style="text-align:center;padding:12px"><p style="font-family:var(--font-display);font-size:1.2rem;font-weight:800">${rs.total_ratings || 0}</p><p style="font-size:.66rem;color:var(--text-3)">Ratings</p></div>
        <div class="acct-box" style="text-align:center;padding:12px"><p style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;color:var(--warning)">${rs.avg_rating ? Number(rs.avg_rating).toFixed(1) : '—'}</p><p style="font-size:.66rem;color:var(--text-3)">Avg Rating</p></div>
      </div>

      ${rs.total_ratings > 0 ? `
      <div style="margin-bottom:18px">
        ${[5,4,3,2,1].map(star => {
          const key = ['one','two','three','four','five'][star - 1];
          const count = Number(rs[`${key}_star`] || 0);
          const pct = rs.total_ratings > 0 ? Math.round((count / rs.total_ratings) * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-size:.74rem;color:var(--warning);width:20px">${star}★</span>
            <div style="flex:1;height:6px;background:var(--surface-sunk);border-radius:99px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--warning);border-radius:99px"></div></div>
            <span style="font-size:.7rem;color:var(--text-3);width:28px;text-align:right">${pct}%</span>
          </div>`;
        }).join('')}
      </div>` : ''}

      ${(data.media || []).length ? `
      <p class="modal-field__label" style="margin-bottom:10px">Proof Media</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
        ${data.media.slice(0, 4).map(m => `
          <div class="proof-media">
            ${m.media_type === 'video'
              ? `<video src="${FLASK}/static/${m.file_path.replace('static/', '')}" controls></video>`
              : `<img src="${FLASK}/static/${m.file_path.replace('static/', '')}">`}
            <div class="proof-media__bar">
              <span style="font-size:.74rem;color:var(--text-3)">${m.job_title || ''}</span>
              <button onclick="toggleLikeMedia(${m.id})" id="like-media-${m.id}" class="icon-btn ${m.viewer_liked ? 'is-liked' : ''}" style="margin-left:auto">${m.viewer_liked ? ic('heartFill') : ic('heart')} <span id="like-count-${m.id}">${m.likes}</span></button>
              <button onclick="openMediaComments(${m.id})" class="icon-btn">${ic('comment')} ${m.comment_count}</button>
            </div>
          </div>`).join('')}
      </div>` : ''}

      ${(data.job_history || []).length ? `
      <p class="modal-field__label" style="margin-bottom:10px">Job History</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
        ${data.job_history.slice(0, 5).map(h => `
          <div class="acct-box">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <p style="font-size:.85rem;font-weight:600">${h.title}</p>
              <span style="font-family:var(--font-display);font-size:.85rem;font-weight:700;color:var(--accent)">₦${Number(h.amount).toLocaleString()}</span>
            </div>
            <p style="font-size:.72rem;color:var(--text-3);margin-top:3px">${ic('pin')} ${h.site_address || '—'}</p>
            ${h.client_rating ? `<p style="font-size:.78rem;color:var(--warning);margin-top:5px">${ICON.star.repeat(h.client_rating)}${ICON.starEmpty.repeat(5 - h.client_rating)} ${h.client_rating_comment ? `"${h.client_rating_comment}"` : ''}</p>` : ''}
          </div>`).join('')}
      </div>` : ''}

      <p class="modal-field__label" style="margin-bottom:10px">SkillChain Certificate</p>
      
    `;
    workerModalOverlay.classList.add('is-open');
  }

  // ── Payments ──
  function renderPayments() {
    const paid   = allJobs.filter(j => j.status === 'paid');
    const escrow = allJobs.filter(j => ['open', 'assigned', 'pending_verification'].includes(j.status));
    document.getElementById('pay-total').textContent  = '₦' + paid.reduce((s, j) => s + Number(j.amount || 0), 0).toLocaleString();
    document.getElementById('pay-escrow').textContent = '₦' + escrow.reduce((s, j) => s + Number(j.amount || 0), 0).toLocaleString();
    document.getElementById('pay-count').textContent  = paid.length;

    const list = document.getElementById('payments-list');
    list.innerHTML = paid.length ? paid.map(job => {
      const date = new Date(job.paid_at || job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
      return `<div class="payment-row">
        <div class="payment-row__icon">${ic('card')}</div>
        <div class="payment-row__info"><p class="payment-row__title">${job.title}</p><p class="payment-row__date">${date} · ${job.transfer_reference || 'No ref'}</p></div>
        <span class="payment-row__amount">₦${Number(job.amount).toLocaleString()}</span>
      </div>`;
    }).join('') : `<div class="empty-state"><div class="icon-sq">${ic('wallet')}</div><p>No transactions yet.</p></div>`;
  }

  /* ══════════════════════════════════════════════
     MAP PICKER
  ══════════════════════════════════════════════ */
  function initMap() {
    if (mapReady) return;
    const mapEl = document.getElementById('job-map');
    if (!mapEl || mapEl.offsetWidth === 0) { setTimeout(initMap, 100); return; }

    map = L.map('job-map', { zoomControl: true }).setView([6.5244, 3.3792], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);

    const orangeIcon = makeOrangeIcon();
    map.on('click', async e => { await setLocation(e.latlng.lat, e.latlng.lng, null, orangeIcon); });

    mapReady = true;
    setTimeout(() => map.invalidateSize(), 50);
    document.getElementById('map-hint').classList.remove('is-hidden');
  }

  function makeOrangeIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="width:26px;height:26px;background:#E85C00;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35)"></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -28]
    });
  }

  async function setLocation(lat, lng, addressOverride, iconObj) {
    selectedLat = lat; selectedLng = lng;
    const icon = iconObj || makeOrangeIcon();
    if (marker) marker.setLatLng([lat, lng]); else marker = L.marker([lat, lng], { icon }).addTo(map);
    map.panTo([lat, lng]);

    let address = addressOverride;
    if (!address) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const d = await r.json();
        address = d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      } catch { address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
    }

    document.getElementById('job-address').value = address;
    document.getElementById('job-lat').value = lat.toFixed(6);
    document.getElementById('job-lng').value = lng.toFixed(6);
    document.getElementById('address-display-text').textContent = address;
    document.getElementById('address-display-coords').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('address-display').style.display = 'flex';
    document.getElementById('map-hint').classList.add('is-hidden');
    document.getElementById('err-address').textContent = '';

    const card = document.getElementById('address-display');
    card.classList.remove('address-display--pulse');
    void card.offsetWidth;
    card.classList.add('address-display--pulse');
  }

  function clearLocation() {
    selectedLat = null; selectedLng = null;
    if (marker) { map.removeLayer(marker); marker = null; }
    ['job-address', 'job-lat', 'job-lng'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('address-display').style.display = 'none';
    document.getElementById('map-hint').classList.remove('is-hidden');
  }
  document.getElementById('clear-location')?.addEventListener('click', clearLocation);

  document.getElementById('btn-my-loc')?.addEventListener('click', () => {
    if (!navigator.geolocation) { Swal.fire({ title: 'Geolocation not supported', icon: 'error', ...swalTheme() }); return; }
    const btn = document.getElementById('btn-my-loc');
    btn.style.opacity = '.5';
    navigator.geolocation.getCurrentPosition(
      async pos => { btn.style.opacity = ''; await setLocation(pos.coords.latitude, pos.coords.longitude); map.setZoom(16); },
      err => { btn.style.opacity = ''; Swal.fire({ title: 'Could not get location', text: err.message, icon: 'error', ...swalTheme() }); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // ── Address search ──
  let searchTimeout = null;
  const searchInput   = document.getElementById('location-search-input');
  const searchResults  = document.getElementById('location-results');

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 3) { searchResults.classList.remove('is-open'); return; }

    searchTimeout = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ng`);
        const results = await r.json();
        if (!results.length) { searchResults.classList.remove('is-open'); return; }

        searchResults.innerHTML = results.map((place, i) =>
          `<div class="location-result" data-idx="${i}" data-lat="${place.lat}" data-lng="${place.lon}" data-name="${place.display_name}">
             <strong>${place.display_name.split(',')[0]}</strong>
             <span>${place.display_name.split(',').slice(1, 3).join(',')}</span>
           </div>`).join('');
        searchResults.classList.add('is-open');

        searchResults.querySelectorAll('.location-result').forEach(item => {
          item.addEventListener('click', async () => {
            const lat = parseFloat(item.dataset.lat), lng = parseFloat(item.dataset.lng), name = item.dataset.name;
            if (!mapReady) initMap();
            await setLocation(lat, lng, name);
            map.setView([lat, lng], 16);
            searchInput.value = '';
            searchResults.classList.remove('is-open');
          });
        });
      } catch (e) { console.error('Nominatim search error:', e); }
    }, 400);
  });

  document.addEventListener('click', e => { if (!e.target.closest('.location-search')) searchResults.classList.remove('is-open'); });

  /* ══════════════════════════════════════════════
     MEDIA UPLOAD
  ══════════════════════════════════════════════ */
  const mediaUploadZone = document.getElementById('media-upload-zone');
  const mediaFileInput  = document.getElementById('media-files');
  const mediaPreviewsEl = document.getElementById('media-previews');
  const mediaPrompt     = document.getElementById('media-prompt');

  mediaUploadZone?.addEventListener('click', e => {
    if (!e.target.closest('.media-thumb__remove') && !e.target.closest('.media-thumb__add')) mediaFileInput.click();
  });
  mediaFileInput?.addEventListener('change', () => { handleNewFiles(Array.from(mediaFileInput.files)); mediaFileInput.value = ''; });
  mediaUploadZone?.addEventListener('dragover', e => { e.preventDefault(); mediaUploadZone.classList.add('media-upload--drag'); });
  mediaUploadZone?.addEventListener('dragleave', () => mediaUploadZone.classList.remove('media-upload--drag'));
  mediaUploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    mediaUploadZone.classList.remove('media-upload--drag');
    handleNewFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/')));
  });

  function handleNewFiles(files) {
    const remaining = 5 - mediaFiles.length;
    files.slice(0, remaining).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { Swal.fire({ title: 'File too large', text: `${file.name} exceeds the 10MB limit.`, icon: 'warning', ...swalTheme() }); return; }
      mediaFiles.push(file);
    });
    renderMediaPreviews();
  }

  function renderMediaPreviews() {
    const hasFiles = mediaFiles.length > 0;
    mediaPrompt.style.display = hasFiles ? 'none' : 'flex';
    mediaPreviewsEl.innerHTML = '';

    mediaFiles.forEach((file, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'media-thumb';
      const url = URL.createObjectURL(file);
      thumb.innerHTML = file.type.startsWith('image/') ? `<img src="${url}" alt="${file.name}">` : `<video src="${url}" muted></video>`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'media-thumb__remove';
      removeBtn.type = 'button';
      removeBtn.innerHTML = ic('x');
      removeBtn.addEventListener('click', e => { e.stopPropagation(); mediaFiles.splice(i, 1); renderMediaPreviews(); });
      thumb.appendChild(removeBtn);
      mediaPreviewsEl.appendChild(thumb);
    });

    if (mediaFiles.length > 0 && mediaFiles.length < 5) {
      const addBtn = document.createElement('div');
      addBtn.className = 'media-thumb__add';
      addBtn.textContent = '+';
      addBtn.addEventListener('click', () => mediaFileInput.click());
      mediaPreviewsEl.appendChild(addBtn);
    }
  }

  /* ══════════════════════════════════════════════
     POST JOB FORM
  ══════════════════════════════════════════════ */
  document.getElementById('post-job-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const title   = document.getElementById('job-title').value.trim();
    const amount  = document.getElementById('job-amount').value;
    const address = document.getElementById('job-address').value;

    ['err-title', 'err-amount', 'err-address'].forEach(id => { document.getElementById(id).textContent = ''; });
    let valid = true;
    if (!title) { document.getElementById('err-title').textContent = 'Job title is required.'; valid = false; }
    if (!amount || Number(amount) < 100) { document.getElementById('err-amount').textContent = 'Enter a valid amount (min ₦100).'; valid = false; }
    if (!address) { document.getElementById('err-address').textContent = 'Please pick a location on the map.'; valid = false; }
    if (!valid) return;

    const btn = document.getElementById('post-job-btn');
    const text = document.getElementById('post-job-text');
    const spin = document.getElementById('post-job-spinner');
    text.style.display = 'none'; spin.style.display = 'inline-block'; btn.disabled = true;

    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('role', 'client');
    formData.append('title', title);
    formData.append('description', document.getElementById('job-desc').value.trim());
    formData.append('trade', document.getElementById('job-trade').value);
    formData.append('amount', amount);
    formData.append('site_address', address);
    formData.append('site_lat', document.getElementById('job-lat').value);
    formData.append('site_lng', document.getElementById('job-lng').value);
    mediaFiles.forEach((file, i) => formData.append(`media_${i}`, file));

    try {
      const res  = await fetch(`${FLASK}/api/client/post-job`, { method: 'POST', body: formData, credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        document.getElementById('post-job-form').reset();
        clearLocation();
        mediaFiles = [];
        renderMediaPreviews();
        await loadJobs();

        if (data.payment?.account_number) {
          showView('my-jobs'); renderJobsList(allJobs);
          await Swal.fire({
            title: 'Job Posted',
            html: `
              <p style="margin-bottom:16px;color:var(--text-2)">Now fund the escrow so workers can begin.</p>
              <div class="acct-box" style="text-align:left">
                <p class="acct-box__label">Transfer Exactly</p>
                <p style="font-family:var(--font-display);font-size:1.5rem;font-weight:800;color:var(--accent)">₦${Number(data.payment.amount).toLocaleString()}</p>
                <div style="height:1px;background:var(--border);margin:12px 0"></div>
                <p class="acct-box__label">To This Account</p>
                <p class="acct-box__num" style="font-size:1.2rem">${data.payment.account_number}</p>
                <p style="font-size:.8rem;color:var(--text-2);margin-top:3px">${data.payment.bank_name}</p>
                <div style="height:1px;background:var(--border);margin:12px 0"></div>
                <p style="font-size:.75rem;color:var(--text-3)">Transfer the exact amount. Any difference will be flagged. Workers can only start after your payment lands.</p>
              </div>`,
            confirmButtonText: "I'll transfer now", confirmButtonColor: '#E85C00', width: '480px', ...swalTheme()
          });
        } else {
          showView('my-jobs'); renderJobsList(allJobs);
          Swal.fire({ title: 'Job Posted', text: 'Payment account could not be generated right now. Check job details to retry.', icon: 'warning', confirmButtonColor: '#E85C00', ...swalTheme() });
        }
      } else {
        const errs = data.errors || {};
        if (errs.title)   document.getElementById('err-title').textContent   = errs.title;
        if (errs.amount)  document.getElementById('err-amount').textContent  = errs.amount;
        if (errs.address) document.getElementById('err-address').textContent = errs.address;
        if (errs.general) Swal.fire({ title: 'Error', text: errs.general, icon: 'error', ...swalTheme() });
      }
    } catch (err) {
      console.error('Post job error:', err);
      Swal.fire({ title: 'Network error', text: 'Could not reach the server.', icon: 'error', ...swalTheme() });
    } finally {
      text.style.display = 'inline'; spin.style.display = 'none'; btn.disabled = false;
    }
  });

  /* ══════════════════════════════════════════════
     FIND WORKERS
  ══════════════════════════════════════════════ */
  async function searchWorkers() {
    const query = (document.getElementById('worker-search-text')?.value || '').trim();
    const trade = document.getElementById('worker-search-trade')?.value || '';
    const grid  = document.getElementById('workers-grid');

    grid.innerHTML = `<div class="skeleton-list" style="grid-column:1/-1"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;

    let userLat = null, userLng = null;
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, maximumAge: 120000, enableHighAccuracy: false }));
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
    } catch {}

    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (trade) params.append('trade', trade);
      if (userLat) { params.append('lat', userLat); params.append('lng', userLng); params.append('radius_km', '10'); }

      const res = await fetch(`${FLASK}/api/workers/search?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      renderWorkers(grid, data.workers || [], !!userLat);
    } catch (e) {
      console.error('searchWorkers:', e);
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon-sq">${ic('alert')}</div><p>Could not reach the server.</p></div>`;
    }
  }
  document.getElementById('btn-search-workers')?.addEventListener('click', searchWorkers);
  document.getElementById('worker-search-text')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchWorkers(); });
  document.getElementById('worker-search-trade')?.addEventListener('change', searchWorkers);

  function workerCardHTML(w) {
    const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const score = Number(w.trust_score || 0).toFixed(1);
    const filled = Math.round(w.trust_score || 0);
    const stars = ICON.star.repeat(filled) + ICON.starEmpty.repeat(5 - filled);
    const color = avatarColor(w.name);

    let locationRow;
    if (w.distance_km !== null && w.distance_km !== undefined) {
      const label = w.distance_km < 1 ? `${Math.round(w.distance_km * 1000)}m away` : `${w.distance_km}km away`;
      locationRow = `<span class="avail-dot"></span> ${label} <span class="avail-label">Available</span>`;
    } else if (w.avg_lat) {
      locationRow = `<span class="avail-dot"></span> Location known <span class="avail-label">Available</span>`;
    } else {
      locationRow = `<span class="avail-dot avail-dot--off"></span> No location yet <span class="avail-label avail-label--off">—</span>`;
    }

    return `
      <div class="worker-card" data-worker-id="${w.id}">
        <div class="worker-card__top">
          <div class="worker-card__avatar" style="background:${color}18;border:2px solid ${color};color:${color}">${initials}</div>
          <div class="worker-card__id">
            <p class="worker-card__name">${w.name}</p>
            <p class="worker-card__trade">${w.trade || 'General'}</p>
          </div>
          <span class="trust-pill">${score} Trust</span>
        </div>
        <div class="worker-card__rating"><span class="stars">${stars}</span> ${score} <span style="color:var(--text-3)">(${w.jobs_completed || 0} reviews)</span></div>
        <div class="worker-card__stats">
          <div class="worker-stat"><strong>${w.jobs_completed || 0}</strong>Jobs Done</div>
          <div class="worker-stat"><strong>${score}</strong>Trust Score</div>
        </div>
        <div class="worker-card__location">${locationRow}</div>
        <button class="worker-card__hire" data-worker-id="${w.id}">View Profile & Connect</button>
      </div>`;
  }

  function renderWorkers(grid, workers, hasLocation) {
    window._lastWorkerResults = workers;
    const sub = document.getElementById('workers-count-sub');
    if (sub) sub.textContent = `${workers.length} artisan${workers.length === 1 ? '' : 's'} available`;
    if (!workers.length) {
      const msg = hasLocation ? 'No workers found nearby. Try increasing the search radius.' : 'No workers found. Try a different search.';
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon-sq">${ic('search')}</div><p>${msg}</p></div>`;
      return;
    }
    grid.innerHTML = workers.map(workerCardHTML).join('');
    attachWorkerCardListeners(grid);
  }

  function attachWorkerCardListeners(grid) {
    grid.querySelectorAll('.worker-card__hire').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const workerId = parseInt(btn.dataset.workerId);
        const worker = (window._lastWorkerResults || []).find(w => w.id === workerId);
        if (worker) openWorkerProfileModal(worker.id);
      });
    });
  }

  
/* ── Constants ── */
const WP_RING_C = 2 * Math.PI * 18; // circumference for r=18

/* ── Open modal ── */
async function openWorkerProfileModal(workerId, jobId, jobTitle) {
  const overlay = document.getElementById('wp-overlay');
  if (!overlay) return;

  // Store context for action buttons
  overlay.dataset.workerId = workerId;
  overlay.dataset.jobId    = jobId    || '';
  overlay.dataset.jobTitle = jobTitle || '';

  // Show overlay immediately with skeleton
  overlay.classList.add('is-open');
  showWPSkeleton();

  try {
    // Fetch worker public profile
    const res  = await fetch(
      `${FLASK}/api/worker/public-profile?worker_id=${workerId}&viewer_id=${user.id}`,
      { credentials: 'include' }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    renderWorkerProfile(data, workerId);
  } catch (e) {
    console.error('[wp-modal]', e);
    closeWorkerProfileModal();
    Swal.fire({
      title: 'Could not load profile',
      text:  'Please try again.',
      icon:  'error',
      confirmButtonColor: '#E85C00',
      ...swalTheme?.() || {}
    });
  }
}

/* ── Render profile data ── */
function renderWorkerProfile(data, workerId) {
  // ── Avatar ──
  const avatarEl = document.getElementById('wp-avatar');
  const initial  = (data.name || '?')[0].toUpperCase();
  const photoSrc = data.profile_photo_path || null; // Cloudinary full URL

  if (photoSrc) {
    avatarEl.style.backgroundImage    = `url(${photoSrc})`;
    avatarEl.style.backgroundSize     = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.textContent = '';
  } else {
    avatarEl.style.backgroundImage = '';
    avatarEl.textContent = initial;
  }

  // ── Online dot ──
  const onlineDot = document.getElementById('wp-online-dot');
  if (data.online) onlineDot.style.display = 'block';
  else             onlineDot.style.display = 'none';

  // ── Basic info ──
  document.getElementById('wp-name').textContent  = data.name  || '—';
  document.getElementById('wp-trade').textContent = data.trade || '—';

  const verifiedJobs = data.jobs_completed || 0;
  const location     = data.location || 'Nigeria';
  document.getElementById('wp-meta').textContent =
    `${verifiedJobs} verified job${verifiedJobs === 1 ? '' : 's'} · ${location}`;

  // ── Trust score ring ──
  const score   = parseFloat(data.trust_score || 0);
  const pct     = Math.min(100, (score / 5) * 100);
  const offset  = WP_RING_C - (WP_RING_C * pct / 100);
  const ringEl  = document.getElementById('wp-trust-ring');
  const valEl   = document.getElementById('wp-trust-val');
  if (ringEl) {
    ringEl.style.strokeDasharray  = WP_RING_C;
    ringEl.style.strokeDashoffset = offset;
  }
  if (valEl) valEl.textContent = score.toFixed(1);

  // ── Stars ──
  const starsEl = document.getElementById('wp-stars');
  const filled  = Math.round(score);
  starsEl.innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < filled ? 's-filled' : 's-empty'}">${i < filled ? '★' : '☆'}</span>`
  ).join('');

  // ── Stats ──
  const avgRating  = parseFloat(data.avg_rating  || 0);
  const totalRatings = parseInt(data.total_ratings || 0);
  const verLogs    = data.verification_logs || [];
  const passed     = verLogs.filter(v => v.result === 'pass').length;
  const passRate   = verLogs.length > 0
    ? Math.round((passed / verLogs.length) * 100) + '%'
    : '—';

  document.getElementById('wp-jobs').textContent    = verifiedJobs;
  document.getElementById('wp-rating').textContent  = avgRating > 0 ? avgRating.toFixed(1) + '★' : '—';
  document.getElementById('wp-reviews').textContent = totalRatings;
  document.getElementById('wp-pass-rate').textContent = passRate;

  // ── Skills ──
  const skills    = Array.isArray(data.top_skills) ? data.top_skills : [];
  const skillsSec = document.getElementById('wp-skills-section');
  const skillsEl  = document.getElementById('wp-skills');
  if (skills.length) {
    skillsEl.innerHTML = skills
      .map(s => `<span class="wp-skill-tag">${s}</span>`)
      .join('');
    skillsSec.style.display = '';
  } else {
    skillsSec.style.display = 'none';
  }

  // ── Rating breakdown ──
  const reviews    = data.reviews || [];
  const ratingsSec = document.getElementById('wp-ratings-section');
  const ratingBars = document.getElementById('wp-rating-bars');
  if (reviews.length) {
    const counts = [5,4,3,2,1].map(star => ({
      star,
      count: reviews.filter(r => Math.round(r.rating) === star).length
    }));
    ratingBars.innerHTML = counts.map(({ star, count }) => {
      const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
      return `
        <div class="wp-rating-bar-row">
          <span class="wp-rating-bar-row__label">${star}<span class="star">★</span></span>
          <div class="wp-rating-bar-track">
            <div class="wp-rating-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="wp-rating-bar-row__pct">${pct}%</span>
        </div>`;
    }).join('');
    ratingsSec.style.display = '';
  } else {
    ratingsSec.style.display = 'none';
  }

  // ── Proof media ──
  const media    = data.media || [];
  const mediaSec = document.getElementById('wp-media-section');
  const mediaGrid= document.getElementById('wp-media-grid');
  const emptyEl  = document.getElementById('wp-empty');

  if (media.length) {
    mediaGrid.innerHTML = media.map(m => {
      const isVideo = m.media_type === 'video';
      const src     = m.file_path;  // Cloudinary URL or static path
      const fullSrc = src.startsWith('http') ? src : `${FLASK}/${src}`;

      if (isVideo) {
        return `
          <div class="wp-media-item">
            <video
              src="${fullSrc}"
              controls
              preload="metadata"
              playsinline
              style="width:100%;aspect-ratio:16/10;object-fit:cover;background:#111"
            ></video>
            ${m.caption ? `<p class="wp-media-item__caption">${m.caption}</p>` : ''}
            <div class="wp-media-item__actions">
              <button class="wp-media-action ${m.user_liked ? 'liked' : ''}"
                      onclick="wpToggleLike(${m.id}, this)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${m.user_liked ? 'currentColor' : 'none'}">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                ${m.likes || 0}
              </button>
              <button class="wp-media-action" onclick="wpViewComments(${m.id})">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                        stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
                ${m.comment_count || 0}
              </button>
            </div>
          </div>`;
      } else {
        return `
          <div class="wp-media-item">
            <img src="${fullSrc}" alt="Proof of work" loading="lazy"
                 style="width:100%;aspect-ratio:16/10;object-fit:cover">
            ${m.caption ? `<p class="wp-media-item__caption">${m.caption}</p>` : ''}
            <div class="wp-media-item__actions">
              <button class="wp-media-action ${m.user_liked ? 'liked' : ''}"
                      onclick="wpToggleLike(${m.id}, this)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${m.user_liked ? 'currentColor' : 'none'}">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                        stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                </svg>
                ${m.likes || 0}
              </button>
            </div>
          </div>`;
      }
    }).join('');
    mediaSec.style.display = '';
    emptyEl.style.display  = 'none';
  } else {
    mediaSec.style.display = 'none';
    emptyEl.style.display  = '';
  }

  // ── Certificate ──
const certStrip = document.getElementById('wp-cert-strip');
const certInner = document.getElementById('wp-cert-inner');
if (certStrip && certInner) {
  const jobs  = data.jobs_completed || 0;
  const trust = parseFloat(data.trust_score || 0);
  const tier  = jobs >= 20 && trust >= 4 ? 'gold'
              : jobs >= 5  && trust >= 3 ? 'silver'
              : 'bronze';
  const TIER_PALETTE = {
    bronze:{ bg:'linear-gradient(145deg,#2C1A08,#1A0F05)', accent:'#D4822A', accent2:'#F0A84A', badge:'linear-gradient(135deg,#C97B28,#E8A050)', border:'rgba(212,130,42,.4)', inner:'rgba(212,130,42,.12)', label:'#F5C98A', sub:'rgba(245,201,138,.6)', metric:'rgba(212,130,42,.15)', skill:'rgba(212,130,42,.18)' },
    silver:{ bg:'linear-gradient(145deg,#141820,#0D1118)', accent:'#8CA0BE', accent2:'#B0C4DE', badge:'linear-gradient(135deg,#6B80A0,#9AAFC8)', border:'rgba(140,160,190,.4)', inner:'rgba(140,160,190,.1)', label:'#C8D8EE', sub:'rgba(200,216,238,.6)', metric:'rgba(140,160,190,.15)', skill:'rgba(140,160,190,.18)' },
    gold:  { bg:'linear-gradient(145deg,#1E1500,#120D00)', accent:'#D4AF37', accent2:'#F0D060', badge:'linear-gradient(135deg,#C9A227,#EDD050)', border:'rgba(212,175,55,.5)', inner:'rgba(212,175,55,.14)', label:'#F5E090', sub:'rgba(245,224,144,.65)', metric:'rgba(212,175,55,.18)', skill:'rgba(212,175,55,.2)' }
  };
  const TIER_LABEL = { bronze:'Bronze Certified', silver:'Silver Certified', gold:'Gold Verified' };
  const p        = TIER_PALETTE[tier];
  const photoSrc = data.profile_photo_path || null;
  const initial  = (data.name || '?')[0].toUpperCase();
  const avatarHTML = photoSrc
    ? `<div style="width:64px;height:64px;border-radius:12px;background-image:url(${photoSrc});background-size:cover;background-position:center;border:2px solid rgba(255,255,255,.15);flex-shrink:0"></div>`
    : `<div style="width:64px;height:64px;border-radius:12px;background:${p.metric};border:2px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:800;color:rgba(255,255,255,.7);flex-shrink:0">${initial}</div>`;
  const skills  = Array.isArray(data.top_skills) && data.top_skills.length
    ? data.top_skills : [data.trade||'General','GPS Verified','Escrow Payments'];
  const issued  = new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'});
  const verId   = `SC-${String(data.id||0).padStart(5,'0')}-${(Date.now()%1000000).toString(36).toUpperCase()}`;
  const filled  = Math.round(trust);
  const stars   = Array.from({length:5},(_,i)=>`<span style="color:${i<filled?p.accent2:'rgba(255,255,255,.2)'}">${i<filled?'★':'☆'}</span>`).join('');
  const tierDesc = { bronze:'Completing their first verified jobs on SkillChain.', silver:'Consistently delivering GPS-verified, escrow-secured work.', gold:'An elite verified artisan with an outstanding trust record.' }[tier];

  certInner.innerHTML = `
    <div style="background:${p.bg};border:1.5px solid ${p.border};border-radius:16px;
                overflow:hidden;position:relative;margin:0 24px 20px">
      <div style="position:absolute;top:10px;left:10px;width:16px;height:16px;
                  border-top:2px solid ${p.accent};border-left:2px solid ${p.accent};
                  border-radius:3px 0 0 0"></div>
      <div style="position:absolute;top:10px;right:10px;width:16px;height:16px;
                  border-top:2px solid ${p.accent};border-right:2px solid ${p.accent};
                  border-radius:0 3px 0 0"></div>
      <div style="position:absolute;bottom:10px;left:10px;width:16px;height:16px;
                  border-bottom:2px solid ${p.accent};border-left:2px solid ${p.accent};
                  border-radius:0 0 0 3px"></div>
      <div style="position:absolute;bottom:10px;right:10px;width:16px;height:16px;
                  border-bottom:2px solid ${p.accent};border-right:2px solid ${p.accent};
                  border-radius:0 0 3px 0"></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;
                  padding:22px 22px 16px">
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:inline-flex;align-items:center;gap:6px;
                      background:${p.badge};border-radius:999px;padding:4px 12px;
                      font-size:.63rem;font-weight:800;letter-spacing:.1em;
                      color:#fff;width:fit-content">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                    stroke="white" stroke-width="2" stroke-linejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2.2"
                    stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${TIER_LABEL[tier].toUpperCase()}
          </div>
          <p style="font-family:monospace;font-size:.6rem;letter-spacing:.1em;
                    color:${p.sub}">SkillChain Artisan Certificate</p>
          <p style="font-family:monospace;font-size:.6rem;font-weight:700;
                    color:${p.accent}">skillchain.app</p>
        </div>
        ${avatarHTML}
      </div>
      <div style="padding:0 22px 16px;border-bottom:1px solid ${p.inner}">
        <p style="font-size:1.5rem;font-weight:800;letter-spacing:-.03em;
                  color:${p.label};line-height:1.1;margin-bottom:4px">
          ${data.name||'Artisan'}
        </p>
        <p style="font-size:.85rem;font-weight:700;color:${p.accent2};margin-bottom:6px">
          ${data.trade||'General'}
        </p>
        <p style="font-size:.76rem;color:${p.sub};line-height:1.5">${tierDesc}</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);
                  gap:10px;padding:16px 22px">
        <div style="background:${p.metric};border:1px solid ${p.inner};
                    border-radius:10px;padding:12px;text-align:center">
          <div style="font-family:monospace;font-size:1.3rem;font-weight:700;
                      color:${p.accent2};line-height:1;margin-bottom:4px">${jobs}</div>
          <div style="font-size:.6rem;text-transform:uppercase;
                      letter-spacing:.08em;color:${p.sub}">Jobs Done</div>
        </div>
        <div style="background:${p.metric};border:1px solid ${p.inner};
                    border-radius:10px;padding:12px;text-align:center">
          <div style="font-family:monospace;font-size:1.3rem;font-weight:700;
                      color:${p.accent2};line-height:1;margin-bottom:4px">
            ${trust.toFixed(1)}
          </div>
          <div style="font-size:.6rem;text-transform:uppercase;
                      letter-spacing:.08em;color:${p.sub}">Trust Score</div>
        </div>
        <div style="background:${p.metric};border:1px solid ${p.inner};
                    border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:.95rem;letter-spacing:1px;margin-bottom:4px">
            ${stars}
          </div>
          <div style="font-size:.6rem;text-transform:uppercase;
                      letter-spacing:.08em;color:${p.sub}">Rating</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;padding:0 22px 16px">
        ${skills.map(s=>`
          <span style="background:${p.skill};border:1px solid ${p.inner};
                       border-radius:6px;padding:3px 10px;font-size:.7rem;
                       font-weight:600;color:${p.label}">${s}</span>
        `).join('')}
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;
                  padding:14px 22px 20px;border-top:1px solid ${p.inner}">
        <div style="font-family:monospace;line-height:1.65">
          <span style="font-size:.58rem;letter-spacing:.1em;color:${p.sub}">
            CERTIFICATE ID
          </span><br>
          <strong style="color:${p.label};font-size:.72rem">${verId}</strong><br>
          <span style="font-size:.62rem;color:${p.sub}">
            Issued ${issued} · GPS-authenticated
          </span>
        </div>
      </div>
    </div>`;
  certStrip.style.display = '';
}
  // ── Action buttons ──
  const overlay  = document.getElementById('wp-overlay');
  const jobId    = overlay.dataset.jobId;
  const jobTitle = overlay.dataset.jobTitle;

  document.getElementById('wp-chat-btn').onclick = () => {
    closeWorkerProfileModal();
    // Open chat with this worker
    if (typeof openChat === 'function') {
      openChat(workerId, data.name, jobId, jobTitle);
    }
  };

  document.getElementById('wp-hire-btn').onclick = () => {
    if (!jobId) {
      Swal.fire({
        title: 'Select a job first',
        text:  'Open a job and hire from there.',
        icon:  'info',
        confirmButtonColor: '#E85C00',
        ...swalTheme?.() || {}
      });
      return;
    }
    closeWorkerProfileModal();
    assignWorker(jobId, workerId, data.name);
  };
}

/* ── Skeleton while loading ── */
function showWPSkeleton() {
  const avatarEl = document.getElementById('wp-avatar');
  avatarEl.style.backgroundImage = '';
  avatarEl.textContent = '';
  avatarEl.classList.add('wp-skeleton');

  document.getElementById('wp-name').innerHTML  =
    '<span class="wp-skeleton" style="width:140px;height:18px;display:inline-block;border-radius:6px"></span>';
  document.getElementById('wp-trade').textContent = '';
  document.getElementById('wp-meta').innerHTML  =
    '<span class="wp-skeleton" style="width:100px;height:12px;display:inline-block;border-radius:4px"></span>';

  ['wp-jobs','wp-rating','wp-reviews','wp-pass-rate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML =
      '<span class="wp-skeleton" style="width:32px;height:20px;display:inline-block;border-radius:4px"></span>';
  });

  document.getElementById('wp-skills-section').style.display  = 'none';
  document.getElementById('wp-ratings-section').style.display = 'none';
  document.getElementById('wp-media-section').style.display   = 'none';
  document.getElementById('wp-empty').style.display           = 'none';
}

/* ── Close ── */
function closeWorkerProfileModal() {
  document.getElementById('wp-overlay')?.classList.remove('is-open');
  // Clean up avatar skeleton class
  document.getElementById('wp-avatar')?.classList.remove('wp-skeleton');
}

/* ── Like toggle ── */
async function wpToggleLike(mediaId, btn) {
  try {
    const res  = await fetch(`${FLASK}/api/media/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ media_id: mediaId, user_id: user.id })
    });
    const data = await res.json();
    if (data.success) {
      btn.classList.toggle('liked', data.liked);
      // Update count in button text (keep icon, update number)
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', data.liked ? 'currentColor' : 'none');
      }
      btn.lastChild.textContent = ' ' + data.count;
    }
  } catch (e) { console.error('[wp-like]', e); }
}

  /* ── Comments (placeholder — expand as needed) ── */
  function wpViewComments(mediaId) {
    Swal.fire({
      title:   'Comments',
      html:    `<p style="color:var(--text-3);font-size:.85rem">Loading comments…</p>`,
      showConfirmButton: false,
      showCloseButton:   true,
      ...swalTheme?.() || {}
    });
    // Load comments via /api/media/comments?media_id=...
    fetch(`${FLASK}/api/media/comments?media_id=${mediaId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const comments = data.comments || [];
        Swal.update({
          html: comments.length
            ? comments.map(c => `
                <div style="text-align:left;padding:8px 0;border-bottom:1px solid var(--border)">
                  <strong style="font-size:.82rem">${c.user_name || 'User'}</strong>
                  <p style="font-size:.8rem;color:var(--text-2);margin-top:2px">${c.body}</p>
                </div>`).join('')
            : '<p style="color:var(--text-3);font-size:.85rem">No comments yet.</p>'
        });
      }).catch(() => {});
  }

  

  /* ── Init event listeners ── */
  function initWorkerProfileModal() {
    const overlay = document.getElementById('wp-overlay');
    const closeBtn = document.getElementById('wp-close');

    // Close on overlay click
    overlay?.addEventListener('click', e => {
      if (e.target === overlay) closeWorkerProfileModal();
    });

    // Close on button
    closeBtn?.addEventListener('click', closeWorkerProfileModal);

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay?.classList.contains('is-open')) {
        closeWorkerProfileModal();
      }
    });
  }

// ── Expose to window ──
window.openWorkerProfileModal  = openWorkerProfileModal;
window.closeWorkerProfileModal = closeWorkerProfileModal;
window.wpToggleLike            = wpToggleLike;
window.wpViewComments          = wpViewComments;

// Init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkerProfileModal);
} else {
  initWorkerProfileModal();
}

  /* ══════════════════════════════════════════════
     DELETE JOB
  ══════════════════════════════════════════════ */
  async function deleteJob(jobId) {
    const result = await Swal.fire({
      title: 'Delete this job?', text: 'This cannot be undone. Only open jobs can be deleted.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#DC2626', cancelButtonColor: '#9A968E',
      confirmButtonText: 'Delete', cancelButtonText: 'Cancel', ...swalTheme()
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${FLASK}/api/client/delete-job`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ job_id: jobId, user_id: user.id })
      });
      const data = await res.json();
      if (data.success) {
        allJobs = allJobs.filter(j => j.id !== jobId);
        renderStats(allJobs); renderRecentJobs(allJobs.slice(0, 5)); renderJobsList(allJobs); renderTrackList(allJobs);
        Swal.fire({ title: 'Deleted', text: 'Job has been removed.', icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
      } else {
        Swal.fire({ title: 'Cannot delete', text: data.message, icon: 'error', ...swalTheme() });
      }
    } catch (err) {
      console.error('Delete error:', err);
      Swal.fire({ title: 'Network error', text: 'Could not reach the server.', icon: 'error', ...swalTheme() });
    }
  }


  /* ══════════════════════════════════════════════
     BARGAINS
  ══════════════════════════════════════════════ */
  async function loadBargains() {
    try {
      const res = await fetch(`${FLASK}/api/client/bargains?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const bargains = data.bargains || [];
      renderBargainBadge(bargains.length);
      renderBargainsList(bargains);
    } catch (e) { console.error('loadBargains:', e); }
  }

  function renderBargainBadge(count) {
    const badge = document.getElementById('bargain-badge');
    if (!badge) return;
    badge.textContent = count > 0 ? count : '';
    badge.classList.toggle('is-visible', count > 0);
  }

  function renderBargainsList(bargains) {
  const el = document.getElementById('bargains-list');
  if (!el) return;
  if (!bargains.length) { el.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('handshake')}</div><p>No pending offers.</p></div>`; return; }
  el.innerHTML = bargains.map(b => `
    <div class="bargain-card">
      <p class="bargain-card__title">${b.job_title}</p>
      <p class="bargain-card__price">Original: <strong>₦${Number(b.original_amount).toLocaleString()}</strong> &rarr; Worker offers: <strong>₦${Number(b.proposed_price).toLocaleString()}</strong></p>
      <p class="bargain-card__worker">${ic('user')} ${b.worker_name} · ${Number(b.worker_trust).toFixed(1)} trust · ${b.worker_jobs} jobs</p>
      ${b.message ? `<p class="bargain-card__msg">"${b.message}"</p>` : ''}
      <div class="bargain-card__actions">
        <button class="btn btn--success" onclick="respondBargain(${b.job_id}, 'accept', ${b.id})">${ic('check')} Accept ₦${Number(b.proposed_price).toLocaleString()}</button>
        <button class="btn btn--danger" onclick="rejectBargainWithPrompt(${b.job_id}, ${b.id})">${ic('x')} Reject</button>
      </div>
    </div>`).join('');
}

  async function respondBargain(jobId, action, bargainId, suggestedPrice) {
  const res = await fetch(`${FLASK}/api/client/respond-bargain`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ bargain_id: bargainId, user_id: user.id, action, suggested_price: suggestedPrice })
  });
  const data = await res.json();
  if (data.success) {
    await loadJobs(); await loadBargains();
    Swal.fire({ title: action === 'accept' ? 'Accepted' : 'Rejected', icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
  } else {
    Swal.fire({ title: 'Error', text: data.message, icon: 'error', ...swalTheme() });
  }
}

async function rejectBargainWithPrompt(jobId, bargainId) {
  const { value: suggested, isConfirmed } = await Swal.fire({
    title: 'Reject this offer?',
    text: 'Optionally suggest a price the worker should try instead.',
    input: 'number',
    inputPlaceholder: 'e.g. 15000 (optional)',
    showCancelButton: true,
    confirmButtonText: 'Reject',
    confirmButtonColor: '#DC2626',
    cancelButtonColor: '#9A968E',
    ...swalTheme()
  });
  if (!isConfirmed) return;
  await respondBargain(jobId, 'reject', bargainId, suggested || null);
}
  /* ══════════════════════════════════════════════
     ARTISAN WORK SUBMISSION REVIEW (approve payment / dispute)
  ══════════════════════════════════════════════ */
  async function reviewSubmission(jobId, action) {
    let reason = '';

    if (action === 'dispute') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'What went wrong?',
        input: 'textarea',
        inputPlaceholder: 'Briefly describe the issue with the submitted work…',
        showCancelButton: true,
        confirmButtonText: 'Submit Dispute',
        confirmButtonColor: '#E85C00',
        ...swalTheme()
      });
      if (!isConfirmed) return; // user backed out
      reason = (text || '').trim();
    } else {
      const { isConfirmed } = await Swal.fire({
        title: 'Release payment?',
        text: 'This will send the escrowed funds to the artisan. This cannot be undone.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, release payment',
        confirmButtonColor: '#E85C00',
        ...swalTheme()
      });
      if (!isConfirmed) return;
    }

    try {
      const res = await fetch(`${FLASK}/api/client/review-job`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ job_id: jobId, user_id: user.id, action, reason })
      });
      const data = await res.json();

      if (data.success) {
        modalOverlay.classList.remove('is-open');
        await loadJobs();
        Swal.fire({
          title: action === 'approve' ? 'Payment released' : 'Dispute submitted',
          text: data.message,
          icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme()
        });
      } else {
        Swal.fire({ title: data.already_resolved ? 'Already resolved' : 'Error', text: data.message, icon: data.already_resolved ? 'info' : 'error', ...swalTheme() });
        if (data.already_resolved) { modalOverlay.classList.remove('is-open'); await loadJobs(); }
      }
    } catch (e) {
      Swal.fire({ title: 'Network error', text: 'Could not reach the server. Please try again.', icon: 'error', ...swalTheme() });
    }
  }

  async function loadReviewSubmissions() {
    try {
      const res = await fetch(`${FLASK}/api/client/pending-review-jobs?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      renderReviewSubmissionsBanner(data.jobs || []);
    } catch (e) { console.error('loadReviewSubmissions:', e); }
  }

  function renderReviewSubmissionsBanner(jobs) {
    const container = document.getElementById('review-submissions-banner');
    if (!container) return;
    if (!jobs.length) { container.innerHTML = ''; container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML = jobs.map(j => {
      const initials = (j.worker_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      return `
        <div class="applicant-card">
          <div class="applicant-card__avatar">${initials}</div>
          <div class="applicant-card__body">
            <p class="applicant-card__label">${ic('alert')} Work submitted — awaiting your review</p>
            <p class="applicant-card__name">${j.worker_name || 'Worker'}</p>
            <p class="applicant-card__meta">₦${Number(j.amount).toLocaleString()} · ${j.distance_meters != null ? Math.round(j.distance_meters) + 'm from site' : ''}</p>
            <p class="applicant-card__job">Job: <strong>${j.title}</strong></p>
          </div>
          <div class="applicant-card__actions">
            <button class="btn btn--secondary" onclick="openJobModalById(${j.id})">${ic('user')} Review</button>
            <button class="btn btn--success" onclick="reviewSubmission(${j.id}, 'approve')">${ic('check')} Approve</button>
            <button class="btn btn--danger" onclick="reviewSubmission(${j.id}, 'dispute')">${ic('x')} Dispute</button>
          </div>
        </div>`;
    }).join('');
  }

  // Banner buttons only have the job id (not the full job object) — look it
  // up from what we already loaded and open the normal detail modal.
  function openJobModalById(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (job) openJobModal(job);
  }

  /* ══════════════════════════════════════════════
     WORKER APPLICATION REVIEW
  ══════════════════════════════════════════════ */
  async function reviewWorker(jobId, workerId, action) {
    const res = await fetch(`${FLASK}/api/client/review-worker`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ job_id: jobId, user_id: user.id, worker_id: workerId, action })
    });
    const data = await res.json();
    if (data.success) {
      modalOverlay.classList.remove('is-open');
      await loadJobs(); await loadPendingWorkers();
      Swal.fire({
        title: action === 'assign' ? 'Worker assigned' : 'Worker declined',
        text: action === 'assign' ? 'Worker has been assigned and can now complete the job.' : 'Worker declined. They can no longer complete this job.',
        icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme()
      });
    } else {
      Swal.fire({ title: 'Error', text: data.message, icon: 'error', ...swalTheme() });
    }
  }

  async function loadPendingWorkers() {
    try {
      const res = await fetch(`${FLASK}/api/client/job-applicants?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      renderPendingWorkersBanner(data.applicants || []);
    } catch (e) { console.error('loadPendingWorkers:', e); }
  }

  function renderPendingWorkersBanner(applicants) {
    const container = document.getElementById('pending-workers-banner');
    if (!container) return;
    if (!applicants.length) { container.innerHTML = ''; container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML = applicants.map(p => {
      const initials = p.worker_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      return `
        <div class="applicant-card">
          <div class="applicant-card__avatar">${initials}</div>
          <div class="applicant-card__body">
            <p class="applicant-card__label">Worker applied for your job</p>
            <p class="applicant-card__name">${p.worker_name}</p>
            <p class="applicant-card__meta">${p.worker_trade || 'General'} · ${Number(p.worker_trust).toFixed(1)} trust · ${p.worker_jobs} jobs done</p>
            <p class="applicant-card__job">For: <strong>${p.title}</strong></p>
          </div>
          <div class="applicant-card__actions">
            <button class="btn btn--secondary" onclick="openWorkerPublicProfile(${p.worker_id})">${ic('user')} View</button>
            <button class="btn btn--success" onclick="reviewWorker(${p.job_id}, ${p.worker_id}, 'assign')">${ic('check')} Assign</button>
            <button class="btn btn--danger" onclick="reviewWorker(${p.job_id}, ${p.worker_id}, 'decline')">${ic('x')} Decline</button>
          </div>
        </div>`;
    }).join('');
  }

let conversationsPollInterval = null;

async function loadConversations() {
  try {
    const res = await fetch(`${FLASK}/api/chat/conversations?user_id=${user.id}`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    renderConversationsList(data.conversations || []);
    updateMessagesBadge(data.conversations || []);
  } catch (e) { console.error('loadConversations:', e); }
}

function updateMessagesBadge(conversations) {
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
  const badge = document.getElementById('messages-badge');
  if (!badge) return;
  badge.textContent = totalUnread > 0 ? totalUnread : '';
  badge.classList.toggle('is-visible', totalUnread > 0);
}

function conversationRowHTML(c) {
  const initials = (c.other_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const timeAgo = relativeTime ? relativeTime(c.last_at) : new Date(c.last_at).toLocaleDateString();
  const preview = c.last_from_me ? `You: ${c.last_message}` : c.last_message;
  return `
    <div class="job-card" 
     data-job-id="${c.job_id}" 
     data-other-id="${c.other_id}"
     data-other-name="${(c.other_name || '').replace(/"/g, '&quot;')}"
     data-job-title="${(c.job_title || '').replace(/"/g, '&quot;')}"
     style="cursor:pointer">
      <div class="job-card__icon" style="border-radius:50%">${initials}</div>
      <div class="job-card__info">
        <p class="job-card__title">${c.other_name} <span style="font-weight:400;color:var(--text-3);font-size:.75rem">· ${c.job_title}</span></p>
        <div class="job-card__meta">
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">${preview}</span>
        </div>
      </div>
      <div class="job-card__right">
        <span style="font-size:.72rem;color:var(--text-3)">${timeAgo}</span>
        ${c.unread_count > 0 ? `<span class="nav-item__badge is-visible" style="position:static">${c.unread_count}</span>` : ''}
      </div>
    </div>`;
}

function renderConversationsList(conversations) {
  const el = document.getElementById('conversations-list');
  if (!el) return;
  if (!conversations.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('comment')}</div><p>No conversations yet.</p></div>`;
    return;
  }
  el.innerHTML = conversations.map(conversationRowHTML).join('');
  el.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => {
  openChatThread(
    parseInt(card.dataset.jobId),
    parseInt(card.dataset.otherId),
    card.dataset.otherName  || '',
    card.dataset.jobTitle   || ''
  );
});
  });
}

function openChatThread(jobId, otherId, otherName, jobTitle) {
  // Pass job context through to openChat
  openChat(otherId, otherName, jobId, jobTitle);
}
  /* ══════════════════════════════════════════════
     DEMO PAYMENT VERIFY/* ══ CLIENT PROFILE ══════════════════════════════ */
function renderClientProfile() {
  if (!user) return;
  const name    = user.name  || '—';
  const email   = user.email || '—';
  const phone   = user.phone || '';
  const bio     = user.bio   || '';
  const initial = name[0]?.toUpperCase() || 'C';

  // Avatar
  const avatarImg     = document.getElementById('profile-avatar-img');
  const avatarInitial = document.getElementById('profile-avatar-initial');
  const serverPhoto = user.profile_photo_path ? `${FLASK}/${user.profile_photo_path}` : null;
  const localPhoto    = localStorage.getItem(`sc-avatar-${user.id}`);
  const photoSrc      = serverPhoto || localPhoto;

  if (avatarImg) {
    if (photoSrc) {
      avatarImg.style.backgroundImage    = `url(${photoSrc})`;
      avatarImg.style.backgroundSize     = 'cover';
      avatarImg.style.backgroundPosition = 'center';
      if (avatarInitial) avatarInitial.style.display = 'none';
    } else {
      avatarImg.style.backgroundImage = '';
      if (avatarInitial) { avatarInitial.textContent = initial; avatarInitial.style.display = ''; }
    }
  }

  document.getElementById('profile-name').textContent  = name;
  document.getElementById('profile-email').textContent = email;

  const phoneEl = document.getElementById('profile-phone');
  if (phoneEl) { phoneEl.textContent = phone ? '📞 ' + phone : ''; phoneEl.style.display = phone ? '' : 'none'; }

  const bioEl = document.getElementById('profile-bio');
  if (bioEl) { bioEl.textContent = bio; bioEl.style.display = bio ? '' : 'none'; }

  // Stats from allJobs
  const total     = allJobs.length;
  const completed = allJobs.filter(j => ['verified','paid'].includes(j.status)).length;
  const spent     = allJobs.filter(j => j.status === 'paid').reduce((s,j) => s + Number(j.amount||0), 0);
  const escrow    = allJobs.filter(j => ['open','assigned','pending_verification'].includes(j.status)).reduce((s,j) => s + Number(j.amount||0), 0);

  const el = id => document.getElementById(id);
  if (el('profile-jobs-posted')) el('profile-jobs-posted').textContent = total;
  if (el('cp-total'))            el('cp-total').textContent            = total;
  if (el('cp-completed'))        el('cp-completed').textContent        = completed;
  if (el('cp-spent'))            el('cp-spent').textContent            = '₦' + spent.toLocaleString();
  if (el('cp-escrow'))           el('cp-escrow').textContent           = '₦' + escrow.toLocaleString();
}

window.triggerAvatarUpload = function () {
  document.getElementById('avatar-file-input')?.click();
};

window.handleAvatarUpload = async function (e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl   = ev.target.result;
    const avatarImg = document.getElementById('profile-avatar-img');
    const initial   = document.getElementById('profile-avatar-initial');
    if (avatarImg) {
      avatarImg.style.backgroundImage    = `url(${dataUrl})`;
      avatarImg.style.backgroundSize     = 'cover';
      avatarImg.style.backgroundPosition = 'center';
    }
    if (initial) initial.style.display = 'none';
    localStorage.setItem(`sc-avatar-${user.id}`, dataUrl);
  };
  reader.readAsDataURL(file);

  try {
    const fd = new FormData();
    fd.append('user_id', user.id);
    fd.append('photo',   file, file.name || 'avatar.jpg');
    const res  = await fetch(`${FLASK}/api/worker/upload-avatar`, { method:'POST', body:fd, credentials:'include' });
    const data = await res.json();
    if (data.success) {
      user.profile_photo = data.path;
      localStorage.setItem('userData', JSON.stringify(user));
      Swal.fire({ title:'Photo saved!', icon:'success', timer:1400, showConfirmButton:false, ...swalTheme() });
    }
  } catch {
    Swal.fire({ title:'Saved locally only', text:"Couldn't sync to server.", icon:'warning', confirmButtonColor:'#E85C00', ...swalTheme() });
  }
};

window.openEditProfileModal = async function () {
  const { value: formValues } = await Swal.fire({
    title: 'Edit Profile',
    html: `
      <input id="ep-phone" class="field__input" placeholder="Phone (e.g. 08012345678)" value="${user.phone||''}" style="width:100%;margin-bottom:10px">
      <textarea id="ep-bio" class="field__input field__input--ta" rows="3" placeholder="Short bio…" style="width:100%;margin-bottom:10px">${user.bio||''}</textarea>`,
    focusConfirm: false, showCancelButton: true,
    confirmButtonText:'Save Changes', confirmButtonColor:'#E85C00', cancelButtonColor:'#9A968E',
    ...swalTheme(),
    preConfirm: () => ({
      phone: document.getElementById('ep-phone').value.trim(),
      bio:   document.getElementById('ep-bio').value.trim(),
    })
  });
  if (!formValues) return;

  try {
    const res  = await fetch(`${FLASK}/api/worker/update-profile`, {
      method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ user_id:user.id, ...formValues })
    });
    const data = await res.json();
    if (data.success) {
      Object.assign(user, formValues);
      localStorage.setItem('userData', JSON.stringify(user));
      renderClientProfile();
      Swal.fire({ title:'Profile updated', icon:'success', timer:1500, showConfirmButton:false, ...swalTheme() });
    } else {
      // Save locally anyway
      Object.assign(user, formValues);
      localStorage.setItem('userData', JSON.stringify(user));
      renderClientProfile();
      Swal.fire({ title:'Saved locally', icon:'info', timer:1800, showConfirmButton:false, ...swalTheme() });
    }
  } catch {
    Object.assign(user, formValues);
    localStorage.setItem('userData', JSON.stringify(user));
    renderClientProfile();
    Swal.fire({ title:'Saved locally', icon:'info', timer:1800, showConfirmButton:false, ...swalTheme() });
  }
};
 
  window.verifyPaymentDemo = async function (jobId) {
    const res = await fetch(`${FLASK}/api/dev/simulate-payment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ job_id: jobId })
    });
    const data = await res.json();
    if (data.success) {
      modalOverlay.classList.remove('is-open');
      Swal.fire({ title: 'Payment verified', text: data.message, icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() })
        .then(() => window.location.reload());
    } else {
      Swal.fire({ title: 'Verification failed', text: data.error || 'Unknown error', icon: 'error', ...swalTheme() });
    }
  };

let currentChatJobId = null;
let currentChatOtherId = null;
let chatPollInterval = null;
let currentChatOtherName = '';
let currentChatJobTitle  = '';

async function openChatThread(jobId, otherId, otherName, jobTitle) {
  currentChatJobId    = jobId;
  currentChatOtherId  = otherId;
  currentChatOtherName = otherName || '';
  currentChatJobTitle  = jobTitle  || '';

  document.getElementById('chat-modal-overlay').classList.add('is-open');
  document.getElementById('chat-messages').innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:.8rem">Loading…</div>`;

  document.getElementById('chat-send-offer-btn').style.display = 
  (user.role === 'client' || window.SC_ACTIVE_ROLE === 'client') ? '' : 'none';

  await loadChatHeader(otherId);
  await loadChatMessages();

  clearInterval(chatPollInterval);
  chatPollInterval = setInterval(loadChatMessages, 5000);
}

function closeChatThread() {
  document.getElementById('chat-modal-overlay').classList.remove('is-open');
  clearInterval(chatPollInterval);
  chatPollInterval = null;
  currentChatJobId = null;
  currentChatOtherId = null;
}

document.getElementById('chat-modal-close')?.addEventListener('click', closeChatThread);
document.getElementById('chat-modal-overlay')?.addEventListener('click', e => {
  if (e.target.id === 'chat-modal-overlay') closeChatThread();
});

async function loadChatHeader(otherId) {
  try {
    const res = await fetch(`${FLASK}/api/user-status?user_id=${otherId}`, { credentials: 'include' });
    if (!res.ok) return;
    const u = await res.json();

    const avatarEl = document.getElementById('chat-header-avatar');
    const initials = (u.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    avatarEl.textContent = initials;
    avatarEl.onclick = null; // reset before rebinding

    document.getElementById('chat-header-name').textContent = u.name || 'User';
    document.getElementById('chat-header-status').textContent = u.online
      ? '🟢 Online'
      : (u.last_seen_at ? `Last seen ${relativeTime(u.last_seen_at)}` : 'Offline');

    // Clicking the header opens the right kind of public profile,
    // depending on whether the other person is a worker or a client.
    document.getElementById('chat-header').onclick = () => {
      if (u.role === 'worker') {
        openWorkerPublicProfile(otherId);
      } else {
        openClientPublicProfile(otherId);
      }
    };
  } catch (e) { console.error('loadChatHeader:', e); }
}

async function loadChatMessages() {
  if (!currentChatJobId || !currentChatOtherId) return;
  try {
    const res = await fetch(
      `${FLASK}/api/chat/thread?job_id=${currentChatJobId}&user_id=${user.id}&other_id=${currentChatOtherId}`,
      { credentials: 'include' }
    );
    if (!res.ok) return;
    const data = await res.json();
    renderChatMessages(data.messages || []);
  } catch (e) { console.error('loadChatMessages:', e); }
}

function renderChatMessages(messages) {
  const el = document.getElementById('chat-messages');
  const wasAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;

  if (!messages.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px 10px;color:var(--text-3);font-size:.8rem">No messages yet — say hello!</div>`;
    return;
  }

  let lastDate = null;
  let html = '';
  messages.forEach(m => {
    const msgDate = new Date(m.created_at).toDateString();
    if (msgDate !== lastDate) {
      const label = msgDate === new Date().toDateString() ? 'Today' : new Date(m.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
      html += `<div class="chat-date-divider"><span>${label}</span></div>`;
      lastDate = msgDate;
    }
    const mine = m.sender_id === user.id;
    const time = new Date(m.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    html += `<div class="chat-bubble ${mine ? 'chat-bubble--mine' : 'chat-bubble--theirs'}">
      ${m.body}
      <span class="chat-bubble__time">${time}</span>
    </div>`;
  });

  el.innerHTML = html;
  if (wasAtBottom) el.scrollTop = el.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const body = input.value.trim();
  if (!body || !currentChatJobId || !currentChatOtherId) return;
  input.value = '';

  try {
    await fetch(`${FLASK}/api/chat/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ job_id: currentChatJobId, sender_id: user.id, recipient_id: currentChatOtherId, body })
    });
    await loadChatMessages();
  } catch (e) {
    console.error('sendChatMessage:', e);
    Swal.fire({ title: 'Message failed to send', icon: 'error', ...swalTheme() });
  }
}

document.getElementById('chat-send-btn')?.addEventListener('click', sendChatMessage);
document.getElementById('chat-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });

document.getElementById('chat-send-offer-btn')?.addEventListener('click', async () => {
  if (!currentChatJobId) {
  Swal.fire({
    title: 'No job selected',
    text: 'Open this chat from a specific job to send a price offer.',
    icon: 'info',
    confirmButtonColor: '#E85C00',
    ...swalTheme()
  });
  return;
}

  const { value: price, isConfirmed } = await Swal.fire({
    title: 'Send Final Offer',
    text: 'This sends a formal, trackable price to the worker for this job.',
    input: 'number',
    inputPlaceholder: 'e.g. 15000',
    showCancelButton: true,
    confirmButtonText: 'Send Offer',
    confirmButtonColor: '#E85C00',
    cancelButtonColor: '#9A968E',
    ...swalTheme(),
    inputValidator: (value) => { if (!value || Number(value) < 100) return 'Enter a valid amount (min ₦100).'; }
  });
  if (!isConfirmed || !price) return;

  try {
    const res = await fetch(`${FLASK}/api/client/send-offer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ job_id: currentChatJobId, worker_id: currentChatOtherId, user_id: user.id, amount: Number(price) })
    });
    const data = await res.json();
    if (data.success) {
      Swal.fire({ title: 'Offer sent', text: `₦${Number(price).toLocaleString()} sent to the worker.`, icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
    } else {
      Swal.fire({ title: 'Could not send offer', text: data.message, icon: 'error', ...swalTheme() });
    }
  } catch (e) {
    Swal.fire({ title: 'Network error', icon: 'error', ...swalTheme() });
  }
});

async function openClientPublicProfile(clientId) {
  if (!clientId) return;

  const res = await fetch(`${FLASK}/api/client/public-profile?client_id=${clientId}`, { credentials: 'include' });
  if (!res.ok) { Swal.fire({ title: 'Could not load profile', icon: 'error', ...swalTheme() }); return; }
  const data = await res.json();
  const c = data.client || {};

  const initials = (c.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const color = avatarColor(c.name || 'C');
  const memberSince = c.created_at ? new Date(c.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) : '—';

  workerModalBody.innerHTML = `
    <div style="text-align:center;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:18px">
      <div style="width:60px;height:60px;border-radius:50%;background:${color}18;border:2px solid ${color};color:${color};font-family:var(--font-display);font-size:1.3rem;font-weight:800;display:grid;place-items:center;margin:0 auto 10px">${initials}</div>
      <p style="font-family:var(--font-display);font-size:1.15rem;font-weight:800">${c.name || '—'}</p>
      <p style="font-size:.76rem;color:var(--text-3)">Client · Member since ${memberSince}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="acct-box" style="text-align:center;padding:14px">
        <p style="font-family:var(--font-display);font-size:1.3rem;font-weight:800;color:var(--accent)">${c.total_jobs || 0}</p>
        <p style="font-size:.68rem;color:var(--text-3)">Jobs Posted</p>
      </div>
      <div class="acct-box" style="text-align:center;padding:14px">
        <p style="font-family:var(--font-display);font-size:1.3rem;font-weight:800;color:var(--success)">${c.completed_jobs || 0}</p>
        <p style="font-size:.68rem;color:var(--text-3)">Completed & Paid</p>
      </div>
    </div>
  `;
  workerModalOverlay.classList.add('is-open');
}




  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */
  async function init() {
    const ok = loadUser();
    if (!ok) return;
    await loadJobs();
    await loadBargains();
    await loadPendingWorkers();
    await loadReviewSubmissions();
    setInterval(loadBargains, 30_000);
    setInterval(loadPendingWorkers, 20_000);
    setInterval(loadReviewSubmissions, 20_000);
    setInterval(loadConversations, 15_000);
    setInterval(() => {
  if (!window.USER_ID) return;  // don't fire if user not loaded yet
  fetch(`${FLASK}/api/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: window.USER_ID }),
    credentials: 'include'
  }).catch(() => {});  // silently ignore — UptimeRobot keeps server alive
}, 120000);  
  }
  init();

  // ── Expose to global scope for inline onclick= handlers ──
  window.toggleLikeMedia         = toggleLikeMedia;
  window.openMediaComments       = openMediaComments;
  window.openWorkerPublicProfile = openWorkerPublicProfile;
  window.postJobComment          = postJobComment;
  window.selectStar              = selectStar;
  window.submitRating            = submitRating;
  window.copyAccNum              = copyAccNum;
  window.respondBargain          = respondBargain;
  window.reviewWorker            = reviewWorker;
  window.reviewSubmission        = reviewSubmission;
  window.openJobModalById        = openJobModalById;
  
  window.openEditProfileModal = openEditProfileModal;
  window.rejectBargainWithPrompt = rejectBargainWithPrompt;
  window.openChatThread = openChatThread;
  window.openClientPublicProfile = openClientPublicProfile;
})();

/* ══════════════════════════════════════════════════════════════════
   ROLE SWITCH MODULE — injected into same file for simplicity
   Polls for window.FLASK + window.USER_ID set by the IIFE above
══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const WORKER_URL = 'https://skillchain-frontend-omega.vercel.app//Worker_dashboard/index.html';
  const CLIENT_URL = 'https://skillchain-frontend-omega.vercel.app//Client_dashboard/index.html';

  function waitForGlobals(cb, n) {
    n = n || 0;
    if (window.FLASK && window.USER_ID) { cb(); return; }
    if (n > 80) { console.warn('[role-switch] globals never appeared'); return; }
    setTimeout(() => waitForGlobals(cb, n + 1), 150);
  }

  function swalOpts(extra) {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return Object.assign({ background: dark?'#17171A':'#ffffff', color: dark?'#F2F1EE':'#17181B', confirmButtonColor:'#E85C00', cancelButtonColor: dark?'#3a3530':'#9A968E' }, extra);
  }

  function injectBtn(label, icon) {
    document.getElementById('role-switch-btn')?.remove();
    const btn = document.createElement('button');
    btn.id = 'role-switch-btn'; btn.className = 'nav-switch-btn';
    btn.innerHTML = `${icon}<span>${label}</span>`;
    btn.addEventListener('click', onSwitchClick);
    const slot = document.getElementById('nav-switch-slot');
    if (slot) { slot.innerHTML = ''; slot.appendChild(btn); return; }
    const logout = document.getElementById('logout-btn') || document.querySelector('.logout-btn');
    if (logout) logout.parentNode.insertBefore(btn, logout);
  }

  const IC_SWITCH  = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16 3l4 4-4 4M8 21l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 7H4M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const IC_ARTISAN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  async function onSwitchClick() {
    const btn = document.getElementById('role-switch-btn');
    if (btn) { btn.disabled=true; btn.style.opacity='0.55'; }
    try {
      const res    = await fetch(`${window.FLASK}/api/switch-role/status?user_id=${window.USER_ID}`, { credentials:'include' });
      const status = await res.json();
      const target = status.active_role === 'worker' ? 'client' : 'worker';

      if (target === 'worker') {
        if (status.has_worker_profile || status.trade) {
          await doSwitch('worker');
          return;
        }

        const { value: trade, isConfirmed } = await Swal.fire(swalOpts({
          title:'Switch to Artisan Mode',
          html:`<div style="text-align:left;font-size:.9rem;line-height:1.7">
            <p>As an <strong>artisan</strong> you can accept jobs and earn on SkillChain.</p>
            <p style="margin-top:8px;color:var(--text-2)">Select your trade:</p>
            <select id="sw-trade-select" style="width:100%;padding:10px 12px;margin-top:10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:.9rem">
              <option value="">— Select Trade —</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Electrician">Electrician</option>
              <option value="Plumber">Plumber</option>
              <option value="Carpenter">Carpenter</option>
              <option value="Painter">Painter</option>
              <option value="Welder">Welder</option>
              <option value="Tailor">Tailor</option>
              <option value="Mason">Mason</option>
              <option value="HVAC Technician">HVAC Technician</option>
              <option value="Other">Other</option>
            </select>
            <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:rgba(232,92,0,.08);border:1px solid rgba(232,92,0,.2)">
              <p style="color:#E85C00;font-weight:700;font-size:.82rem">✅ Same login — your client profile stays untouched</p>
            </div>
          </div>`,
          confirmButtonText:'Activate Artisan Account',
          cancelButtonText:'Cancel',
          showCancelButton:true,
          icon:null,
          preConfirm: () => {
            const val = document.getElementById('sw-trade-select').value;
            if (!val) { Swal.showValidationMessage('Please select a trade'); return false; }
            return val;
          }
        }));
        if (!isConfirmed || !trade) return;

        const aRes  = await fetch(`${window.FLASK}/api/switch-role/activate-worker`, {
          method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
          body: JSON.stringify({ user_id:window.USER_ID, trade })
        });
        const aData = await aRes.json();
        if (!aData.success) { await Swal.fire(swalOpts({ title:'Error', text:aData.message, icon:'error' })); return; }

        await Swal.fire(swalOpts({ title:'🎉 Artisan profile activated!', text:`Trade: ${trade}. Switching you over now…`, icon:'success', timer:1300, showConfirmButton:false }));
        window.location.href = aData.redirect || WORKER_URL;
        return;
      }

      if (status.has_client_profile) { await doSwitch('client'); return; }

      const { isConfirmed } = await Swal.fire(swalOpts({
        title:'Switch to Client Mode',
        html:`<div style="text-align:left;font-size:.9rem;line-height:1.7">
          <p>As a <strong>client</strong> you can post jobs and hire artisans.</p>
          <p style="margin-top:6px">Your artisan profile stays untouched. Switch back anytime.</p>
          <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:rgba(232,92,0,.08);border:1px solid rgba(232,92,0,.2)">
            <p style="color:#E85C00;font-weight:700;font-size:.82rem">✅ Same login credentials — no new password</p>
          </div></div>`,
        confirmButtonText:'Activate Client Account', cancelButtonText:'Cancel', showCancelButton:true, icon:null,
      }));
      if (!isConfirmed) return;

      const aRes  = await fetch(`${window.FLASK}/api/switch-role/activate-client`, {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ user_id:window.USER_ID })
      });
      const aData = await aRes.json();
      if (!aData.success) { await Swal.fire(swalOpts({ title:'Error', text:aData.message, icon:'error' })); return; }

      await Swal.fire(swalOpts({ title:'🎉 Client account activated!', text:'Switching you over now…', icon:'success', timer:1300, showConfirmButton:false }));
      window.location.href = aData.redirect || CLIENT_URL;

    } catch (err) {
      await Swal.fire(swalOpts({ title:'Something went wrong', text:err.message, icon:'error' }));
    } finally {
      if (btn) { btn.disabled=false; btn.style.opacity=''; }
    }
  }

  async function doSwitch(target) {
    const res  = await fetch(`${window.FLASK}/api/switch-role/switch`, {
      method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ user_id:window.USER_ID, target_role:target })
    });
    const data = await res.json();
    if (!data.success) { await Swal.fire(swalOpts({ title:'Switch failed', text:data.message, icon:'error' })); return; }
    const btn = document.getElementById('role-switch-btn');
    if (btn) btn.innerHTML = `${IC_SWITCH}<span>Switching…</span>`;
    setTimeout(() => { window.location.href = data.redirect; }, 300);
  }

  window.enforceCantAcceptJobs = function (activeRole) {
    if (activeRole !== 'client') return;
    ['.accept-btn','[data-action="accept-job"]','#btn-accept'].forEach(s =>
      document.querySelectorAll(s).forEach(el => {
        el.disabled=true; el.title='Switch to Artisan account to accept jobs';
        el.style.opacity='0.4'; el.style.cursor='not-allowed';
        el.addEventListener('click', async e => {
          e.stopPropagation();
          const { isConfirmed } = await Swal.fire(swalOpts({ title:'Switch to Artisan Mode', text:"You're in client mode. Switch accounts to accept jobs.", icon:'info', confirmButtonText:'Switch Now', showCancelButton:true }));
          if (isConfirmed) onSwitchClick();
        }, true);
      })
    );
  };

  function init() {
    waitForGlobals(async () => {
      try {
        const res  = await fetch(`${window.FLASK}/api/switch-role/me?user_id=${window.USER_ID}`, { credentials:'include' });
        const data = await res.json();
        if (data.error) return;
        if (!data.can_switch_to_client && !data.can_switch_to_worker) return;
        window.SC_ACTIVE_ROLE = data.active_role;
        if (data.active_role === 'worker') {
          if (data.can_switch_to_client) injectBtn('Switch to Client', IC_SWITCH);
        } else {
          if (data.can_switch_to_worker) injectBtn('Switch to Artisan', IC_ARTISAN);
          window.enforceCantAcceptJobs(data.active_role);
        }
      } catch (e) { console.warn('[role-switch] init error:', e); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();