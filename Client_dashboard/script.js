(function () {
  'use strict';

  const FLASK       = 'http://127.0.0.1:5000';
  const LOGIN_PAGE  = 'http://127.0.0.1:5501/Login/index.html';
  const SESSION_DUR = 30 * 60 * 1000;

  let allJobs      = [];
  let activeFilter = 'all';
  let user         = null;

  // ── Map state ─────────────────────────────────────
  let map         = null;
  let marker      = null;
  let mapReady    = false;
  let selectedLat = null;
  let selectedLng = null;

  // ── Media state ───────────────────────────────────
  let mediaFiles = [];

  // ── DOM ───────────────────────────────────────────
  const sidebar            = document.getElementById('sidebar');
  const burger             = document.getElementById('burger');
  const navItems           = document.querySelectorAll('.nav-item');
  const views              = document.querySelectorAll('.view');
  const filterBtns         = document.querySelectorAll('.filter-tab');
  const modalOverlay       = document.getElementById('modal-overlay');
  const modalClose         = document.getElementById('modal-close');
  const modalBody          = document.getElementById('modal-body');
  const workerModalOverlay = document.getElementById('worker-modal-overlay');
  const workerModalClose   = document.getElementById('worker-modal-close');
  const workerModalBody    = document.getElementById('worker-modal-body');
  const DEV_MODE = true;  // set to false in production
  
  // ── Modal close handlers ──────────────────────────
modalClose?.addEventListener('click', () => modalOverlay.classList.remove('is-open'));
modalOverlay?.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('is-open');
});

workerModalClose?.addEventListener('click', () => workerModalOverlay.classList.remove('is-open'));
workerModalOverlay?.addEventListener('click', e => {
  if (e.target === workerModalOverlay) workerModalOverlay.classList.remove('is-open');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    modalOverlay?.classList.remove('is-open');
    workerModalOverlay?.classList.remove('is-open');
  }
});
  // re
window.retryPaymentAccount = function(jobId) {
    console.log("Button clicked! Attempting to generate account for job:", jobId);
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "⌛ Processing...";

    fetch(`https://bullion-crushing-trickster.ngrok-free.dev/api/client/retry-payment/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(res => {
        // MATCHING THE BACKEND LOG: status 200 and success true
        if (res.status === 200 || res.success === true) {
            
            // If the backend sent a checkout_url, let's go there!
            if (res.data && res.data.checkout_url) {
                Swal.fire({
                    title: 'Redirecting to Payment...',
                    text: 'Squad link generated successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#181614', color: '#f0ede8'
                }).then(() => {
                    window.location.href = res.data.checkout_url;
                });
            } else {
                alert("Success! Account generated. Reloading dashboard...");
                location.reload(); 
            }
        } else {
            // This captures the "Squad API still returning error" message
            alert("Squad Error: " + (res.message || "Check KYC/Bank settings."));
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Network error. Make sure your Flask backend and ngrok are both running.");
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
};
  
  
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

    // FIX: Initialise map AFTER the view is visible in DOM
    if (viewId === 'post-job') {
      if (!mapReady) {
        // Use rAF to guarantee the view is painted before Leaflet measures it
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            initMap();
          });
        });
      } else {
        // Already initialised — just fix sizing in case container changed
        map.invalidateSize();
      }
    }

    if (viewId === 'my-jobs')      renderJobsList(allJobs);
    if (viewId === 'payments')     renderPayments();
    if (viewId === 'find-workers') searchWorkers();
    if (viewId === 'bargains')     loadBargains();
      }

  navItems.forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); showView(item.dataset.view); });
  });

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

  // ── Load user ─────────────────────────────────────
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
    const welcomeEl = document.getElementById('welcome-name');
    const navNameEl = document.getElementById('nav-name');
    const navAvatar = document.getElementById('nav-avatar');
    const topAvatar = document.getElementById('topbar-avatar');

    if (welcomeEl) welcomeEl.textContent  = `Welcome, ${user.name}`;
    if (navNameEl) navNameEl.textContent  = user.name;
    if (navAvatar) navAvatar.textContent  = user.name[0].toUpperCase();
    if (topAvatar) topAvatar.textContent  = user.name[0].toUpperCase();
    return true;
  }

  // ── Load jobs ─────────────────────────────────────
  async function loadJobs() {
    try {
      const res = await fetch(`${FLASK}/api/client/jobs?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      allJobs = data.jobs || [];
      renderStats(allJobs);
      renderRecentJobs(allJobs.slice(0, 5));
    } catch (e) { console.error('loadJobs:', e); }
  }
