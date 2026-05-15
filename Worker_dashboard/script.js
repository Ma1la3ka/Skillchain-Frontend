(function () {
  'use strict';

  const FLASK       = 'https://skillchain-backend-gce5.onrender.com';
  const LOGIN_PAGE  = '/Login/index.html';
  const SESSION_DUR = 30 * 60 * 1000;

  let allMyJobs  = [];  // jobs assigned to this worker
  let allOpenJobs= [];  // open jobs available
  let activeFilter = 'all';
  let user = null;

  // ── DOM ───────────────────────────────────────────
  const sidebar      = document.getElementById('sidebar');
  const burger       = document.getElementById('burger');
  const navItems     = document.querySelectorAll('.nav-item');
  const views        = document.querySelectorAll('.view');
  const filterBtns   = document.querySelectorAll('.filter-tab');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose   = document.getElementById('modal-close');
  const modalBody    = document.getElementById('modal-body');

  // ── Auth guard ────────────────────────────────────
  window.addEventListener('pageshow', () => {
    const stored = localStorage.getItem('userData');
    if (!stored) { window.location.replace(LOGIN_PAGE); return; }
    const parsed = JSON.parse(stored);
    if (Date.now() - parsed.loginTime > SESSION_DUR) {
      localStorage.removeItem('userData');
      window.location.replace(LOGIN_PAGE);
    }
  });

  // ── Navigation ────────────────────────────────────
  function showView(viewId) {
    views.forEach(v => v.classList.remove('is-active'));
    const el = document.getElementById(`view-${viewId}`);
    if (el) el.classList.add('is-active');
    navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === viewId));
    sidebar.classList.remove('is-open');

    if (viewId === 'find-jobs') loadOpenJobs();
    if (viewId === 'my-jobs')   renderMyJobsList(allMyJobs);
    if (viewId === 'earnings')  renderEarnings();
    if (viewId === 'profile')   renderProfile();
  }

  navItems.forEach(item =>
    item.addEventListener('click', e => { e.preventDefault(); showView(item.dataset.view); })
  );

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]');
    if (t && !t.classList.contains('nav-item')) { e.preventDefault(); showView(t.dataset.view); }
  });

  burger?.addEventListener('click', () => sidebar.classList.toggle('is-open'));

  // ── Logout ────────────────────────────────────────
  document.getElementById('logout-btn')?.addEventListener('click', e => {
    e.preventDefault();
    Swal.fire({
      title: 'Log out?', text: 'You will need to log back in.',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#e85c00', cancelButtonColor: '#333',
      confirmButtonText: 'Yes, log out', cancelButtonText: 'Stay here',
      background: '#181614', color: '#f0ede8'
    }).then(r => {
      if (r.isConfirmed) {
        localStorage.removeItem('userData');
        fetch(`${FLASK}/logout-api`, { method: 'POST', credentials: 'include' })
          .finally(() => window.location.replace(LOGIN_PAGE));
      }
    });
  });

  // ── Load user from localStorage ───────────────────
  function loadUser() {
    const stored = localStorage.getItem('userData');
    if (!stored) { window.location.replace(LOGIN_PAGE); return false; }
    user = JSON.parse(stored);
    if (Date.now() - user.loginTime > SESSION_DUR) {
      localStorage.removeItem('userData');
      window.location.replace(LOGIN_PAGE);
      return false;
    }
    // Refresh session timestamp
    user.loginTime = Date.now();
    localStorage.setItem('userData', JSON.stringify(user));

    // Populate UI with stored name immediately
    const initial = user.name ? user.name[0].toUpperCase() : 'W';
    document.getElementById('welcome-name').textContent  = `Welcome, ${user.name}`;
    document.getElementById('nav-name').textContent      = user.name;
    document.getElementById('nav-avatar').textContent    = initial;
    document.getElementById('topbar-avatar').textContent = initial;
    return true;
  }

  // ── Fetch full profile from API ───────────────────
  async function loadProfile() {
    try {
      const res  = await fetch(`${FLASK}/api/worker/profile?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      user.profile = data;

      renderTrustHero(data.trust_score, data.jobs_completed);
      renderWalletCard(data);
      renderStats(data);
    } catch (e) {
      console.error('loadProfile:', e);
      // Still render something so the page isn't blank
      renderTrustHero(user.trust_score || 0, user.jobs_completed || 0);
    }
  }

  // ── Fetch worker's assigned jobs ──────────────────
  async function loadMyJobs() {
    try {
      const res  = await fetch(`${FLASK}/api/worker/jobs?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const newJobs = data.jobs || [];

      // Check if any jobs were removed (client deleted them)
      const removedJobs = allMyJobs.filter(
        old => !newJobs.find(n => n.id === old.id)
      );

      allMyJobs = newJobs;

      // If a pending_review job disappeared, notify the worker
      removedJobs.forEach(removed => {
        if (removed.status === 'pending_review') {
          Swal.fire({
            title: '⚠️ Job Removed',
            text:  `The job "${removed.title}" was deleted by the client.`,
            icon:  'warning',
            confirmButtonColor: '#e85c00',
            background: '#181614', color: '#f0ede8',
            timer: 5000
          });
        }
      });

      renderRecentJobs(allMyJobs.slice(0, 5));
      renderMyJobsList(allMyJobs);

    } catch (e) { console.error('loadMyJobs:', e); }
}

  // ── Fetch open jobs ───────────────────────────────
  async function loadOpenJobs() {
    const query = (document.getElementById('job-search-text')?.value || '').trim();
    const trade = document.getElementById('job-search-trade')?.value || '';
    const list  = document.getElementById('open-jobs-list');

    list.innerHTML = `<div class="skeleton-list">
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card"></div>
    </div>`;

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
      list.innerHTML = `<div class="empty-state"><span>😕</span><p>Could not load jobs. Is Flask running?</p></div>`;
    }
  }

  document.getElementById('btn-search-jobs')?.addEventListener('click', loadOpenJobs);
  document.getElementById('job-search-text')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loadOpenJobs();
  });
  document.getElementById('job-search-trade')?.addEventListener('change', loadOpenJobs);

  // ═══════════════════════════════════════════════════
  // RENDER helpers
  // ═══════════════════════════════════════════════════
  const TRADE_ICONS = {
    Mechanic:'🔧', Electrician:'⚡', Plumber:'🔩', Carpenter:'🪚',
    Painter:'🖌️', Welder:'🔥', Tailor:'🧵', Mason:'🧱',
    'HVAC Technician':'❄️', Other:'🛠️'
  };