// cancel post job — shared by both header and form cancel buttons
  function cancelPostJob() {
  document.getElementById('post-job-form').reset();
  clearLocation();
  mediaFiles = [];
  renderMediaPreviews();
  ['err-title','err-amount','err-address'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  showView('overview');
}
document.getElementById('cancel-post-job')?.addEventListener('click', cancelPostJob);
document.getElementById('cancel-post-job-header')?.addEventListener('click', cancelPostJob);

  // ── Stats ─────────────────────────────────────────
function renderStats(jobs) {
  document.getElementById('stat-total').textContent  = jobs.length;
document.getElementById('stat-active').textContent = jobs.filter(j => ['open','assigned','pending_review','pending_verification'].includes(j.status)).length;
  document.getElementById('stat-done').textContent   = jobs.filter(j => ['verified','paid'].includes(j.status)).length;
  document.getElementById('stat-paid').textContent   = '₦' + jobs
    .filter(j => j.status === 'paid')
    .reduce((s, j) => s + Number(j.amount || 0), 0)
    .toLocaleString();
}
  // ── Job card helpers ──────────────────────────────
  const TRADE_ICONS = {
    Mechanic: '🔧', Electrician: '⚡', Plumber: '🔩', Carpenter: '🪚',
    Painter: '🖌️', Welder: '🔥', Tailor: '🧵', Mason: '🧱',
    'HVAC Technician': '❄️', Other: '🛠️'
  };

function statusBadge(status) {
  const labels = {
    open: 'Open',
    pending_review: 'Awaiting Approval',  // ← ADD
    assigned: 'Assigned',
    pending_verification: 'Pending',
    verified: 'Verified',
    paid: 'Paid'
  };
  return `<span class="badge badge--${status}">${labels[status] || status}</span>`;
}


function jobCardHTML(job) {
  const icon = TRADE_ICONS[job.trade] || '🛠️';
  const date = new Date(job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  const canDelete = job.status === 'open';

  return `
    <div class="job-card" data-job-id="${job.id}">
      <div class="job-card__icon">${icon}</div>
      <div class="job-card__info">
        <p class="job-card__title">${job.title}</p>
        <div class="job-card__meta">
          ${statusBadge(job.status)}
          <span>${job.worker_name ? '👷 ' + job.worker_name : 'No worker yet'}</span>
          <span>📅 ${date}</span>
        </div>
      </div>
      <div class="job-card__right">
        <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
        ${canDelete ? `<button class="job-card__delete" data-job-id="${job.id}" title="Delete job">🗑</button>` : ''}
      </div>
    </div>`;
}

  function renderRecentJobs(jobs) {
    const el    = document.getElementById('recent-jobs-list');
    const empty = document.getElementById('recent-empty');
    if (!jobs.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    el.innerHTML = jobs.map(jobCardHTML).join('');
    attachJobCardListeners(el);
  }

  function renderJobsList(jobs) {
    const filtered = activeFilter === 'all' ? jobs
      : jobs.filter(j => activeFilter === 'verified'
          ? ['verified', 'paid'].includes(j.status)
          : j.status === activeFilter);
    const el = document.getElementById('all-jobs-list');
    el.innerHTML = filtered.length
      ? filtered.map(jobCardHTML).join('')
      : `<div class="empty-state"><span>📭</span><p>No ${activeFilter === 'all' ? '' : activeFilter} jobs found.</p></div>`;
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
    card.addEventListener('click', (e) => {
      // Don't open modal if they clicked the delete button
      if (e.target.closest('.job-card__delete')) return;
      const job = allJobs.find(j => j.id === parseInt(card.dataset.jobId));
      if (job) openJobModal(job);
    });
  });

  // Wire delete buttons separately
  container.querySelectorAll('.job-card__delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteJob(parseInt(btn.dataset.jobId));
    });
  });
}
 async function openJobModal(job) {
  const icon     = TRADE_ICONS[job.trade] || '🛠️';
  const created  = new Date(job.created_at).toLocaleString('en-NG');
  const verified = job.verified_at ? new Date(job.verified_at).toLocaleString('en-NG') : '—';
 
  // Fetch live payment details (escrow status + collection account)
  let paymentDetails = null;
  try {
    const pRes = await fetch(
      `${FLASK}/api/job/payment-details?job_id=${job.id}&user_id=${user.id}`,
      { credentials: 'include' }
    );
    if (pRes.ok) paymentDetails = await pRes.json();
  } catch (e) { console.error('payment-details:', e); }
 
  // Fetch media for this job
  let media = [];
  try {
    const mRes = await fetch(
      `${FLASK}/api/job/media?job_id=${job.id}&user_id=${user.id}`,
      { credentials: 'include' }
    );
    if (mRes.ok) { const md = await mRes.json(); media = md.media || []; }
  } catch (e) {}
 
  // Fetch comments
  let comments = [];
  try {
    const cRes = await fetch(`${FLASK}/api/job/comments?job_id=${job.id}`, { credentials: 'include' });
    if (cRes.ok) { const cd = await cRes.json(); comments = cd.comments || []; }
  } catch (e) {}
 
  const pd        = paymentDetails || job;
  const escrowPaid= pd.escrow_paid || false;
  const acctNum   = pd.collection_account_number || '';
  const bankName  = pd.collection_bank_name || '';
  const amount    = Number(pd.amount || job.amount || 0);

  // review section — only for pending_review status
let reviewSection = '';
if (job.status === 'pending_review') {
  reviewSection = `
    <div style="background:#1a1200;border:1px solid rgba(245,158,11,.3);
      border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <p style="font-size:.68rem;letter-spacing:.1em;color:#f59e0b;margin-bottom:6px">
        ⏳ WORKER APPLICATION — AWAITING YOUR DECISION
      </p>
      <p style="font-size:.82rem;color:#a09890;margin-bottom:12px">
        <strong style="color:#f0ede8">${job.worker_name || 'A worker'}</strong> 
        has applied for this job. Approve to assign them, or decline to reopen.
      </p>
      <div style="display:flex;gap:10px">
        <button onclick="reviewWorker(${job.id}, ${job.worker_id}, 'assign')"
          style="flex:1;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);
          color:#22c55e;border-radius:8px;padding:10px;font-size:.85rem;
          font-weight:600;cursor:pointer">
          ✅ Approve Worker
        </button>
        <button onclick="reviewWorker(${job.id}, ${job.worker_id}, 'decline')"
          style="flex:1;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);
          color:#ef4444;border-radius:8px;padding:10px;font-size:.85rem;
          font-weight:600;cursor:pointer">
          ❌ Decline
        </button>
      </div>
    </div>`;
}
 
  // ── Escrow section ─────────────────────────────────────────────────
// ── Escrow section — replaces the existing escrowSection block ─────
let escrowSection = '';

if (['open', 'assigned', 'pending_review'].includes(job.status)){
  const hasAccount = !!(pd.collection_account_number);
  const funded     = pd.escrow_paid || false;

  if (funded) {
    // Already paid — green confirmation
    escrowSection = `
      <div style="background:#0a1f12;border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
        <span style="font-size:1.2rem">✅</span>
        <div>
          <p style="font-size:.82rem;font-weight:600;color:#22c55e">Escrow Funded</p>
          <p style="font-size:.72rem;color:#5a5550">₦${amount.toLocaleString()} received — worker can now complete job</p>
        </div>
      </div>`;

  } else if (hasAccount) {
  const isCheckoutUrl = pd.collection_account_number?.startsWith('http');

  escrowSection = isCheckoutUrl ? `
    <div style="background:#1a0d00;border:1px solid rgba(232,92,0,.35);
      border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <p style="font-size:.68rem;letter-spacing:.1em;color:#5a5550;margin-bottom:8px">
        ⚠️ PAYMENT REQUIRED — FUND ESCROW TO UNLOCK JOB
      </p>
      <p style="font-size:.78rem;color:#ffb07a;margin-bottom:14px">
        Pay exactly <strong>₦${amount.toLocaleString()}</strong> via Squad to fund escrow.
        Worker can only start after payment is confirmed.
      </p>
      <a href="${pd.collection_account_number}" target="_blank"
        style="display:block;width:100%;background:#e85c00;color:#fff;
               border:none;border-radius:8px;padding:12px;font-size:.9rem;
               font-weight:700;cursor:pointer;text-align:center;
               text-decoration:none;margin-bottom:8px">
        💳 Pay ₦${amount.toLocaleString()} via Squad →
      </a>
      <button onclick="verifyPaymentDemo(${job.id})"
        style="width:100%;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);
               color:#22c55e;border-radius:8px;padding:8px;font-size:.75rem;
               font-weight:600;cursor:pointer;opacity:.7">
        🧪 Verify Payment (Demo — Dev Only)
      </button>
    </div>` : `
    <div style="background:#1a0d00;border:1px solid rgba(232,92,0,.35);
      border-radius:10px;padding:14px 16px;margin-bottom:16px">
      <p style="font-size:.68rem;letter-spacing:.1em;color:#5a5550;margin-bottom:8px">
        ⚠️ AWAITING PAYMENT — TRANSFER TO FUND ESCROW
      </p>
      <div style="background:#111;border-radius:8px;padding:12px;margin-bottom:10px">
        <p style="font-size:.68rem;color:#5a5550;letter-spacing:.08em;margin-bottom:4px">BANK</p>
        <p style="font-size:.875rem;color:#a09890;margin-bottom:10px">
          ${pd.collection_bank_name || 'GTBank'}
        </p>
        <p style="font-size:.68rem;color:#5a5550;letter-spacing:.08em;margin-bottom:4px">
          ACCOUNT NUMBER
        </p>
        <p style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;
          letter-spacing:.07em;margin-bottom:2px">
          ${pd.collection_account_number}
        </p>
      </div>
      <button onclick="navigator.clipboard.writeText('${pd.collection_account_number}')
        .then(()=>Swal.fire({title:'Copied!',icon:'success',timer:1500,
        showConfirmButton:false,background:'#181614',color:'#f0ede8'}))"
        style="width:100%;background:rgba(232,92,0,.1);border:1px solid rgba(232,92,0,.3);
               color:#e85c00;border-radius:8px;padding:9px;font-size:.82rem;
               font-weight:600;cursor:pointer;margin-bottom:8px">
        📋 Copy Account Number
      </button>
      <button onclick="verifyPaymentDemo(${job.id})"
        style="width:100%;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);
               color:#22c55e;border-radius:8px;padding:8px;font-size:.75rem;
               font-weight:600;cursor:pointer;opacity:.7">
        🧪 Verify Payment (Demo — Dev Only)
      </button>
    </div>`;


  } else {
    // No account yet — Squad call failed on job post, show retry
    escrowSection = `
      <div style="background:#1a1208;border:1px solid rgba(232,92,0,.2);border-radius:10px;padding:12px 16px;margin-bottom:16px">
        <p style="font-size:.78rem;color:#a09890">Payment account not generated yet.</p>
        <button onclick="retryPaymentAccount(${job.id})"
          style="margin-top:8px;background:rgba(232,92,0,.1);border:1px solid rgba(232,92,0,.3);color:#e85c00;border-radius:6px;padding:7px 14px;font-size:.8rem;font-weight:600;cursor:pointer">
          🔄 Generate Payment Account
        </button>
      </div>`;
  }
}
 
  // ── Rating section (only after GPS-verified) ───────────────────────
  const canRate      = ['verified','paid'].includes(job.status) &&
                       job.distance_meters != null &&
                       Number(job.distance_meters) <= 100;
  const alreadyRated = job.client_rating != null;
 
  let ratingSection = '';
  if (['verified','paid'].includes(job.status)) {
    if (!canRate) {
      ratingSection = `
        <div style="background:#1a0a0a;border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:12px;margin-top:16px;font-size:.78rem;color:#f87171">
          🚫 Rating is disabled — worker was not within the GPS boundary (${job.distance_meters ? Math.round(job.distance_meters) + 'm away' : 'no GPS data'}).
        </div>`;
    } else if (alreadyRated) {
      ratingSection = `
        <div style="background:#0a1f12;border:1px solid rgba(34,197,94,.3);border-radius:8px;padding:12px;margin-top:16px">
          <p style="font-size:.72rem;color:#5a5550;margin-bottom:4px">YOUR RATING</p>
          <p style="color:#f59e0b;font-size:1.2rem">${'★'.repeat(job.client_rating)}${'☆'.repeat(5-job.client_rating)}</p>
          ${job.client_rating_comment ? `<p style="font-size:.8rem;color:#a09890;margin-top:4px">"${job.client_rating_comment}"</p>` : ''}
        </div>`;
    } else {
      ratingSection = `
        <div style="background:#0a1f12;border:1px solid rgba(34,197,94,.3);border-radius:10px;padding:14px 16px;margin-top:16px">
          <p style="font-size:.68rem;letter-spacing:.1em;color:#22c55e;margin-bottom:8px">RATE THIS WORKER</p>
          <div style="display:flex;gap:6px;margin-bottom:10px" id="star-row">
            ${[1,2,3,4,5].map(n => `
              <button onclick="selectStar(${n}, ${job.id})"
                id="star-${n}"
                style="font-size:1.6rem;background:none;border:none;cursor:pointer;filter:grayscale(1);transition:filter .1s,transform .1s"
                title="${n} star${n>1?'s':''}">★</button>`).join('')}
          </div>
          <textarea id="rating-comment" placeholder="Optional comment…"
            style="width:100%;background:#111;border:1px solid rgba(255,255,255,.07);border-radius:6px;color:#f0ede8;padding:8px 10px;font-family:inherit;font-size:.82rem;resize:vertical;min-height:60px;outline:none"></textarea>
          <button class="btn btn--orange btn--wide" style="margin-top:10px" id="submit-rating-btn"
            onclick="submitRating(${job.id}, ${job.worker_id || 0})">
            Submit Rating
          </button>
        </div>`;
    }
  }
 
  // ── Media section ──────────────────────────────────────────────────
  let mediaSection = '';
  if (media.length > 0) {
    mediaSection = `
      <div class="modal-divider"></div>
      <p class="modal-field__label" style="margin-bottom:8px">PROOF MEDIA</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${media.map(m => `
          <div style="background:var(--bg3);border-radius:10px;overflow:hidden;border:1px solid var(--border)">
            ${m.media_type === 'video'
              ? `<video src="${FLASK}/static/${m.file_path.replace('static/','')}" controls style="width:100%;max-height:220px;object-fit:cover"></video>`
              : `<img src="${FLASK}/static/${m.file_path.replace('static/','')}" style="width:100%;max-height:220px;object-fit:cover">`}
            <div style="padding:8px 12px;display:flex;align-items:center;gap:12px">
              ${m.proof_lat ? `<span style="font-size:.72rem;color:#5a5550;font-family:monospace">📍 ${Number(m.proof_lat).toFixed(4)}, ${Number(m.proof_lng).toFixed(4)}</span>` : ''}
              <button onclick="toggleLikeMedia(${m.id})" id="like-media-${m.id}"
                style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:.82rem;color:${m.user_liked ? '#e85c00' : '#5a5550'}">
                ${m.user_liked ? '❤️' : '🤍'} <span id="like-count-${m.id}">${m.likes}</span>
              </button>
              <button onclick="openMediaComments(${m.id})"
                style="background:none;border:none;cursor:pointer;font-size:.82rem;color:#5a5550">
                💬 ${m.comment_count}
              </button>
            </div>
          </div>`).join('')}
      </div>`;
  }
 
  // ── Comments section ───────────────────────────────────────────────
  const commentsSection = `
    <div class="modal-divider"></div>
    <p class="modal-field__label" style="margin-bottom:8px">COMMENTS</p>
    <div id="job-comments-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
      ${comments.length === 0
        ? `<p style="font-size:.8rem;color:#5a5550">No comments yet.</p>`
        : comments.map(c => `
            <div style="background:var(--bg3);border-radius:8px;padding:8px 12px">
              <p style="font-size:.72rem;font-weight:600;color:#a09890;margin-bottom:2px">${c.user_name || 'Anonymous'}</p>
              <p style="font-size:.85rem">${c.body}</p>
            </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <input type="text" id="job-comment-input" placeholder="Write a comment…"
        style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-family:inherit;font-size:.85rem;outline:none">
      <button onclick="postJobComment(${job.id})"
        class="btn btn--orange btn--sm">Send</button>
    </div>`;
 
  // ── Assemble modal ─────────────────────────────────────────────────
  modalBody.innerHTML = `
    <p class="modal-title">${icon} ${job.title}</p>
    <p class="modal-amount">₦${amount.toLocaleString()}</p>
    ${statusBadge(job.status)}
    ${reviewSection}
    ${escrowSection}
 
    <div class="modal-divider"></div>
    <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description || '—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">📍 ${job.site_address || '—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade || '—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Worker</p><p class="modal-field__val">${job.worker_name
      ? `👷 <a href="#" onclick="openWorkerPublicProfile(${job.worker_id})" style="color:var(--orange)">${job.worker_name}</a> · ⭐ ${job.worker_trust ?? '—'}`
      : 'No worker assigned yet'}</p></div>
    <div class="modal-divider"></div>
    <div class="modal-field"><p class="modal-field__label">Posted</p><p class="modal-field__val">${created}</p></div>
    <div class="modal-field"><p class="modal-field__label">Verified At</p><p class="modal-field__val">${verified}</p></div>
    ${job.distance_meters != null
      ? `<div class="modal-field"><p class="modal-field__label">GPS Distance</p><p class="modal-field__val">${Number(job.distance_meters).toFixed(0)}m from site</p></div>`
      : ''}
    ${job.transfer_reference
      ? `<div class="modal-field"><p class="modal-field__label">Payout Ref</p><p class="modal-field__val" style="font-family:monospace;font-size:.8rem">${job.transfer_reference}</p></div>`
      : ''}
 
    ${ratingSection}
    ${mediaSection}
    ${commentsSection}
  `;
 
  // Store selected star for rating
  window._selectedStar = job.client_rating || 0;
  modalOverlay.classList.add('is-open');
}

 function copyAccNum(num) {
  navigator.clipboard.writeText(num).then(() => {
    Swal.fire({ title: 'Copied!', text: num, icon: 'success', timer: 1500, showConfirmButton: false, background: '#181614', color: '#f0ede8' });
  });
}
 
async function simulatePayment(jobId) {
  const res  = await fetch(`${FLASK}/api/dev/simulate-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ job_id: jobId })
  });
  const data = await res.json();
  if (data.success) {
    modalOverlay.classList.remove('is-open');
    await loadJobs();
    Swal.fire({ title: '✅ Payment Simulated', text: data.message, icon: 'success', background: '#181614', color: '#f0ede8', confirmButtonColor: '#e85c00' });
  } else {
    Swal.fire('Error', data.error || 'Failed', 'error');
  }
}
 
function selectStar(n, jobId) {
  window._selectedStar = n;
  [1,2,3,4,5].forEach(i => {
    const el = document.getElementById(`star-${i}`);
    if (el) {
      el.style.filter    = i <= n ? 'none' : 'grayscale(1)';
      el.style.color     = i <= n ? '#f59e0b' : '';
      el.style.transform = i === n ? 'scale(1.2)' : 'scale(1)';
    }
  });
}
 
async function submitRating(jobId, workerId) {
  const rating  = window._selectedStar || 0;
  const comment = document.getElementById('rating-comment')?.value.trim() || '';
 
  if (!rating) {
    Swal.fire({ title: 'Pick a star rating', icon: 'warning', background: '#181614', color: '#f0ede8', confirmButtonColor: '#e85c00' });
    return;
  }
 
  const btn = document.getElementById('submit-rating-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
 
  try {
    const res  = await fetch(`${FLASK}/api/client/rate-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ job_id: jobId, user_id: user.id, rating, comment })
    });
    const data = await res.json();
 
    if (data.success) {
      modalOverlay.classList.remove('is-open');
      await loadJobs();
      Swal.fire({ title: '⭐ Rating Saved!', icon: 'success', background: '#181614', color: '#f0ede8', confirmButtonColor: '#e85c00' });
    } else {
      Swal.fire({ title: 'Cannot Rate', text: data.message, icon: 'error', background: '#181614', color: '#f0ede8' });
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Rating'; }
    }
  } catch (e) {
    Swal.fire('Error', 'Network issue', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Rating'; }
  }
}
 
async function toggleLikeMedia(mediaId) {
  const res  = await fetch(`${FLASK}/api/media/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ media_id: mediaId, user_id: user.id })
  });
  const data = await res.json();
  if (data.success) {
    const btn   = document.getElementById(`like-media-${mediaId}`);
    const count = document.getElementById(`like-count-${mediaId}`);
    if (btn)   btn.style.color = data.liked ? '#e85c00' : '#5a5550';
    if (count) count.textContent = data.count;
    if (btn)   btn.innerHTML = `${data.liked ? '❤️' : '🤍'} <span id="like-count-${mediaId}">${data.count}</span>`;
  }
}
 
async function openMediaComments(mediaId) {
  const res  = await fetch(`${FLASK}/api/media/comments?media_id=${mediaId}`, { credentials: 'include' });
  const data = await res.json();
  const comments = data.comments || [];
  await Swal.fire({
    title: '💬 Comments',
    html: `
      <div style="text-align:left;max-height:280px;overflow-y:auto;margin-bottom:12px">
        ${comments.length === 0
          ? '<p style="color:#5a5550;font-size:.85rem">No comments yet.</p>'
          : comments.map(c => `
              <div style="background:#222019;border-radius:8px;padding:8px 12px;margin-bottom:8px">
                <p style="font-size:.72rem;font-weight:600;color:#a09890;margin-bottom:2px">${c.user_name || 'Anonymous'}</p>
                <p style="font-size:.85rem;color:#f0ede8">${c.body}</p>
              </div>`).join('')}
      </div>
      <input type="text" id="media-comment-input" placeholder="Write a comment…"
        style="width:100%;background:#1a1a1a;border:1px solid rgba(255,255,255,.07);border-radius:6px;color:#f0ede8;padding:8px 12px;font-size:.85rem;outline:none">`,
    showCancelButton: true,
    confirmButtonText: 'Post Comment',
    cancelButtonText:  'Close',
    confirmButtonColor: '#e85c00',
    cancelButtonColor: '#333',
    background: '#181614', color: '#f0ede8',
    preConfirm: () => document.getElementById('media-comment-input')?.value.trim()
  }).then(async result => {
    if (result.isConfirmed && result.value) {
      await fetch(`${FLASK}/api/media/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ media_id: mediaId, user_id: user.id, user_name: user.name, body: result.value })
      });
    }
  });
}
 
async function postJobComment(jobId) {
  const input = document.getElementById('job-comment-input');
  const body  = input?.value.trim();
  if (!body) return;
 
  input.value = '';
  await fetch(`${FLASK}/api/job/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ job_id: jobId, user_id: user.id, user_name: user.name, body })
  });
 
  // Re-add comment to UI immediately
  const list = document.getElementById('job-comments-list');
  if (list) {
    list.innerHTML += `
      <div style="background:var(--bg3);border-radius:8px;padding:8px 12px">
        <p style="font-size:.72rem;font-weight:600;color:#a09890;margin-bottom:2px">${user.name}</p>
        <p style="font-size:.85rem">${body}</p>
      </div>`;
  }
}
 