function statusBadge(status) {
  const labels = {
    open: 'Open',
    pending_review: 'Awaiting Approval',
    assigned: 'Assigned',
    pending_verification: 'Pending',
    verified: 'Verified',
    paid: 'Paid',
    disputed: 'Disputed'
  };
  return `<span class="badge badge--${status}">${labels[status] || status}</span>`;
}

  // ── Trust Hero ────────────────────────────────────
  function renderTrustHero(score, jobsDone) {
    score = parseFloat(score) || 0;
    const pct = Math.round((score / 5) * 100);

    document.getElementById('trust-score-val').textContent = score.toFixed(1);
    document.getElementById('trust-bar-label').textContent = `${jobsDone || 0} verified jobs`;
    document.getElementById('trust-ring-pct').textContent  = `${pct}%`;

    // Animate bar and ring after paint
    requestAnimationFrame(() => {
      document.getElementById('trust-bar-fill').style.width = `${pct}%`;
      // SVG ring: circumference = 2π×34 ≈ 213.6
      const offset = 213.6 - (213.6 * pct / 100);
      document.getElementById('trust-ring-circle').style.strokeDashoffset = offset;
    });
  }

  // ── Squad Wallet ──────────────────────────────────
  function renderWalletCard(profile) {
    const card = document.getElementById('wallet-card');
    if (!profile.squad_account_number) return;
    document.getElementById('wallet-num').textContent  = profile.squad_account_number;
    document.getElementById('wallet-bank').textContent = profile.squad_bank_name || 'Squad Sandbox Bank';
    card.style.display = 'block';
  }

  // ── Stats ─────────────────────────────────────────
  function renderStats(profile) {
    const done    = allMyJobs.filter(j => ['verified','paid'].includes(j.status)).length;
    const active  = allMyJobs.filter(j => ['assigned','pending_review','pending_verification'].includes(j.status)).length;
    const verified= allMyJobs.filter(j => ['verified','paid'].includes(j.status)).length;

    // 🧮 Calculate total earned from paid jobs
    const totalEarned = allMyJobs.filter(j => j.status === 'paid').reduce((s,j) => s + parseFloat(j.amount), 0);
    
    // 🧮 Grab total withdrawn from the profile, default to 0
    const withdrawn = parseFloat(profile.total_withdrawn || 0);
    
    // 🧮 The final math!
    const availableBalance = totalEarned - withdrawn;

    document.getElementById('stat-done').textContent     = profile.jobs_completed ?? done;
    document.getElementById('stat-active').textContent   = active;
    document.getElementById('stat-verified').textContent = profile.jobs_completed ?? verified;
    
    // Show the actual available balance, not lifetime earnings
    document.getElementById('stat-earned').textContent   = '₦' + availableBalance.toLocaleString(); 
  }

  // ── Recent jobs (overview tab) ────────────────────
  function renderRecentJobs(jobs) {
    const el    = document.getElementById('recent-jobs-list');
    const empty = document.getElementById('recent-empty');
    if (!jobs.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    el.innerHTML = jobs.map(j => myJobCardHTML(j)).join('');
    attachMyJobListeners(el);
  }

  // ── My Jobs list (my-jobs tab) ────────────────────
  function renderMyJobsList(jobs) {
    const filtered = activeFilter === 'all' ? jobs
      : jobs.filter(j => j.status === activeFilter);
    const el = document.getElementById('my-jobs-list');
    el.innerHTML = filtered.length
      ? filtered.map(j => myJobCardHTML(j)).join('')
      : `<div class="empty-state"><span>📭</span><p>No ${activeFilter === 'all' ? '' : activeFilter} jobs.</p></div>`;
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

  function myJobCardHTML(job) {
    const icon = TRADE_ICONS[job.trade] || '🛠️';
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' });
    let rightBtn = '';
if (job.status === 'assigned') {
  rightBtn = `<button class="complete-btn" data-job-id="${job.id}">Complete →</button>`;
} else if (job.status === 'pending_review') {
  rightBtn = `<span style="font-size:.75rem;color:#f59e0b;font-weight:600">⏳ Awaiting Approval</span>`;
}

    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-card__icon">${icon}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">
            ${statusBadge(job.status)}
            <span>📍 ${job.site_address || '—'}</span>
            <span>📅 ${date}</span>
          </div>
        </div>
        <div class="job-card__right">
          <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
          ${rightBtn}
        </div>
      </div>`;
  }

  function attachMyJobListeners(container) {
    // Click card → open modal
    container.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.complete-btn')) return; // handled below
        const job = allMyJobs.find(j => j.id === parseInt(card.dataset.jobId));
        if (job) openMyJobModal(job);
      });
    });
    // Click Complete button directly
    container.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const job = allMyJobs.find(j => j.id === parseInt(btn.dataset.jobId));
        if (job) openMyJobModal(job);
      });
    });
  }



  function getCertTier(jobsDone, avgRating) {
  const score = (jobsDone || 0) + ((avgRating || 0) * 4);
  if (score >= 40) return 'gold';
  if (score >= 15) return 'silver';
  return 'bronze';
}
 
function getTierLabel(tier) {
  return { bronze: '🥉 BRONZE CERTIFIED', silver: '🥈 SILVER CERTIFIED', gold: '🥇 GOLD VERIFIED' }[tier];
}
 
function makeQRSVG(text, size = 54) {
  // Simplified visual QR placeholder — replace with real QR lib if needed
  const cells = 9;
  const cell  = Math.floor(size / cells);
  // Deterministic pixel pattern from text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  let squares = '';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const on = ((hash >> ((r * cells + c) % 30)) & 1) || (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
      if (on) squares += `<rect x="${c*cell}" y="${r*cell}" width="${cell-1}" height="${cell-1}" rx="1"/>`;
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${squares}</svg>`;
}
//  cert
function certVerificationId(workerId) {
  return `SC-${String(workerId).padStart(5,'0')}-${(Date.now() % 1000000).toString(36).toUpperCase()}`;
}
 
function buildCertHTML(profile, tier, verId, compact = false) {
  const name      = profile.name || 'Worker';
  const trade     = profile.trade || 'General';
  const jobs      = profile.jobs_completed || 0;
  const trust     = parseFloat(profile.trust_score || 0).toFixed(1);
  const stars     = '★'.repeat(Math.round(profile.trust_score||0)) + '☆'.repeat(5 - Math.round(profile.trust_score||0));
  const skills    = profile.top_skills || [trade, 'GPS Verified', 'Escrow Payments'];
  const initials  = name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  const qrHTML    = makeQRSVG(verId);
  const tierLabel = getTierLabel(tier);
  const ps        = compact ? ' style="padding:24px 20px 20px"' : '';
  const ns        = compact ? ' style="font-size:1.3rem"' : '';
 
  const sealSVG = tier === 'gold' ? `
    <div class="cert-seal">
      <svg viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="34" cy="34" r="32" stroke="rgba(212,160,23,.4)" stroke-width="1"/>
        <circle cx="34" cy="34" r="26" stroke="rgba(212,160,23,.25)" stroke-width="1" stroke-dasharray="3 3"/>
        <circle cx="34" cy="34" r="20" stroke="rgba(212,160,23,.35)" stroke-width="1"/>
        ${[0,45,90,135,180,225,270,315].map(deg => {
          const r = 29, a = deg * Math.PI/180;
          const x = 34 + r * Math.cos(a), y = 34 + r * Math.sin(a);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="rgba(212,160,23,.4)"/>`;
        }).join('')}
        <text x="34" y="30" text-anchor="middle" font-family="Cinzel,serif" font-size="6" fill="rgba(255,217,90,.7)" letter-spacing="1">VERIFIED</text>
        <text x="34" y="40" text-anchor="middle" font-family="Cinzel,serif" font-size="5" fill="rgba(212,160,23,.5)" letter-spacing="1">SKILLCHAIN</text>
      </svg>
    </div>` : '';
 
  return `
    <div class="cert-${tier}"${ps}>
      ${sealSVG}
      <div class="cert-tier-chip">${tierLabel}</div>
      <div class="cert-name"${ns}>${name}</div>
      <div class="cert-tagline">${trade} · Geofence-Verified Worker</div>
      <div class="cert-divider"></div>
      <div class="cert-metrics">
        <div class="cert-metric">
          <div class="cert-metric__val">${jobs}</div>
          <div class="cert-metric__label">Jobs Done</div>
        </div>
        <div class="cert-metric">
          <div class="cert-metric__val">${trust}</div>
          <div class="cert-metric__label">Trust Score</div>
        </div>
        <div class="cert-metric">
          <div class="cert-metric__val">${stars.slice(0,5)}</div>
          <div class="cert-metric__label">Rating</div>
        </div>
      </div>
      <div class="cert-skills">
        ${skills.map(s => `<span class="cert-skill-tag">${s}</span>`).join('')}
      </div>
      <div class="cert-footer">
        <div>
          <div class="cert-id">ID: ${verId}</div>
          <div class="cert-id" style="margin-top:4px">GPS-authenticated · Squad-secured</div>
        </div>
        <div class="cert-qr" title="Scan to verify on SkillChain">${qrHTML}</div>
      </div>
    </div>`;
}
  // ── Open jobs list (find-jobs tab) ────────────────
  function renderOpenJobsList(jobs) {
    const el = document.getElementById('open-jobs-list');
    if (!jobs.length) {
      el.innerHTML = `<div class="empty-state"><span>🔍</span><p>No open jobs match your search.</p></div>`;
      return;
    }
    el.innerHTML = jobs.map(j => openJobCardHTML(j)).join('');
    attachOpenJobListeners(el);
  }

  function openJobCardHTML(job) {
    const icon = TRADE_ICONS[job.trade] || '🛠️';
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' });
    return `
      <div class="job-card job-card--open" data-job-id="${job.id}">
        <div class="job-card__icon">${icon}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">
            <span>${job.trade || 'General'}</span>
            <span>📍 ${job.site_address || '—'}</span>
            <span>📅 ${date}</span>
            ${job.client_name ? `<span>👤 ${job.client_name}</span>` : ''}
          </div>
        </div>
        <div class="job-card__right">
          <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
          <button class="accept-btn" data-job-id="${job.id}">Accept</button>
        </div>
      </div>`;
  }

  function attachOpenJobListeners(container) {
    container.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const job = allOpenJobs.find(j => j.id === parseInt(btn.dataset.jobId));
        if (job) openAcceptModal(job, btn);
      });
    });
  }

  // ═══════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════
function openAcceptModal(job, triggerBtn) {
  const icon = TRADE_ICONS[job.trade] || '🛠️';
  modalBody.innerHTML = `
    <p class="modal-title">${icon} ${job.title}</p>
    <p class="modal-amount">₦${Number(job.amount).toLocaleString()}</p>
    ${statusBadge('open')}
    <div class="modal-divider"></div>
    <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description || '—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">📍 ${job.site_address || '—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade || '—'}</p></div>
    ${job.client_name ? `<div class="modal-field"><p class="modal-field__label">Posted by</p><p class="modal-field__val">👤 ${job.client_name}</p></div>` : ''}
    <div class="modal-divider"></div>

    <!-- Accept at listed price -->
    <button class="modal-btn-accept" id="confirm-accept-btn">✅ Accept at ₦${Number(job.amount).toLocaleString()}</button>

    <!-- Bargain section -->
    <div style="margin-top:12px;padding:14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
      <p style="font-size:.72rem;letter-spacing:.08em;color:var(--text-3);margin-bottom:10px">💬 COUNTER-OFFER</p>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <input type="number" id="bargain-price-input" placeholder="Your price e.g. 12000"
          min="100" step="100"
          style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:.875rem;outline:none">
      </div>
      <textarea id="bargain-message-input" placeholder="Optional message to client…"
        style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text);font-family:inherit;font-size:.82rem;resize:vertical;min-height:52px;outline:none;margin-bottom:8px"></textarea>
      <button id="submit-bargain-btn"
        style="width:100%;background:rgba(232,92,0,.1);border:1px solid rgba(232,92,0,.3);color:#e85c00;border-radius:8px;padding:9px;font-size:.82rem;font-weight:600;cursor:pointer;transition:background .15s"
        onmouseover="this.style.background='rgba(232,92,0,.2)'"
        onmouseout="this.style.background='rgba(232,92,0,.1)'">
        📨 Send Counter-Offer
      </button>
      <p id="bargain-err" style="font-size:.75rem;color:#ef4444;margin-top:6px;min-height:16px"></p>
    </div>
  `;
  modalOverlay.classList.add('is-open');

  // Accept at full price
  document.getElementById('confirm-accept-btn').addEventListener('click', async () => {
    await acceptJob(job.id, document.getElementById('confirm-accept-btn'));
  });

  // Submit bargain
  document.getElementById('submit-bargain-btn').addEventListener('click', async () => {
    const priceInput = document.getElementById('bargain-price-input');
    const msgInput   = document.getElementById('bargain-message-input');
    const errEl      = document.getElementById('bargain-err');
    const price      = parseFloat(priceInput.value);

    errEl.textContent = '';
    if (!price || price < 100) {
      errEl.textContent = 'Enter a valid price (min ₦100).';
      return;
    }

    const btn = document.getElementById('submit-bargain-btn');
    btn.disabled    = true;
    btn.textContent = 'Sending…';

    try {
      const res  = await fetch(`${FLASK}/api/worker/bargain`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          job_id:         job.id,
          user_id:        user.id,
          proposed_price: price,
          message:        msgInput.value.trim()
        })
      });
      const data = await res.json();

      if (data.success) {
        modalOverlay.classList.remove('is-open');
        Swal.fire({
          title: '📨 Offer Sent!',
          text:  `Your counter-offer of ₦${price.toLocaleString()} has been sent to the client.`,
          icon:  'success',
          confirmButtonColor: '#e85c00',
          background: '#181614', color: '#f0ede8'
        });
      } else {
        errEl.textContent = data.message || 'Could not send offer.';
        btn.disabled    = false;
        btn.textContent = '📨 Send Counter-Offer';
      }
    } catch (err) {
      errEl.textContent = 'Network error. Is Flask running?';
      btn.disabled    = false;
      btn.textContent = '📨 Send Counter-Offer';
    }
  });
}

  // ── My Job Detail Modal ───────────────────────────
  function openMyJobModal(job) {
    const icon     = TRADE_ICONS[job.trade] || '🛠️';
    const created  = new Date(job.created_at).toLocaleString('en-NG');
    const verified = job.verified_at ? new Date(job.verified_at).toLocaleString('en-NG') : '—';

let actionBtn = '';
if (job.status === 'assigned') {
  actionBtn = `<button class="modal-btn-complete" id="modal-complete-btn" data-job-id="${job.id}">
    📍 Submit Proof of Presence
  </button>`;
} else if (job.status === 'pending_review') {
  actionBtn = `
    <div style="background:#1a1200;border:1px solid rgba(245,158,11,.3);
      border-radius:8px;padding:12px;text-align:center">
      <p style="color:#f59e0b;font-size:.85rem;font-weight:600">⏳ Awaiting Client Approval</p>
      <p style="color:#5a5550;font-size:.75rem;margin-top:4px">
        The client will assign or decline your application.
      </p>
    </div>`;
}

    modalBody.innerHTML = `
      <p class="modal-title">${icon} ${job.title}</p>
      <p class="modal-amount">₦${Number(job.amount).toLocaleString()}</p>
      ${statusBadge(job.status)}
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">📍 ${job.site_address || '—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade || '—'}</p></div>
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Accepted</p><p class="modal-field__val">${created}</p></div>
      <div class="modal-field"><p class="modal-field__label">Verified At</p><p class="modal-field__val">${verified}</p></div>
      ${job.distance_meters != null ? `<div class="modal-field"><p class="modal-field__label">GPS Distance</p><p class="modal-field__val">${Number(job.distance_meters).toFixed(0)}m from site</p></div>` : ''}
      ${job.transfer_reference ? `<div class="modal-field"><p class="modal-field__label">Transfer Ref</p><p class="modal-field__val" style="font-family:monospace;font-size:.8rem">${job.transfer_reference}</p></div>` : ''}
      ${actionBtn ? `<div class="modal-actions">${actionBtn}</div>` : ''}
    `;
    modalOverlay.classList.add('is-open');

    // Redirect to proof-of-presence page
    document.getElementById('modal-complete-btn')?.addEventListener('click', () => {
      const jobId = document.getElementById('modal-complete-btn').dataset.jobId;
      window.location.href = `/Complete_job/index.html?job_id=${jobId}`;
    });
  }

modalClose?.addEventListener('click', (e) => {
  e.stopPropagation();
  modalOverlay.classList.remove('is-open');
});
modalOverlay?.addEventListener('click', (e) => {
  // Close if clicking the dark backdrop, not the white card inside
  if (e.target === modalOverlay || e.target.classList.contains('modal-overlay')) {
    modalOverlay.classList.remove('is-open');
  }
});

// Also add this — pressing Escape closes any open modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalOverlay.classList.remove('is-open');
});

  // ═══════════════════════════════════════════════════
  // API ACTIONS
  // ═══════════════════════════════════════════════════

  // ── Accept a job ──────────────────────────────────
  async function acceptJob(jobId, triggerBtn) {
    const btn = document.getElementById('confirm-accept-btn') || triggerBtn;
    if (btn) { btn.disabled = true; btn.textContent = 'Accepting…'; }

    try {
      const res  = await fetch(`${FLASK}/api/worker/accept-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ job_id: jobId, user_id: user.id })
      });
      const data = await res.json();

      if (data.success) {
        modalOverlay.classList.remove('is-open');
        await loadMyJobs();
        await loadOpenJobs();
        Swal.fire({
          title: 'Job Accepted! 🎉',
          text: 'Your application has been sent. Wait for the client to approve you.',
          icon: 'success',
          confirmButtonColor: '#e85c00',
          background: '#181614', color: '#f0ede8'
        });
      } else {
        Swal.fire({ title: 'Error', text: data.message || 'Could not accept job.', icon: 'error', background: '#181614', color: '#f0ede8' });
        if (btn) { btn.disabled = false; btn.textContent = '✅ Accept This Job'; }
      }
    } catch (err) {
      console.error('acceptJob:', err);
      Swal.fire({ title: 'Network Error', text: 'Could not reach the server.', icon: 'error', background: '#181614', color: '#f0ede8' });
      if (btn) { btn.disabled = false; btn.textContent = '✅ Accept This Job'; }
    }
  }

  // ── Earnings ──────────────────────────────────────
  function renderEarnings() {
    const paid    = allMyJobs.filter(j => j.status === 'paid');
    const pending = allMyJobs.filter(j => ['assigned','pending_verification','verified'].includes(j.status));
    
    const pendAmt = pending.reduce((s,j) => s + parseFloat(j.amount), 0);
    const totalEarned = paid.reduce((s,j) => s + parseFloat(j.amount), 0);

    // 🧮 The final math for the Earnings Tab!
    const withdrawn = parseFloat(user.profile.total_withdrawn || 0);
    const availableBalance = totalEarned - withdrawn;

    document.getElementById('earn-total').textContent   = '₦' + availableBalance.toLocaleString();
    document.getElementById('earn-count').textContent   = paid.length;
    document.getElementById('earn-pending').textContent = '₦' + pendAmt.toLocaleString();

    const list = document.getElementById('earnings-list');
    list.innerHTML = paid.length
      ? paid.map(job => {
          const date = new Date(job.paid_at || job.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
          return `<div class="payment-row">
            <div class="payment-row__icon">💸</div>
            <div class="payment-row__info">
              <p class="payment-row__title">${job.title}</p>
              <p class="payment-row__date">${date} · ${job.transfer_reference || 'No ref'}</p>
            </div>
            <span class="payment-row__amount">₦${Number(job.amount).toLocaleString()}</span>
          </div>`;
        }).join('')
      : `<div class="empty-state"><span>💳</span><p>No earnings yet. Complete verified jobs to get paid.</p></div>`;
  }
function renderProfile() {
  const p = user.profile || {};
  const name  = p.name  || user.name  || '—';
  const trade = p.trade || user.trade || '—';
  const email = p.email || user.email || '—';
  const score = parseFloat(p.trust_score || 0).toFixed(1);
  const initial = name[0]?.toUpperCase() || 'W';

  document.getElementById('profile-avatar').textContent = initial;
  document.getElementById('profile-name').textContent   = name;
  document.getElementById('profile-trade').textContent  = trade;
  document.getElementById('profile-email').textContent  = email;
  document.getElementById('profile-trust').textContent  = score;

  renderCertButton(p);

  // Squad wallet
  const walletBody = document.getElementById('profile-wallet-body');
  if (p.squad_account_number) {
    walletBody.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;padding:16px;
        background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
        <span style="font-size:1.5rem">🏦</span>
        <div>
          <p style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;
            letter-spacing:.06em">${p.squad_account_number}</p>
          <p style="font-size:.78rem;color:var(--text-3);margin-top:2px">
            ${p.squad_bank_name || 'Squad Sandbox Bank'}
          </p>
        </div>
        <span style="margin-left:auto;font-size:.75rem;color:var(--success);
          display:flex;align-items:center;gap:5px">
          <span style="width:6px;height:6px;border-radius:50%;
            background:var(--success);display:inline-block"></span>Active
        </span>
      </div>`;
  } else {
    walletBody.innerHTML = `<div class="empty-state"><span>🏦</span><p>No wallet linked yet.</p></div>`;
  }

  const verLogs = p.verification_logs || [];
  const total  = verLogs.length;
  const passed = verLogs.filter(v => v.result === 'pass').length;
  const failed = total - passed;
  const rate   = total > 0 ? Math.round((passed / total) * 100) : 0;

  document.getElementById('vs-total').textContent = total;
  document.getElementById('vs-pass').textContent  = passed;
  document.getElementById('vs-fail').textContent  = failed;
  document.getElementById('vs-rate').textContent  = `${rate}%`;
}
function renderCertButton(profile) {
  const container = document.getElementById('profile-cert-area');
  if (!container || !profile) return;

  const jobs  = profile.jobs_completed || 0;
  const trust = parseFloat(profile.trust_score || 0);
  const tier  = getCertTier(jobs, trust);

  const icons = { bronze: '🥉', silver: '🥈', gold: '🥇' };
  const label = { bronze: 'Bronze Certificate', silver: 'Silver Certificate', gold: 'Gold Certificate' };

  container.innerHTML = `
    <button class="cert-trigger-btn cert-trigger-btn--${tier}"
            onclick="openCertModal()">
      ${icons[tier]} View My ${label[tier]}
    </button>`;

  window._certProfile = profile;
  window._certTier    = tier;
  window._certVerId   = certVerificationId(profile.id);
}

function openCertModal() {
  let overlay = document.getElementById('cert-modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id        = 'cert-modal-overlay';
    overlay.className = 'cert-overlay';
    overlay.innerHTML = `
      <div class="cert-sheet" id="cert-sheet">
        <button class="cert-close" onclick="closeCertModal()">✕</button>
        <div id="cert-content"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeCertModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCertModal(); });
  }

  const profile = window._certProfile || {};
  const tier    = window._certTier    || 'bronze';
  const verId   = window._certVerId   || certVerificationId(profile.id || 0);

  document.getElementById('cert-content').innerHTML = buildCertHTML(profile, tier, verId, false);
  overlay.classList.add('is-open');
}