async function openWorkerPublicProfile(workerId) {
  if (!workerId) return;
  modalOverlay.classList.remove('is-open');
 
  const res  = await fetch(`${FLASK}/api/worker/public-profile?worker_id=${workerId}&viewer_id=${user.id}`, { credentials: 'include' });
  if (!res.ok) { Swal.fire('Error', 'Could not load profile.', 'error'); return; }
  const data = await res.json();
 
  const w  = data.worker || {};
  const rs = data.rating_summary || {};
  const initials = w.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'W';
 
  workerModalBody.innerHTML = `
    <!-- Header -->
    <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:16px">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(232,92,0,.12);border:2px solid #e85c00;color:#e85c00;font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;display:grid;place-items:center;margin:0 auto 10px">${initials}</div>
      <p style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800">${w.name || '—'}</p>
      <p style="color:#e85c00;font-size:.85rem;font-weight:500;margin:3px 0">${w.trade || 'General'}</p>
      <p style="font-size:.75rem;color:#5a5550">${w.jobs_completed || 0} verified jobs</p>
    </div>
 
    <!-- Stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:#222019;border-radius:8px;padding:10px;text-align:center">
        <p style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:#e85c00">${Number(w.trust_score||0).toFixed(1)}</p>
        <p style="font-size:.68rem;color:#5a5550">Trust Score</p>
      </div>
      <div style="background:#222019;border-radius:8px;padding:10px;text-align:center">
        <p style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800">${rs.total_ratings || 0}</p>
        <p style="font-size:.68rem;color:#5a5550">Ratings</p>
      </div>
      <div style="background:#222019;border-radius:8px;padding:10px;text-align:center">
        <p style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:#f59e0b">
          ${rs.avg_rating ? Number(rs.avg_rating).toFixed(1) : '—'}★
        </p>
        <p style="font-size:.68rem;color:#5a5550">Avg Rating</p>
      </div>
    </div>
 
    <!-- Rating breakdown -->
    ${rs.total_ratings > 0 ? `
    <div style="margin-bottom:16px">
      ${[5,4,3,2,1].map(star => {
        const count = Number(rs[`${['one','two','three','four','five'][star-1]}_star`] || (star===5?rs.five_star:star===4?rs.four_star:star===3?rs.three_star:rs.low_star) || 0);
        const pct   = rs.total_ratings > 0 ? Math.round((count/rs.total_ratings)*100) : 0;
        return `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:.75rem;color:#f59e0b;width:20px">${star}★</span>
            <div style="flex:1;height:6px;background:#222019;border-radius:99px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:#f59e0b;border-radius:99px"></div>
            </div>
            <span style="font-size:.72rem;color:#5a5550;width:28px;text-align:right">${pct}%</span>
          </div>`;
      }).join('')}
    </div>` : ''}
 
    <!-- Media posts -->
    ${(data.media||[]).length > 0 ? `
    <p style="font-size:.68rem;letter-spacing:.1em;color:#5a5550;margin-bottom:8px">PROOF MEDIA</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
      ${data.media.slice(0,4).map(m => `
        <div style="background:#222019;border-radius:10px;overflow:hidden">
          ${m.media_type==='video'
            ? `<video src="${FLASK}/static/${m.file_path.replace('static/','')}" controls style="width:100%;max-height:180px;object-fit:cover"></video>`
            : `<img src="${FLASK}/static/${m.file_path.replace('static/','')}" style="width:100%;max-height:180px;object-fit:cover">`}
          <div style="padding:8px 12px;display:flex;align-items:center;gap:8px">
            <span style="font-size:.75rem;color:#5a5550">${m.job_title || ''}</span>
            <button onclick="toggleLikeMedia(${m.id})" id="like-media-${m.id}"
              style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:.82rem;color:${m.viewer_liked?'#e85c00':'#5a5550'}">
              ${m.viewer_liked?'❤️':'🤍'} <span id="like-count-${m.id}">${m.likes}</span>
            </button>
            <button onclick="openMediaComments(${m.id})"
              style="background:none;border:none;cursor:pointer;font-size:.82rem;color:#5a5550">💬 ${m.comment_count}</button>
          </div>
        </div>`).join('')}
    </div>` : ''}
 
    <!-- Job history -->
    ${(data.job_history||[]).length > 0 ? `
    <p style="font-size:.68rem;letter-spacing:.1em;color:#5a5550;margin-bottom:8px">JOB HISTORY</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${data.job_history.slice(0,5).map(h => `
        <div style="background:#222019;border-radius:8px;padding:10px 12px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <p style="font-size:.85rem;font-weight:600">${h.title}</p>
            <span style="font-family:'Syne',sans-serif;font-size:.85rem;font-weight:700;color:#e85c00">₦${Number(h.amount).toLocaleString()}</span>
          </div>
          <p style="font-size:.72rem;color:#5a5550;margin-top:2px">📍 ${h.site_address || '—'}</p>
          ${h.client_rating ? `
          <p style="font-size:.78rem;color:#f59e0b;margin-top:4px">${'★'.repeat(h.client_rating)}${'☆'.repeat(5-h.client_rating)} ${h.client_rating_comment ? `"${h.client_rating_comment}"` : ''}</p>` : ''}
        </div>`).join('')}
    </div>` : ''}

    <!-- Credential Card -->
    <div style="margin-top:16px">
      <p style="font-size:.68rem;letter-spacing:.1em;color:#5a5550;margin-bottom:10px">SKILLCHAIN CERTIFICATE</p>
      ${buildWorkerCredCard(data)}
    </div>
  `;
  workerModalOverlay.classList.add('is-open');
}

  // ── Payments ──────────────────────────────────────
  function renderPayments() {
    const paid   = allJobs.filter(j => j.status === 'paid');
    const escrow = allJobs.filter(j => ['open', 'assigned', 'pending_verification'].includes(j.status));
   // AFTER
    document.getElementById('pay-total').textContent  = '₦' + paid.reduce((s, j) => s + Number(j.amount || 0), 0).toLocaleString();
    document.getElementById('pay-escrow').textContent = '₦' + escrow.reduce((s, j) => s + Number(j.amount || 0), 0).toLocaleString();
    document.getElementById('pay-count').textContent  = paid.length;
const list = document.getElementById('payments-list');
    list.innerHTML = paid.length ? paid.map(job => {
      const date = new Date(job.paid_at || job.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
      return `<div class="payment-row">
        <div class="payment-row__icon">💸</div>
        <div class="payment-row__info">
          <p class="payment-row__title">${job.title}</p>
          <p class="payment-row__date">${date} · ${job.transfer_reference || 'No ref'}</p>
        </div>
        <span class="payment-row__amount">₦${Number(job.amount).toLocaleString()}</span>
      </div>`;
    }).join('') : `<div class="empty-state"><span>💳</span><p>No transactions yet.</p></div>`;
  }

  // ═══════════════════════════════════════════════════
  // MAP PICKER — FIX: initMap called only after view is visible
  // ═══════════════════════════════════════════════════
  function initMap() {
    if (mapReady) return;

    const mapEl = document.getElementById('job-map');
    if (!mapEl || mapEl.offsetWidth === 0) {
      // Container still not visible — retry once more
      setTimeout(initMap, 100);
      return;
    }

    map = L.map('job-map', { zoomControl: true }).setView([6.5244, 3.3792], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const orangeIcon = makeOrangeIcon();

    map.on('click', async e => {
      await setLocation(e.latlng.lat, e.latlng.lng, null, orangeIcon);
    });

    mapReady = true;

    // FIX: Force Leaflet to recalculate tile grid now that container is measured
    setTimeout(() => map.invalidateSize(), 50);

    document.getElementById('map-hint').classList.remove('is-hidden');
  }

  function makeOrangeIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="width:26px;height:26px;background:#e85c00;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.45)"></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
      popupAnchor: [0, -28]
    });
  }

  async function setLocation(lat, lng, addressOverride, iconObj) {
    selectedLat = lat;
    selectedLng = lng;

    const icon = iconObj || makeOrangeIcon();
    if (marker) { marker.setLatLng([lat, lng]); }
    else        { marker = L.marker([lat, lng], { icon }).addTo(map); }

    map.panTo([lat, lng]);

    // Reverse geocode
    let address = addressOverride;
    if (!address) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const d = await r.json();
        address = d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      } catch { address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
    }

    document.getElementById('job-address').value         = address;
    document.getElementById('job-lat').value             = lat.toFixed(6);
    document.getElementById('job-lng').value             = lng.toFixed(6);
    document.getElementById('address-display-text').textContent   = address;
    document.getElementById('address-display-coords').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('address-display').style.display      = 'flex';
    document.getElementById('map-hint').classList.add('is-hidden');
    document.getElementById('err-address').textContent            = '';

    // Visual pulse on the address card
    const card = document.getElementById('address-display');
    card.classList.remove('address-display--pulse');
    void card.offsetWidth; // reflow to restart animation
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
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    const btn = document.getElementById('btn-my-loc');
    btn.style.opacity = '.5';
    navigator.geolocation.getCurrentPosition(
      async pos => {
        btn.style.opacity = '';
        await setLocation(pos.coords.latitude, pos.coords.longitude);
        map.setZoom(16);
      },
      err => { btn.style.opacity = ''; alert('Could not get location: ' + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // ── Address search (Nominatim) ────────────────────
  let searchTimeout   = null;
  const searchInput   = document.getElementById('location-search-input');
  const searchResults = document.getElementById('location-results');

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
          `<div class="location-result" data-idx="${i}"
                data-lat="${place.lat}" data-lng="${place.lon}"
                data-name="${place.display_name}">
             <strong>${place.display_name.split(',')[0]}</strong>
             <span>${place.display_name.split(',').slice(1, 3).join(',')}</span>
           </div>`
        ).join('');
        searchResults.classList.add('is-open');

        searchResults.querySelectorAll('.location-result').forEach(item => {
          item.addEventListener('click', async () => {
            const lat  = parseFloat(item.dataset.lat);
            const lng  = parseFloat(item.dataset.lng);
            const name = item.dataset.name;
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

  document.addEventListener('click', e => {
    if (!e.target.closest('.location-search')) searchResults.classList.remove('is-open');
  });

  // ═══════════════════════════════════════════════════
  // MEDIA UPLOAD
  // ═══════════════════════════════════════════════════
  const mediaUploadZone = document.getElementById('media-upload-zone');
  const mediaFileInput  = document.getElementById('media-files');
  const mediaPreviewsEl = document.getElementById('media-previews');
  const mediaPrompt     = document.getElementById('media-prompt');

  mediaUploadZone?.addEventListener('click', e => {
    if (!e.target.closest('.media-thumb__remove') && !e.target.closest('.media-thumb__add')) {
      mediaFileInput.click();
    }
  });

  mediaFileInput?.addEventListener('change', () => {
    handleNewFiles(Array.from(mediaFileInput.files));
    mediaFileInput.value = '';
  });

  mediaUploadZone?.addEventListener('dragover',  e => { e.preventDefault(); mediaUploadZone.classList.add('media-upload--drag'); });
  mediaUploadZone?.addEventListener('dragleave', () => mediaUploadZone.classList.remove('media-upload--drag'));
  mediaUploadZone?.addEventListener('drop', e => {
    e.preventDefault();
    mediaUploadZone.classList.remove('media-upload--drag');
    handleNewFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/')));
  });

  function handleNewFiles(files) {
    const remaining = 5 - mediaFiles.length;
    files.slice(0, remaining).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is too large (max 10MB)`); return; }
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
      thumb.innerHTML = file.type.startsWith('image/')
        ? `<img src="${url}" alt="${file.name}">`
        : `<video src="${url}" muted></video>`;
      const removeBtn = document.createElement('button');
      removeBtn.className   = 'media-thumb__remove';
      removeBtn.textContent = '✕';
      removeBtn.type        = 'button';
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        mediaFiles.splice(i, 1);
        renderMediaPreviews();
      });
      thumb.appendChild(removeBtn);
      mediaPreviewsEl.appendChild(thumb);
    });

    if (mediaFiles.length > 0 && mediaFiles.length < 5) {
      const addBtn = document.createElement('div');
      addBtn.className   = 'media-thumb__add';
      addBtn.textContent = '+';
      addBtn.addEventListener('click', () => mediaFileInput.click());
      mediaPreviewsEl.appendChild(addBtn);
    }
  }

  document.getElementById('post-job-form')?.addEventListener('submit', async e => {
    e.preventDefault();

    const title   = document.getElementById('job-title').value.trim();
    const amount  = document.getElementById('job-amount').value;
    const address = document.getElementById('job-address').value;

    // Clear previous errors
    ['err-title', 'err-amount', 'err-address'].forEach(id => {
      document.getElementById(id).textContent = '';
    });

    let valid = true;
    if (!title)                         { document.getElementById('err-title').textContent   = 'Job title is required.';            valid = false; }
    if (!amount || Number(amount) < 100){ document.getElementById('err-amount').textContent  = 'Enter a valid amount (min ₦100).';  valid = false; }
    if (!address)                       { document.getElementById('err-address').textContent = 'Please pick a location on the map.'; valid = false; }
    if (!valid) return;

    const btn  = document.getElementById('post-job-btn');
    const text = document.getElementById('post-job-text');
    const spin = document.getElementById('post-job-spinner');
    text.style.display = 'none'; spin.style.display = 'inline-block'; btn.disabled = true;

    // FIX: Build FormData from scratch — don't pass the form element
    // (avoids accidentally sending blank hidden fields before they're filled)
    const formData = new FormData();
    formData.append('user_id',      user.id);
    formData.append('role',         'client');   // FIX: hardcode 'client' — Flask checks this exactly
    formData.append('title',        title);
    formData.append('description',  document.getElementById('job-desc').value.trim());
    formData.append('trade',        document.getElementById('job-trade').value);
    formData.append('amount',       amount);
    formData.append('site_address', address);
    formData.append('site_lat',     document.getElementById('job-lat').value);
    formData.append('site_lng',     document.getElementById('job-lng').value);

    // Attach media
    mediaFiles.forEach((file, i) => formData.append(`media_${i}`, file));

    try {
      const res  = await fetch(`${FLASK}/api/client/post-job`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();


  if (data.success) {
    // Reset form
    document.getElementById('post-job-form').reset();
    clearLocation();
    mediaFiles = [];
    renderMediaPreviews();
    await loadJobs();
 
    // ── Show payment instructions ──────────────────────────────────────
    if (data.payment?.account_number) {
      showView('my-jobs');
      renderJobsList(allJobs);
 
      await Swal.fire({
        title:              '🎉 Job Posted!',
        html: `
          <p style="margin-bottom:16px;color:#a09890">Now fund the escrow so workers can begin.</p>
          <div style="background:#1a1a1a;border:1px solid rgba(232,92,0,.3);border-radius:10px;padding:16px;text-align:left">
            <p style="font-size:.72rem;letter-spacing:.1em;color:#5a5550;margin-bottom:6px">TRANSFER EXACTLY</p>
            <p style="font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#e85c00">
              ₦${Number(data.payment.amount).toLocaleString()}
            </p>
            <div style="height:1px;background:rgba(255,255,255,.07);margin:12px 0"></div>
            <p style="font-size:.72rem;letter-spacing:.1em;color:#5a5550;margin-bottom:4px">TO THIS ACCOUNT</p>
            <p style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;letter-spacing:.06em">
              ${data.payment.account_number}
            </p>
            <p style="font-size:.8rem;color:#a09890;margin-top:3px">${data.payment.bank_name}</p>
            <div style="height:1px;background:rgba(255,255,255,.07);margin:12px 0"></div>
            <p style="font-size:.75rem;color:#5a5550">
              ⚠️ Transfer the <strong>exact</strong> amount. Any difference will be flagged.<br>
              Workers can only start after your payment lands.
            </p>
          </div>`,
        confirmButtonText:  'Got it — I\'ll transfer now',
        confirmButtonColor: '#e85c00',
        background:         '#181614',
        color:              '#f0ede8',
        width:              '480px'
      });
    } else {
      // Squad account creation failed — still show success but warn
      showView('my-jobs');
      renderJobsList(allJobs);
      Swal.fire({
        title: 'Job Posted',
        text:  'Payment account could not be generated right now. Check job details to retry.',
        icon:  'warning',
        confirmButtonColor: '#e85c00',
        background: '#181614', color: '#f0ede8'
      });
    }    
  } else {
        const errs = data.errors || {};
        if (errs.title)   document.getElementById('err-title').textContent   = errs.title;
        if (errs.amount)  document.getElementById('err-amount').textContent  = errs.amount;
        if (errs.address) document.getElementById('err-address').textContent = errs.address;
        if (errs.general) Swal.fire({ title: 'Error', text: errs.general, icon: 'error', background: '#181614', color: '#f0ede8' });
      }
    } catch (err) {
      console.error('Post job error:', err);
      Swal.fire({ title: 'Network Error', text: 'Could not reach the server. Is Flask running?', icon: 'error', background: '#181614', color: '#f0ede8' });
    } finally {
      text.style.display = 'inline'; spin.style.display = 'none'; btn.disabled = false;
    }
  });

  // ═══════════════════════════════════════════════════
  // FIND WORKERS
  // ═══════════════════════════════════════════════════
async function searchWorkers() {
  const query    = (document.getElementById('worker-search-text')?.value || '').trim();
  const trade    = document.getElementById('worker-search-trade')?.value || '';
  const radiusEl = document.getElementById('worker-radius');
  const radius   = radiusEl ? radiusEl.value : '10';
  const grid     = document.getElementById('workers-grid');

  grid.innerHTML = `<div class="skeleton-list" style="grid-column:1/-1">
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  </div>`;

  // Try to get user location silently
  let userLat = null, userLng = null;
  try {
    const pos = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 4000, maximumAge: 120000, enableHighAccuracy: false
      })
    );
    userLat = pos.coords.latitude;
    userLng = pos.coords.longitude;
  } catch { /* location denied — search without proximity */ }

  try {
    const params = new URLSearchParams();
    if (query)   params.append('q', query);
    if (trade)   params.append('trade', trade);
    if (userLat) params.append('lat', userLat);
    if (userLng) params.append('lng', userLng);
    if (userLat) params.append('radius_km', radius);

    const res = await fetch(`${FLASK}/api/workers/search?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    renderWorkers(grid, data.workers || [], !!userLat);
  } catch (e) {
    console.error('searchWorkers:', e);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span>😕</span><p>Could not reach server.</p>
    </div>`;
  }
}

  document.getElementById('btn-search-workers')?.addEventListener('click', searchWorkers);
  document.getElementById('worker-search-text')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchWorkers(); });
  document.getElementById('worker-search-trade')?.addEventListener('change', searchWorkers);

function renderWorkersMock(grid, query, trade) {
  // API failed — show empty state instead of crashing on undefined MOCK_WORKERS
  grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
    <span>😕</span><p>Could not reach server. Is Flask running?</p>
  </div>`;
}
  const WORKERS_CACHE = {};
async function deleteJob(jobId) {
  const result = await Swal.fire({
    title: 'Delete this job?',
    text: 'This cannot be undone. Only open jobs can be deleted.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#333',
    confirmButtonText: 'Yes, delete it',
    cancelButtonText: 'Cancel',
    background: '#181614',
    color: '#f0ede8'
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${FLASK}/api/client/delete-job`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ job_id: jobId, user_id: user.id })
    });
    const data = await res.json();

    if (data.success) {
      allJobs = allJobs.filter(j => j.id !== jobId);
      renderStats(allJobs);
      renderRecentJobs(allJobs.slice(0, 5));
      renderJobsList(allJobs);
      Swal.fire({
        title: 'Deleted',
        text: 'Job has been removed.',
        icon: 'success',
        confirmButtonColor: '#e85c00',
        background: '#181614',
        color: '#f0ede8'
      });
    } else {
      Swal.fire({
        title: 'Cannot Delete',
        text: data.message,
        icon: 'error',
        background: '#181614',
        color: '#f0ede8'
      });
    }
  } catch (err) {
    console.error('Delete error:', err);
    Swal.fire('Network Error', 'Could not reach server.', 'error');
  }
}
// Helper to generate worker card HTML with distance calculation
  
function workerCardHTML(w) {
  const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const score    = Number(w.trust_score || 0).toFixed(1);
  const filled   = Math.round(w.trust_score || 0);
  const stars    = '★'.repeat(filled) + '☆'.repeat(5 - filled);

  // Distance badge
  let distBadge = '';
  if (w.distance_km !== null && w.distance_km !== undefined) {
    const label = w.distance_km < 1
      ? `${Math.round(w.distance_km * 1000)}m away`
      : `${w.distance_km}km away`;
    distBadge = `<span style="
      background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);
      color:#22c55e;border-radius:99px;padding:2px 9px;
      font-size:.65rem;font-weight:600;letter-spacing:.04em">
      📍 ${label}
    </span>`;
  } else if (w.avg_lat) {
    distBadge = `<span style="
      background:rgba(90,85,80,.15);border:1px solid rgba(90,85,80,.3);
      color:#5a5550;border-radius:99px;padding:2px 9px;font-size:.65rem">
      📍 Location known
    </span>`;
  } else {
    distBadge = `<span style="
      background:rgba(90,85,80,.1);border:1px solid rgba(90,85,80,.2);
      color:#5a5550;border-radius:99px;padding:2px 9px;font-size:.65rem">
      📍 No location yet
    </span>`;
  }

  return `
    <div class="worker-card" data-worker-id="${w.id}">
      <div class="worker-card__top">
        <div class="worker-card__avatar">${initials}</div>
        <div>
          <p class="worker-card__name">${w.name}</p>
          <p class="worker-card__trade">${w.trade || 'General'}</p>
        </div>
        <div class="worker-card__trust">
          ${score}
          <span class="worker-card__trust-label">Trust Score</span>
        </div>
      </div>
      <div class="worker-card__stats" style="flex-wrap:wrap;gap:8px">
        <div class="worker-stat"><strong>${w.jobs_completed || 0}</strong>Jobs done</div>
        <div class="worker-stat"><strong style="color:#f59e0b">${stars}</strong>Rating</div>
      </div>
      <div style="margin:8px 0 10px">${distBadge}</div>
      <button class="worker-card__hire" data-worker-id="${w.id}">View & Contact →</button>
    </div>`;
}

// Add this helper function inside the IIFE:
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLng = (lng2-lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
 function renderWorkers(grid, workers, hasLocation) {
  window._lastWorkerResults = workers;
  if (!workers.length) {
    const msg = hasLocation
      ? 'No workers found nearby. Try increasing the search radius.'
      : 'No workers found. Try a different search.';
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span>🔍</span><p>${msg}</p>
    </div>`;
    return;
  }
  grid.innerHTML = workers.map(w => workerCardHTML(w)).join('');
  attachWorkerCardListeners(grid);
}

  function attachWorkerCardListeners(grid) {
    grid.querySelectorAll('.worker-card__hire').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        // Get the real worker object from the workers array, not MOCK_WORKERS
        const workerId = parseInt(btn.dataset.workerId);
        const worker = (window._lastWorkerResults || []).find(w => w.id === workerId);
        if (worker) openWorkerModal(worker);
      });
    });
  }
function openWorkerModal(w) {
  if (!w) return;

  const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const score    = Number(w.trust_score || 0).toFixed(1);
  const filled   = Math.round(w.trust_score || 0);
  const stars    = '★'.repeat(filled) + '☆'.repeat(5 - filled);

  workerModalBody.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:60px;height:60px;border-radius:50%;background:var(--orange-dim);
                  border:2px solid var(--orange);color:var(--orange);font-size:1.3rem;
                  font-weight:700;display:grid;place-items:center;margin:0 auto 10px">
        ${initials}
      </div>
      <p style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800">${w.name}</p>
      <p style="color:var(--orange);font-size:.85rem;font-weight:500">${w.trade || 'General'}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center">
        <p style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:var(--orange)">${score}</p>
        <p style="font-size:.7rem;color:var(--text-3)">Trust Score</p>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center">
        <p style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800">${w.jobs_completed || 0}</p>
        <p style="font-size:.7rem;color:var(--text-3)">Jobs Done</p>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center">
        <p style="font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;color:#f59e0b">${stars}</p>
        <p style="font-size:.7rem;color:var(--text-3)">Rating</p>
      </div>
    </div>

    <div class="modal-divider"></div>

    ${w.phone ? `
      <a href="tel:${w.phone}"
         class="btn btn--orange btn--wide"
         style="margin-bottom:10px;text-decoration:none;display:flex;justify-content:center">
        📞 Call ${w.name.split(' ')[0]}
      </a>
      <a href="https://wa.me/234${w.phone.replace(/^0/, '')}"
         target="_blank"
         class="btn btn--wide"
         style="background:#25d366;color:#fff;text-decoration:none;display:flex;
                justify-content:center;margin-bottom:10px">
        💬 WhatsApp
      </a>
    ` : `
      <p style="text-align:center;color:#5a5550;font-size:.85rem;margin-bottom:16px">
        No contact number on file for this worker.
      </p>
    `}

    <button onclick="openWorkerPublicProfile(${w.id})"
      style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
             color:#a09890;border-radius:8px;padding:10px;font-size:.85rem;
             font-weight:600;cursor:pointer">
      👤 View Full Profile
    </button>
  `;

  workerModalOverlay.classList.add('is-open');
}

function buildWorkerCredCard(workerData) {
  const w      = workerData.worker || workerData;
  const rs     = workerData.rating_summary || {};
  const jobs   = w.jobs_completed || 0;
  const trust  = parseFloat(w.trust_score || 0);
  const avgRat = parseFloat(rs.avg_rating || trust);
  const tier   = getCertTier(jobs, avgRat);
  const verId  = certVerificationId(w.id);
  const initials = (w.name||'W').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const cardId = `cred-${w.id}`;
 
  const tierMeta = {
    bronze: { label: 'Bronze Certified', color: 'var(--bronze-d)' },
    silver: { label: 'Silver Certified', color: 'var(--silver-d)' },
    gold:   { label: 'Gold Verified',    color: 'var(--gold-e)'   }
  }[tier];
 
  const backHTML = buildCertHTML(
    { ...w, top_skills: [w.trade||'General','GPS Verified','Squad Secured'] },
    tier, verId, true
  );
 
  return `
    <div class="cred-card-wrap" id="${cardId}">
      <div class="cred-card-inner">
 
        <!-- FRONT -->
        <div class="cred-card-front cred-front-${tier}">
          <div class="cred-squad-badge">Verified by Squad</div>
          <div class="cred-tier-badge">${tierMeta.label}</div>
          <div class="cred-mini">
            <div class="cred-mini__avatar">${initials}</div>
            <div class="cred-mini__info">
              <div class="cred-mini__name">${w.name || '—'}</div>
              <div class="cred-mini__trade">${w.trade || 'General'}</div>
              <div class="cred-mini__stats">
                <div class="cred-mini__stat">
                  <span class="cred-mini__stat-val">${jobs}</span>
                  <span class="cred-mini__stat-label">Jobs</span>
                </div>
                <div class="cred-mini__stat">
                  <span class="cred-mini__stat-val">${trust.toFixed(1)}</span>
                  <span class="cred-mini__stat-label">Trust</span>
                </div>
                <div class="cred-mini__stat">
                  <span class="cred-mini__stat-val">${avgRat > 0 ? avgRat.toFixed(1)+'★' : '—'}</span>
                  <span class="cred-mini__stat-label">Rating</span>
                </div>
              </div>
            </div>
          </div>
          <button class="cred-flip-btn" onclick="flipCredCard('${cardId}')">
            View Credentials →
          </button>
        </div>
 
        <!-- BACK -->
        <div class="cred-card-back">
          <button class="cred-back-close" onclick="flipCredCard('${cardId}')">← Back</button>
          ${backHTML}
        </div>
 
      </div>
    </div>
    <p style="font-size:.65rem;color:#5a5550;text-align:center;margin-top:6px;letter-spacing:.05em">
      ID: ${verId} · Tap card to view full credentials
    </p>`;
}
 
function flipCredCard(cardId) {
  document.getElementById(cardId)?.classList.toggle('is-flipped');
}
// Load and show any active bargains (offers from workers on open jobs)
async function loadBargains() {
  try {
    const res = await fetch(`${FLASK}/api/client/bargains?user_id=${user.id}`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const bargains = data.bargains || [];
    renderBargainBadge(bargains.length); // show count on nav
    renderBargainsList(bargains);        // render in a bargains view
  } catch (e) { console.error('loadBargains:', e); }
}

function renderBargainBadge(count) {
  const badge = document.getElementById('bargain-badge'); // add this element to your HTML
  if (badge) badge.textContent = count > 0 ? count : '';
}
function renderBargainsList(bargains) {
  const el = document.getElementById('bargains-list'); // add to HTML
  if (!el) return;
  if (!bargains.length) {
    el.innerHTML = `<div class="empty-state"><span>🤝</span><p>No pending offers.</p></div>`;
    return;
  }
  el.innerHTML = bargains.map(b => `
    <div class="job-card" style="flex-direction:column;gap:10px">
      <p class="job-card__title">${b.job_title}</p>
      <p>Original: <strong>₦${Number(b.original_amount).toLocaleString()}</strong> → 
         Worker offers: <strong>₦${Number(b.proposed_price).toLocaleString()}</strong></p>
      <p>👷 ${b.worker_name} · ⭐ ${Number(b.worker_trust).toFixed(1)} · ${b.worker_jobs} jobs</p>
      ${b.message ? `<p style="color:var(--text-3);font-size:.82rem">"${b.message}"</p>` : ''}
      <div style="display:flex;gap:10px">
        <button class="btn btn--orange" onclick="respondBargain(${b.job_id}, 'accept')">✅ Accept ₦${Number(b.proposed_price).toLocaleString()}</button>
        <button class="btn" onclick="respondBargain(${b.job_id}, 'reject')" style="background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.3)">❌ Reject</button>
      </div>
    </div>`).join('');
}

async function respondBargain(jobId, action) {
  const res = await fetch(`${FLASK}/api/client/respond-bargain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ job_id: jobId, user_id: user.id, action })
  });
  const data = await res.json();
  if (data.success) {
    await loadJobs();
    await loadBargains();
    if (action === 'accept' && data.payment?.account_number) {
      Swal.fire({
        title: '✅ Offer Accepted!',
        html: `Transfer ₦${Number(data.payment.amount).toLocaleString()} to <strong>${data.payment.account_number}</strong> (${data.payment.bank_name}) to fund escrow.`,
        icon: 'success', confirmButtonColor: '#e85c00', background: '#181614', color: '#f0ede8'
      });
    } else {
      Swal.fire({ title: action === 'accept' ? 'Accepted!' : 'Rejected', icon: 'success', background: '#181614', color: '#f0ede8', confirmButtonColor: '#e85c00' });
    }
  } else {
    Swal.fire('Error', data.message, 'error');
  }
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

// Client reviews worker applications for their job: either assign them to the job or decline their application
async function reviewWorker(jobId, workerId, action) {
  const res  = await fetch(`${FLASK}/api/client/review-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      job_id:    jobId,
      user_id:   user.id,
      worker_id: workerId,
      action
    })
  });
  const data = await res.json();

  if (data.success) {
    modalOverlay.classList.remove('is-open');
    await loadJobs();
    await loadPendingWorkers();
    Swal.fire({
      title: action === 'assign' ? '✅ Worker Assigned!' : '❌ Worker Declined',
      text:  action === 'assign'
        ? 'Worker has been assigned and can now complete the job.'
        : 'Worker declined. They can no longer complete this job.',
      icon: 'success',
      confirmButtonColor: '#e85c00',
      background: '#181614', color: '#f0ede8'
    });
  } else {
    Swal.fire('Error', data.message, 'error');
  }
}

window.reviewWorker = reviewWorker;

async function loadPendingWorkers() {
  try {
    const res  = await fetch(
      `${FLASK}/api/client/job-applicants?user_id=${user.id}`,
      { credentials: 'include' }
    );
    if (!res.ok) return;
    const data = await res.json();
    const applicants = data.applicants || [];

    const badge = document.getElementById('pending-workers-badge');
    if (badge) badge.textContent = applicants.length > 0 ? applicants.length : '';

    renderPendingWorkersBanner(applicants);
  } catch (e) { console.error('loadPendingWorkers:', e); }
}

function renderPendingWorkersBanner(applicants) {
  const container = document.getElementById('pending-workers-banner');
  if (!container) return;

  if (!applicants.length) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = applicants.map(p => {
    const initials = p.worker_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    return `
      <div style="background:#1a0d00;border:1px solid rgba(232,92,0,.4);border-radius:12px;
                  padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(232,92,0,.15);
                    border:2px solid #e85c00;color:#e85c00;font-family:'Syne',sans-serif;
                    font-size:1rem;font-weight:800;display:grid;place-items:center;flex-shrink:0">
          ${initials}
        </div>
        <div style="flex:1;min-width:0">
          <p style="font-size:.7rem;letter-spacing:.08em;color:#e85c00;margin-bottom:2px">
            👷 WORKER APPLIED FOR YOUR JOB
          </p>
          <p style="font-weight:700;font-size:.9rem">${p.worker_name}</p>
          <p style="font-size:.75rem;color:#a09890;margin-top:1px">
            ${p.worker_trade || 'General'} · ⭐ ${Number(p.worker_trust).toFixed(1)} · ${p.worker_jobs} jobs done
          </p>
          <p style="font-size:.72rem;color:#5a5550;margin-top:1px">For: <strong>${p.title}</strong></p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="openWorkerPublicProfile(${p.worker_id})"
            style="background:#e85c00;color:#fff;border:none;border-radius:7px;
                   padding:7px 12px;font-size:.78rem;font-weight:600;cursor:pointer">
            👤 View Profile
          </button>
          <button onclick="reviewWorker(${p.job_id}, ${p.worker_id}, 'assign')"
            style="background:rgba(34,197,94,.12);color:#22c55e;
                   border:1px solid rgba(34,197,94,.3);border-radius:7px;
                   padding:6px 12px;font-size:.75rem;font-weight:600;cursor:pointer">
            ✅ Assign
          </button>
          <button onclick="reviewWorker(${p.job_id}, ${p.worker_id}, 'decline')"
            style="background:rgba(239,68,68,.08);color:#ef4444;
                   border:1px solid rgba(239,68,68,.3);border-radius:7px;
                   padding:6px 12px;font-size:.75rem;font-weight:600;cursor:pointer">
            ❌ Decline
          </button>
        </div>
      </div>`;
  }).join('');
}


// ADD these to client dashboard JS IIFE:
function getCertTier(jobsDone, avgRating) {
  const score = (jobsDone || 0) + ((avgRating || 0) * 4);
  if (score >= 40) return 'gold';
  if (score >= 15) return 'silver';
  return 'bronze';
}

function getTierLabel(tier) {
  return { bronze: '🥉 BRONZE CERTIFIED', silver: '🥈 SILVER CERTIFIED', gold: '🥇 GOLD VERIFIED' }[tier];
}

function certVerificationId(workerId) {
  return `SC-${String(workerId).padStart(5,'0')}-${(Date.now() % 1000000).toString(36).toUpperCase()}`;
}

function makeQRSVG(text, size = 54) {
  const cells = 9, cell = Math.floor(size / cells);
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  let squares = '';
  for (let r = 0; r < cells; r++)
    for (let c = 0; c < cells; c++) {
      const on = ((hash >> ((r*cells+c) % 30)) & 1) || (r<3&&c<3)||(r<3&&c>5)||(r>5&&c<3);
      if (on) squares += `<rect x="${c*cell}" y="${r*cell}" width="${cell-1}" height="${cell-1}" rx="1"/>`;
    }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${squares}</svg>`;
}
// Build the HTML for a worker's certificate, used on the back of the credential card and the public profile. If compact is true, use a tighter layout for the card back.
function buildCertHTML(profile, tier, verId, compact = false) {
  const name     = profile.name || 'Worker';
  const trade    = profile.trade || 'General';
  const jobs     = profile.jobs_completed || 0;
  const trust    = parseFloat(profile.trust_score || 0).toFixed(1);
  const stars    = '★'.repeat(Math.round(profile.trust_score||0)) + '☆'.repeat(5-Math.round(profile.trust_score||0));
  const skills   = profile.top_skills || [trade, 'GPS Verified', 'Escrow Payments'];
  const qrHTML   = makeQRSVG(verId);
  const tierLabel= getTierLabel(tier);
  const ps       = compact ? ' style="padding:24px 20px 20px"' : '';
  const ns       = compact ? ' style="font-size:1.3rem"' : '';
  const sealSVG  = tier === 'gold' ? `<div class="cert-seal"><svg viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="34" cy="34" r="32" stroke="rgba(212,160,23,.4)" stroke-width="1"/><text x="34" y="34" text-anchor="middle" font-size="6" fill="rgba(255,217,90,.7)">VERIFIED</text></svg></div>` : '';

  return `
    <div class="cert-${tier}"${ps}>
      ${sealSVG}
      <div class="cert-tier-chip">${tierLabel}</div>
      <div class="cert-name"${ns}>${name}</div>
      <div class="cert-tagline">${trade} · Geofence-Verified Worker</div>
      <div class="cert-divider"></div>
      <div class="cert-metrics">
        <div class="cert-metric"><div class="cert-metric__val">${jobs}</div><div class="cert-metric__label">Jobs Done</div></div>
        <div class="cert-metric"><div class="cert-metric__val">${trust}</div><div class="cert-metric__label">Trust Score</div></div>
        <div class="cert-metric"><div class="cert-metric__val">${stars.slice(0,5)}</div><div class="cert-metric__label">Rating</div></div>
      </div>
      <div class="cert-skills">${skills.map(s => `<span class="cert-skill-tag">${s}</span>`).join('')}</div>
      <div class="cert-footer">
        <div><div class="cert-id">ID: ${verId}</div><div class="cert-id" style="margin-top:4px">GPS-authenticated · Squad-secured</div></div>
        <div class="cert-qr">${qrHTML}</div>
      </div>
    </div>`;
}

function buildWorkerCredCard(workerData) {
  const w      = workerData.worker || workerData;
  const rs     = workerData.rating_summary || {};
  const jobs   = w.jobs_completed || 0;
  const trust  = parseFloat(w.trust_score || 0);
  const avgRat = parseFloat(rs.avg_rating || trust);
  const tier   = getCertTier(jobs, avgRat);
  const verId  = certVerificationId(w.id);
  const initials = (w.name||'W').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const cardId = `cred-${w.id}`;
  const tierMeta = {
    bronze: { label: 'Bronze Certified' },
    silver: { label: 'Silver Certified' },
    gold:   { label: 'Gold Verified'    }
  }[tier];
  const backHTML = buildCertHTML(
    { ...w, top_skills: [w.trade||'General','GPS Verified','Squad Secured'] },
    tier, verId, true
  );
  return `
    <div class="cred-card-wrap" id="${cardId}">
      <div class="cred-card-inner">
        <div class="cred-card-front cred-front-${tier}">
          <div class="cred-squad-badge">Verified by Squad</div>
          <div class="cred-tier-badge">${tierMeta.label}</div>
          <div class="cred-mini">
            <div class="cred-mini__avatar">${initials}</div>
            <div class="cred-mini__info">
              <div class="cred-mini__name">${w.name||'—'}</div>
              <div class="cred-mini__trade">${w.trade||'General'}</div>
              <div class="cred-mini__stats">
                <div class="cred-mini__stat"><span class="cred-mini__stat-val">${jobs}</span><span class="cred-mini__stat-label">Jobs</span></div>
                <div class="cred-mini__stat"><span class="cred-mini__stat-val">${trust.toFixed(1)}</span><span class="cred-mini__stat-label">Trust</span></div>
                <div class="cred-mini__stat"><span class="cred-mini__stat-val">${avgRat > 0 ? avgRat.toFixed(1)+'★' : '—'}</span><span class="cred-mini__stat-label">Rating</span></div>
              </div>
            </div>
          </div>
          <button class="cred-flip-btn" onclick="flipCredCard('${cardId}')">View Credentials →</button>
        </div>
        <div class="cred-card-back">
          <button class="cred-back-close" onclick="flipCredCard('${cardId}')">← Back</button>
          ${backHTML}
        </div>
      </div>
    </div>
    <p style="font-size:.65rem;color:#5a5550;text-align:center;margin-top:6px">ID: ${verId}</p>`;
}

function flipCredCard(cardId) {
  document.getElementById(cardId)?.classList.toggle('is-flipped');
}

async function fundEscrowForJob(jobId, amount) {
  const confirmed = await Swal.fire({
    title: 'Fund Escrow?',
    html: `Transfer ₦${Number(amount).toLocaleString()} to unlock this job for the worker.<br><br>
           <span style="font-size:.8rem;color:#a09890">Click the job card to see the account number.</span>`,
    icon: 'info',
    showCancelButton: true,
    confirmButtonText: 'View Payment Details',
    confirmButtonColor: '#e85c00',
    cancelButtonColor: '#333',
    background: '#181614', color: '#f0ede8'
  });

  if (confirmed.isConfirmed) {
    const job = allJobs.find(j => j.id === jobId);
    if (job) openJobModal(job);
  }
}

  window.respondBargain = respondBargain;
// Retry generating Squad account if it failed on job post
async function retryPaymentAccount(jobId) {
  Swal.fire({
    title: 'Generating…',
    allowOutsideClick: false,
    background: '#181614', color: '#f0ede8',
    didOpen: () => Swal.showLoading()
  });

  try {
    const res  = await fetch(`${FLASK}/api/client/retry-payment/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await res.json();

    if (data.success) {
      await loadJobs();
      Swal.fire({
        title: '✅ Payment Account Ready!',
        text:  'Click the job card to see the payment link.',
        icon:  'success',
        confirmButtonColor: '#e85c00',
        background: '#181614', color: '#f0ede8'
      });
      // Re-open modal with fresh data
      const job = allJobs.find(j => j.id === jobId);
      if (job) openJobModal(job);
    } else {
      Swal.fire('Error', data.message, 'error');
    }
  } catch (e) {
    Swal.fire('Network Error', 'Could not reach server.', 'error');
  }
}
// ── Init ──────────────────────────────────────────
async function init() {
  const ok = loadUser();
  if (!ok) return;
  await loadJobs();
  await loadBargains();
  await loadPendingWorkers();           
  setInterval(loadBargains, 30_000);
  setInterval(loadPendingWorkers, 20_000); 
}

init();

// ── Expose to global scope (needed for inline onclick= handlers) ──
window.toggleLikeMedia        = toggleLikeMedia;
window.openMediaComments      = openMediaComments;
window.openWorkerPublicProfile = openWorkerPublicProfile;
window.postJobComment         = postJobComment;
window.selectStar             = selectStar;
window.submitRating           = submitRating;
window.simulatePayment        = simulatePayment;
window.copyAccNum             = copyAccNum;
window.respondBargain         = respondBargain;
window.reviewWorker = reviewWorker;
window.flipCredCard        = flipCredCard;
window.buildWorkerCredCard = buildWorkerCredCard;



})();
// Demo payment verification — bypasses real Squad for hackathon demo
async function verifyPaymentDemo(jobId) {
  const res  = await fetch('http://127.0.0.1:5000/api/dev/simulate-payment', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ job_id: jobId })
  });
  const data = await res.json();

  if (data.success) {
    document.getElementById('modal-overlay').classList.remove('is-open');
    // Reload jobs so UI reflects funded status
    const stored = JSON.parse(localStorage.getItem('userData') || '{}');
    const res2   = await fetch(`http://127.0.0.1:5000/api/client/jobs?user_id=${stored.id}`, { credentials: 'include' });
    const jobs   = await res2.json();
    // Trigger a page reload — simplest way to show updated state
    Swal.fire({
      title: '✅ Payment Verified (Demo)',
      text:  data.message,
      icon:  'success',
      confirmButtonColor: '#e85c00',
      background: '#181614', color: '#f0ede8'
    }).then(() => window.location.reload());
  } else {
    alert('Simulate failed: ' + (data.error || 'unknown'));
  }
}