function closeCertModal() {
  document.getElementById('cert-modal-overlay')?.classList.remove('is-open');
}
  // ── Withdraw to Bank Modal ─────────────────────────
  async function openWithdrawModal() {
    // 1. Show loader
    Swal.fire({
        title: 'Loading Banks…',
        allowOutsideClick: false,
        background: '#181614', color: '#f0ede8',
        didOpen: () => Swal.showLoading()
    });

    try {
        // 2. Fetch data (Make sure FLASK/api/banks matches what your Python is listening to!)
        const [profileRes, banksRes] = await Promise.all([
            fetch(`${FLASK}/api/worker/profile?user_id=${user.id}`, { credentials: 'include' }),
            fetch(`${FLASK}/api/banks`, { credentials: 'include' }) 
        ]);

        const profileData = await profileRes.json();
        const banksData = await banksRes.json();

        // Safely extract profile (in case your backend wraps it in a 'profile' key)
        const profile = profileData.profile || profileData || {}; 
        const banks = banksData.banks || [];

        // 3. Stop spinning!
        Swal.close(); 

        if (!banks.length) {
            Swal.fire({
                title: 'Bank list unavailable',
                text: 'Could not load banks from Squad. Please try again.',
                icon: 'warning',
                confirmButtonColor: '#e85c00',
                background: '#181614', color: '#f0ede8'
            });
            return;
        }

        const hasSavedDetails = profile.bank_account_no && profile.bank_code;

        const bankOptionsHTML = banks.map(b =>
            `<option value="${b.code}" ${profile.bank_code === b.code ? 'selected' : ''}>
                ${b.name}
            </option>`
        ).join('');

        // 4. Open the actual withdrawal form
        await Swal.fire({
            title: '💸 Withdraw to Bank',
            html: `
                <p style="color:#a09890;font-size:.82rem;margin-bottom:14px">
                    Funds will arrive in your bank account within 1–5 minutes.
                </p>
                <select id="wd-bank-code" style="width:100%;padding:10px;background:#1a1a1a; border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#f0ede8; margin-bottom:10px;font-size:.85rem;outline:none">
                    <option value="">-- Select your bank --</option>
                    ${bankOptionsHTML}
                </select>
                <input id="wd-account-no" maxlength="10" placeholder="Your 10-digit account number" value="${profile.bank_account_no || ''}" style="width:100%;padding:10px;background:#1a1a1a; border:1px solid rgba(255,255,255,.1);border-radius:6px; color:#f0ede8;margin-bottom:6px;font-size:.85rem; box-sizing:border-box;outline:none">
                <div id="wd-acct-name" style="min-height:24px;margin-bottom:10px;font-size:.82rem; font-weight:600;text-align:left;padding:0 2px"></div>
                <input type="number" id="wd-amount" min="100" placeholder="Amount in ₦ (min ₦100)" style="width:100%;padding:10px;background:#1a1a1a; border:1px solid rgba(255,255,255,.1);border-radius:6px; color:#f0ede8;font-size:.85rem;box-sizing:border-box;outline:none">
            `,
            confirmButtonText: 'Withdraw Now',
            confirmButtonColor: '#e85c00',
            showCancelButton: true,
            cancelButtonText: 'Cancel',
            cancelButtonColor: '#333',
            background: '#181614',
            color: '#f0ede8',
            didOpen: () => {
                // Verification logic remains exactly the same...
                let verifyTimeout = null;
                async function tryVerify() {
                    const accountNo = document.getElementById('wd-account-no').value.trim();
                    const bankCode  = document.getElementById('wd-bank-code').value;
                    const nameEl    = document.getElementById('wd-acct-name');

                    if (accountNo.length === 10 && bankCode) {
                        nameEl.style.color = '#f59e0b';
                        nameEl.textContent = '⏳ Verifying account…';
                        try {
                            const res  = await fetch(`${FLASK}/api/verify-account?account_no=${accountNo}&bank_code=${bankCode}`, { credentials: 'include' });
                            const data = await res.json();
                            if (data.success) {
                                nameEl.style.color = '#22c55e';
                                nameEl.textContent = `✅ ${data.account_name}`;
                                nameEl.dataset.verified     = 'true';
                                nameEl.dataset.accountName  = data.account_name;
                            } else {
                                nameEl.style.color         = '#ef4444';
                                nameEl.textContent         = `❌ ${data.message || 'Account not found'}`;
                                nameEl.dataset.verified    = 'false';
                                nameEl.dataset.accountName = '';
                            }
                        } catch {
                            nameEl.style.color      = '#ef4444';
                            nameEl.textContent      = '❌ Could not verify — check connection';
                            nameEl.dataset.verified = 'false';
                        }
                    } else {
                        nameEl.textContent      = '';
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
                const verified  = nameEl?.dataset.verified === 'true';
                const acctName  = nameEl?.dataset.accountName || '';
                const bankSelect= document.getElementById('wd-bank-code');
                const bankName  = bankSelect?.options[bankSelect.selectedIndex]?.text || '';

                if (!bankCode) { Swal.showValidationMessage('Please select your bank'); return false; }
                if (!accountNo || accountNo.length !== 10) { Swal.showValidationMessage('Enter a valid 10-digit account number'); return false; }
                // Comment this out if Sandbox verification fails: 
                // if (!verified) { Swal.showValidationMessage('Please wait for account verification to complete'); return false; }
                if (!amount || Number(amount) < 100) { Swal.showValidationMessage('Minimum withdrawal is ₦100'); return false; }

                return { amount, bankCode, accountNo, bankName, acctName };
            }
        }).then(async result => {
            if (!result.isConfirmed || !result.value) return;

            const { amount, bankCode, accountNo, bankName, acctName } = result.value;

            Swal.fire({
                title: 'Processing…', text: 'Sending withdrawal to Squad.',
                allowOutsideClick: false, background: '#181614', color: '#f0ede8',
                didOpen: () => Swal.showLoading()
            });

            try {
            const res = await fetch(`${FLASK}/api/worker/withdraw`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({
                    user_id: user.id, amount: Number(amount), bank_code: bankCode,
                    account_no: accountNo, bank_name: bankName, account_name: acctName
                })
            });
            const data = await res.json();
            
            Swal.fire({
                title: data.success ? '✅ Withdrawal Initiated!' : '❌ Failed',
                text: data.message, icon: data.success ? 'success' : 'error',
                confirmButtonColor: '#e85c00', background: '#181614', color: '#f0ede8'
            });

            // 🟢 THE FIX: UPDATE THE UI INSTANTLY 🟢
            if (data.success) {
                // 1. Manually add the withdrawn amount to the local profile data
                user.profile.total_withdrawn = (parseFloat(user.profile.total_withdrawn) || 0) + Number(amount);
                
                // 2. Force the UI blocks to recalculate and redraw!
                renderStats(user.profile);
                renderEarnings();
            }

        } catch (e) {
            Swal.fire({ title: 'Network Error', text: 'Could not reach server.', icon: 'error', confirmButtonColor: '#e85c00', background: '#181614', color: '#f0ede8' });
        }
        });
    } catch (e) {
        Swal.close();
        console.error("UI Error:", e);
        Swal.fire('Error', 'Something went wrong loading the form.', 'error');
    }
}
  window.openWithdrawModal   = openWithdrawModal;
window.openCertModal       = openCertModal;
window.closeCertModal      = closeCertModal;

  async function init() {
    const ok = loadUser();
    if (!ok) return;
    await Promise.all([loadProfile(), loadMyJobs()]);
    // Render stats now that both profile + jobs are loaded
    if (user.profile) renderStats(user.profile);

    
setInterval(async () => {
  await loadMyJobs();
  renderRecentJobs(allMyJobs.slice(0, 5));
  renderStats(user.profile);
}, 10_000);
  }

  init();

})();
