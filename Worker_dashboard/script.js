(function () {
  'use strict';

  const FLASK       = 'https://skillchain-backend-gce5.onrender.com';
  window.FLASK      = FLASK;
  const LOGIN_PAGE  = '/Login/index.html';
  const SESSION_DUR = 30 * 60 * 1000;
  const HTML2CANVAS_URL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

  let allMyJobs    = [];
  let allOpenJobs  = [];
  let activeFilter = 'all';
  let user         = null;
  let shopMap = null, shopMarker = null, shopMapReady = false;
  let shopAccuracyCircle = null;
  let shopSelectedLat = null, shopSelectedLng = null;
  let heartbeatInterval = null;

  const sidebar      = document.getElementById('sidebar');
  const sidebarScrim = document.getElementById('sidebar-scrim');
  const burger       = document.getElementById('burger');
  const navItems     = document.querySelectorAll('.nav-item');
  const views        = document.querySelectorAll('.view');
  const filterBtns   = document.querySelectorAll('#my-jobs-filter-tabs .filter-tab');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose   = document.getElementById('modal-close');
  const modalBody    = document.getElementById('modal-body');
  const workerModalOverlay = document.getElementById('worker-modal-overlay');
  const workerModalBody    = document.getElementById('worker-modal-body');
  
  /* ══════════════════════════════════════════════
     ICON LIBRARY
  ══════════════════════════════════════════════ */
  const ICON = {
    check:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x:       '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    clock:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pin:     '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.2" stroke="currentColor" stroke-width="2"/></svg>',
    user:    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    box:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 7l8-4 8 4M4 7v10l8 4 8-4V7M4 7l8 4 8-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search:  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wallet:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M2 10h20" stroke="currentColor" stroke-width="1.8"/></svg>',
    alert:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>',
    download:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 4v11M7 11l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    shield:  '<svg width="46" height="46" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '★', starEmpty: '☆'
  };
  function ic(name) { return ICON[name] || ''; }

  const TRADE_ICON = {
    Mechanic:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 00-5.6 5.1L3 17.5V21h3.5l6.1-6.1a4 4 0 005.1-5.6l-2.6 2.6-2-2 2.6-2.6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Electrician:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Plumber:         '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4h6v6a4 4 0 004 4h2v6h-6v-6a4 4 0 00-4-4H6V4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Carpenter:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 21l7-7M14 3l7 7-9 9-7-7 9-9z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    Painter:         '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3c4 0 8 2 8 6 0 2-1.5 3-3 3h-2a2 2 0 000 4 2 2 0 010 4c-5 0-9-4-9-9a8 8 0 016-8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    Welder:          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3s-3 3-3 6a3 3 0 006 0c0-1-1-2-1-3 1 1 3 2 3 4a5 5 0 01-10 0c0-4 5-7 5-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    Tailor:          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.7"/><circle cx="7" cy="17" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M20 5L5 15M9 9l11 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    Mason:           '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="7" height="5" stroke="currentColor" stroke-width="1.6"/><rect x="14" y="10" width="7" height="5" stroke="currentColor" stroke-width="1.6"/><rect x="8.5" y="5" width="7" height="5" stroke="currentColor" stroke-width="1.6"/></svg>',
    'HVAC Technician':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M4.2 6.5l15.6 11M19.8 6.5L4.2 17.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    Other:           '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/></svg>'
  };
  function tradeIcon(trade) { return TRADE_ICON[trade] || TRADE_ICON.Other; }

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
     SHOP LOCATION PICKER
  ══════════════════════════════════════════════ */
  

  function makeShopIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="width:26px;height:26px;background:#E85C00;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.35)"></div>`,
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -28]
    });
  }

  function initShopMap() {
    if (shopMapReady) return;
    const mapEl = document.getElementById('shop-map');
    if (!mapEl || mapEl.offsetWidth === 0) { setTimeout(initShopMap, 100); return; }

    const p = user.profile || {};
    const startLat = p.shop_lat ? parseFloat(p.shop_lat) : 6.5244;
    const startLng = p.shop_lng ? parseFloat(p.shop_lng) : 3.3792;

    shopMap = L.map('shop-map', { zoomControl: true }).setView([startLat, startLng], p.shop_lat ? 15 : 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(shopMap);

    shopMap.on('click', async e => { await setShopLocation(e.latlng.lat, e.latlng.lng); });

    if (p.shop_lat && p.shop_lng) {
      shopMarker = L.marker([startLat, startLng], { icon: makeShopIcon() }).addTo(shopMap);
      shopSelectedLat = startLat; shopSelectedLng = startLng;
      document.getElementById('shop-address-text').textContent = p.shop_address || 'Saved location';
      document.getElementById('shop-address-coords').textContent = `${startLat.toFixed(5)}, ${startLng.toFixed(5)}`;
      document.getElementById('shop-address-display').style.display = 'block';
      document.getElementById('shop-map-hint').style.display = 'none';
    }

    shopMapReady = true;
    setTimeout(() => shopMap.invalidateSize(), 50);
  }

  async function setShopLocation(lat, lng, addressOverride, accuracyMeters) {
    shopSelectedLat = lat; shopSelectedLng = lng;
    if (shopMarker) shopMarker.setLatLng([lat, lng]);
    else shopMarker = L.marker([lat, lng], { icon: makeShopIcon() }).addTo(shopMap);
    shopMap.panTo([lat, lng]);

    // ── Accuracy circle ──
    if (shopAccuracyCircle) { shopMap.removeLayer(shopAccuracyCircle); shopAccuracyCircle = null; }
    if (accuracyMeters) {
      shopAccuracyCircle = L.circle([lat, lng], {
        radius: accuracyMeters,
        color: '#E85C00',
        fillColor: '#E85C00',
        fillOpacity: 0.12,
        weight: 1
      }).addTo(shopMap);
    }

    let address = addressOverride;
    if (!address) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const d = await r.json();
        address = d.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      } catch { address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
    }

    document.getElementById('shop-address-text').textContent = address;
    document.getElementById('shop-address-coords').textContent = accuracyMeters
      ? `${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.round(accuracyMeters)}m)`
      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    document.getElementById('shop-address-display').style.display = 'block';
    document.getElementById('shop-map-hint').style.display = 'none';
    window._shopAddressPending = address;
}

  function clearShopLocation() {
    shopSelectedLat = null; shopSelectedLng = null;
    if (shopMarker) { shopMap.removeLayer(shopMarker); shopMarker = null; }
    document.getElementById('shop-address-display').style.display = 'none';
    document.getElementById('shop-map-hint').style.display = 'block';
    window._shopAddressPending = null;
  }
  document.getElementById('btn-clear-shop-location')?.addEventListener('click', clearShopLocation);

  document.getElementById('btn-shop-my-loc')?.addEventListener('click', () => {
    if (!navigator.geolocation) { Swal.fire({ title: 'Geolocation not supported', icon: 'error', ...swalTheme() }); return; }
    const btn = document.getElementById('btn-shop-my-loc');
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner spinner--dark" style="width:12px;height:12px;display:inline-block;vertical-align:-1px;margin-right:6px"></span>Locating…';
    btn.disabled = true;

    let bestPos = null;
    const watchId = navigator.geolocation.watchPosition(
      pos => {
        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
          bestPos = pos;
          // Live-update the map as accuracy improves, so it doesn't feel frozen
          if (!shopMapReady) initShopMap();
          setShopLocation(pos.coords.latitude, pos.coords.longitude, null, pos.coords.accuracy);
        }
      },
      err => { /* individual errors during polling are non-fatal — only the final timeout matters */ },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      btn.innerHTML = orig; btn.disabled = false;

      if (!bestPos) {
        Swal.fire({
          title: 'Could not get location',
          text: 'Try again, or search/tap the map to set your shop location manually.',
          icon: 'error', ...swalTheme()
        });
        return;
      }
      shopMap.setZoom(16);
    }, 5000);
});

  let shopSearchTimeout = null;
  document.getElementById('shop-location-search-input')?.addEventListener('input', function () {
    clearTimeout(shopSearchTimeout);
    const q = this.value.trim();
    const results = document.getElementById('shop-location-results');
    if (q.length < 3) { results.classList.remove('is-open'); return; }

    shopSearchTimeout = setTimeout(async () => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=ng`);
        const places = await r.json();
        if (!places.length) { results.classList.remove('is-open'); return; }

        results.innerHTML = places.map((place, i) =>
          `<div class="location-result" data-idx="${i}" data-lat="${place.lat}" data-lng="${place.lon}" data-name="${place.display_name}">
             <strong>${place.display_name.split(',')[0]}</strong>
             <span>${place.display_name.split(',').slice(1, 3).join(',')}</span>
           </div>`).join('');
        results.classList.add('is-open');

        results.querySelectorAll('.location-result').forEach(item => {
          item.addEventListener('click', async () => {
            const lat = parseFloat(item.dataset.lat), lng = parseFloat(item.dataset.lng), name = item.dataset.name;
            if (!shopMapReady) initShopMap();
            await setShopLocation(lat, lng, name);
            shopMap.setView([lat, lng], 16);
            document.getElementById('shop-location-search-input').value = '';
            results.classList.remove('is-open');
          });
        });
      } catch (e) { console.error('Shop location search error:', e); }
    }, 400);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.location-search') && e.target.id !== 'shop-location-search-input') {
      document.getElementById('shop-location-results')?.classList.remove('is-open');
    }
  });

  document.getElementById('btn-save-shop-location')?.addEventListener('click', async () => {
    if (!shopSelectedLat || !shopSelectedLng) {
      Swal.fire({ title: 'No location selected', text: 'Search, use your location, or tap the map first.', icon: 'warning', confirmButtonColor: '#E85C00', ...swalTheme() });
      return;
    }
    const btn = document.getElementById('btn-save-shop-location');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res  = await fetch(`${FLASK}/api/worker/update-profile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          user_id: user.id,
          shop_lat: shopSelectedLat,
          shop_lng: shopSelectedLng,
          shop_address: window._shopAddressPending || document.getElementById('shop-address-text').textContent
        })
      });
      const data = await res.json();
      if (data.success) {
        user.profile = user.profile || {};
        user.profile.shop_lat = shopSelectedLat;
        user.profile.shop_lng = shopSelectedLng;
        user.profile.shop_address = window._shopAddressPending || document.getElementById('shop-address-text').textContent;
        Swal.fire({ title: 'Shop location saved', icon: 'success', timer: 1400, showConfirmButton: false, ...swalTheme() });
      } else {
        Swal.fire({ title: 'Could not save', text: data.message, icon: 'error', confirmButtonColor: '#E85C00', ...swalTheme() });
      }
    } catch {
      Swal.fire({ title: 'Network error', icon: 'error', confirmButtonColor: '#E85C00', ...swalTheme() });
    } finally {
      btn.disabled = false; btn.textContent = 'Save Shop Location';
    }
  });

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
    if (viewId === 'profile') {
    renderProfile();
    if (!shopMapReady) requestAnimationFrame(() => requestAnimationFrame(initShopMap));
  else shopMap.invalidateSize();
}
    if (viewId === 'my-bargains') loadMyBargains();
    if (viewId === 'messages') loadConversations();
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
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        localStorage.removeItem('userData');
        fetch(`${FLASK}/logout-api`, { method: 'POST', credentials: 'include' })
          .finally(() => window.location.replace(LOGIN_PAGE));
      }
    });
  });


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
  const isDone = ['paid', 'verified'].includes(c.job_status);
  const statusBadge = isDone 
    ? `<span style="font-size:.65rem;color:var(--text-3);background:var(--surface-sunk);padding:2px 8px;border-radius:99px">Completed</span>`
    : `<span style="font-size:.65rem;color:var(--success);background:rgba(22,163,74,.1);padding:2px 8px;border-radius:99px">Active</span>`;
  
  return `
    <div class="job-card" data-job-id="${c.job_id}" data-other-id="${c.other_id}" style="cursor:pointer">
      <div class="job-card__icon" style="border-radius:50%">${initials}</div>
      <div class="job-card__info">
        <p class="job-card__title">${c.other_name} <span style="font-weight:600;color:var(--accent);font-size:.8rem">· ${c.job_title}</span></p>
        <div class="job-card__meta" style="gap:8px;align-items:center">
          ${statusBadge}
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${preview}</span>
        </div>
      </div>
      <div class="job-card__right">
        <span style="font-size:.72rem;color:var(--text-3)">${timeAgo}</span>
        ${c.unread_count > 0 ? `<span class="nav-item__badge is-visible" style="position:static">${c.unread_count}</span>` : ''}
      </div>
    </div>`;
}

const AVATAR_PALETTE = ['#E85C00','#2563EB','#16A34A','#7C3AED','#DB2777','#0891B2','#CA8A04'];
function avatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function renderConversationsList(conversations) {
  const el = document.getElementById('conversations-list');
  if (!el) return;

  conversations.sort((a, b) => {
    const aActive = !['paid', 'verified'].includes(a.job_status);
    const bActive = !['paid', 'verified'].includes(b.job_status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(b.last_at || 0) - new Date(a.last_at || 0);
  });

  if (!conversations.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('comment')}</div><p>No conversations yet.</p></div>`;
    return;
  }
  el.innerHTML = conversations.map(conversationRowHTML).join('');
  el.querySelectorAll('.job-card').forEach(card => {
    card.addEventListener('click', () => {
      openChatThread(parseInt(card.dataset.jobId), parseInt(card.dataset.otherId));
    });
  });
}


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
    window.USER_ID = user.id; // expose for role_switch module

    const initial  = user.name ? user.name[0].toUpperCase() : 'W';
    const hr       = new Date().getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('welcome-name').textContent  = `${greeting}, ${user.name.split(' ')[0]}`;
    document.getElementById('overview-date').textContent = new Date().toLocaleDateString('en-NG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).toUpperCase();
    document.getElementById('nav-name').textContent      = user.name;
    document.getElementById('nav-avatar').textContent    = initial;
    document.getElementById('topbar-avatar').textContent = initial;
    return true;
  }

  async function loadProfile() {
    try {
      const res  = await fetch(`${FLASK}/api/worker/profile?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      user.profile = data;
      renderTrustCard(data.trust_score, data.jobs_completed);
    } catch (e) {
      console.error('loadProfile:', e);
      renderTrustCard(user.trust_score || 0, user.jobs_completed || 0);
    }
  }

  async function loadMyJobs() {
    try {
      const res     = await fetch(`${FLASK}/api/worker/jobs?user_id=${user.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const data    = await res.json();
      const newJobs = data.jobs || [];
      const removed = allMyJobs.filter(old => !newJobs.find(n => n.id === old.id));
      allMyJobs = newJobs;

      
      if (document.getElementById('view-profile')?.classList.contains('is-active')) {
        renderProfile();
      }

      removed.forEach(r => {
        if (r.status === 'pending_review') {
          Swal.fire({ title: 'Job removed', text: `"${r.title}" was deleted by the client.`, icon: 'warning', confirmButtonColor: '#E85C00', timer: 5000, ...swalTheme() });
        }
      });

      renderRecentJobs(allMyJobs.slice(0, 5));
      renderMyJobsList(allMyJobs);
      if (user.profile) renderStats(user.profile);
    } catch (e) { console.error('loadMyJobs:', e); }
  }

    let currentJobTypeFilter = 'all';

  async function loadOpenJobs() {
    const query = (document.getElementById('job-search-text')?.value || '').trim();
    const trade = document.getElementById('job-search-trade')?.value || '';
    const list  = document.getElementById('open-jobs-list');
    list.innerHTML = `<div class="skeleton-list"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div>`;
    try {
      const params = new URLSearchParams({ user_id: user.id });
      if (query) params.append('q', query);
      if (trade && currentJobTypeFilter !== 'quick_gig') params.append('trade', trade);
      if (currentJobTypeFilter !== 'all') params.append('job_type', currentJobTypeFilter);
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

  document.querySelectorAll('#find-jobs-type-filter .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#find-jobs-type-filter .filter-tab').forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      currentJobTypeFilter = tab.dataset.jobtype;
      const tradeField = document.getElementById('job-search-trade')?.closest('.search-bar__field');
      if (tradeField) tradeField.style.display = currentJobTypeFilter === 'quick_gig' ? 'none' : '';
      loadOpenJobs();
    });
  });

  /* ══════════════════════════════════════════════
     STATUS BADGES
  ══════════════════════════════════════════════ */
  function statusBadge(status) {
    const labels = { open:'Open', pending_review:'Awaiting Approval', assigned:'Assigned', pending_verification:'Pending', verified:'Verified', paid:'Paid', disputed:'Disputed' };
    return `<span class="badge badge--${status}">${labels[status] || status}</span>`;
  }

  /* ══════════════════════════════════════════════
     TRUST CARD
  ══════════════════════════════════════════════ */
  const RING_CIRCUMFERENCE = 2 * Math.PI * 66;

  function renderTrustCard(score, jobsDone) {
    score = parseFloat(score) || 0;
    const pct    = Math.min(100, Math.round((score / 5) * 100));
    const filled = Math.round(score);
    document.getElementById('trust-score-val').textContent       = score.toFixed(1);
    document.getElementById('trust-verified-pill').innerHTML     = `${ic('check')} ${jobsDone || 0} Verified Job${jobsDone === 1 ? '' : 's'}`;
    document.getElementById('trust-stars').innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="${i < filled ? 'is-filled' : ''}">${i < filled ? ICON.star : ICON.starEmpty}</span>`).join('');
    requestAnimationFrame(() => {
      const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * pct / 100);
      document.getElementById('trust-ring-circle').style.strokeDasharray  = RING_CIRCUMFERENCE;
      document.getElementById('trust-ring-circle').style.strokeDashoffset = offset;
    });
  }


// Helper for monthly earnings
function getThisMonthEarnings() {
  const now = new Date();
  return allMyJobs
    .filter(j => j.status === 'paid' && new Date(j.paid_at || j.created_at).getMonth() === now.getMonth())
    .reduce((s, j) => s + parseFloat(j.amount || 0), 0);
}


  /* ══════════════════════════════════════════════
     STATS + LIFECYCLE + SPARKLINE
  ══════════════════════════════════════════════ */
function renderStats(profile) {
    profile = profile || {};
    const done   = allMyJobs.filter(j => ['verified','paid'].includes(j.status)).length;
    const active = allMyJobs.filter(j => ['assigned','pending_review','pending_verification'].includes(j.status)).length;

    // Calculate from actual jobs, not the stale DB cache
    const totalEarned = allMyJobs
    .filter(j => j.status === 'paid')
    .reduce((s,j) => s + parseFloat(j.artisan_gets || j.amount || 0), 0);
    
    const availableBalance = Math.max(0, totalEarned - parseFloat(profile.total_withdrawn || 0));
    const pendingEscrow    = allMyJobs.filter(j => ['assigned','pending_verification','verified'].includes(j.status)).reduce((s,j) => s + parseFloat(j.amount), 0);

    document.getElementById('stat-done').textContent   = done;
    document.getElementById('stat-active').textContent = active;

    const balEl  = document.getElementById('stat-earned');
    const hintEl = document.getElementById('stat-earned-hint');
    if (balEl)  { balEl.textContent = '₦' + availableBalance.toLocaleString(); balEl.classList.toggle('earn-balance__val--neg', availableBalance < 0); }
    if (hintEl)   hintEl.textContent = availableBalance < 0 ? 'Platform fee deduction pending' : 'Available for withdrawal';

        // NEW — wire up the paycard
    const paycardBalEl = document.getElementById('paycard-balance');
    if (paycardBalEl) paycardBalEl.textContent = availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const paycardEscEl = document.getElementById('paycard-escrow');
    if (paycardEscEl) paycardEscEl.textContent = '₦' + pendingEscrow.toLocaleString();

    const paycardNameEl = document.getElementById('paycard-name');
    if (paycardNameEl) paycardNameEl.textContent = (user.name || 'Worker').toUpperCase();

    const escEl = document.getElementById('stat-escrow');
    if (escEl) escEl.textContent = '₦' + pendingEscrow.toLocaleString();

    const sub = document.getElementById('welcome-sub');
    if (sub) {
      const trustMsg = done === 0 ? 'Your trust score is building up.' : 'Keep up the great work.';
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

    const gigBadge = document.getElementById('quick-gig-badge');
    if (gigBadge) {
      const gigCount = profile.quick_gigs_completed || 0;
      if (gigCount > 0) {
        gigBadge.style.display = 'inline-flex';
        gigBadge.innerHTML = `⚡ ${gigCount} Quick Gig${gigCount === 1 ? '' : 's'} Completed`;
      } else {
        gigBadge.style.display = 'none';
      }
    }

    renderSparkline();
    renderLifecycle();
  }


  const LIFECYCLE_LABELS = ['Assigned','In Progress','Review','Done'];
function renderLifecycle() {
  let step = 0;
  if (allMyJobs.some(j => j.status === 'pending_verification')) step = 2;
  else if (allMyJobs.some(j => j.status === 'assigned'))        step = 1;
  else if (allMyJobs.some(j => ['verified','paid'].includes(j.status))) step = 3;
  const el = document.getElementById('lifecycle-row');
  if (!el) return;
  el.innerHTML = LIFECYCLE_LABELS.map((label, i) => {
    const cls     = i < step ? 'lifecycle-step--done' : i === step ? 'lifecycle-step--active' : '';
    const content = i < step ? ic('check') : (i + 1);
    const conn    = i < LIFECYCLE_LABELS.length - 1 ? `<div class="lifecycle-connector ${i < step ? 'is-done' : ''}"></div>` : '';
    return `<div class="lifecycle-step ${cls}"><div class="lifecycle-dot">${content}</div><span class="lifecycle-step__label">${label}</span></div>${conn}`;
  }).join('');
}

  function renderSparkline() {
    const el = document.getElementById('sparkline-bars');
    if (!el) return;
    const weeks  = 12, now = Date.now(), weekMs = 7*24*60*60*1000;
    const buckets = Array(weeks).fill(0);
    allMyJobs.filter(j => j.status === 'paid').forEach(j => {
      const weeksAgo = Math.floor((now - new Date(j.paid_at || j.created_at).getTime()) / weekMs);
      if (weeksAgo >= 0 && weeksAgo < weeks) buckets[weeks - 1 - weeksAgo] += Number(j.amount || 0);
    });
    const max = Math.max(...buckets, 1);
    el.innerHTML = buckets.map((v, i) => {
      const h = Math.max(3, Math.round((v / max) * 44));
      return `<div class="sparkline__bar ${i === weeks-1 ? 'is-current' : ''}" style="height:${h}px" title="₦${v.toLocaleString()}"></div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════
     JOB CARDS
  ══════════════════════════════════════════════ */
  function myJobCardHTML(job) {
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' });
    let rightBtn = '';
    if (job.status === 'assigned')           rightBtn = `<button class="complete-btn" data-job-id="${job.id}">Complete <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
    else if (job.status === 'pending_review') rightBtn = `<span class="awaiting-tag">${ic('clock')} Awaiting Approval</span>`;
    else if (job.status === 'verified')       rightBtn = `<span class="awaiting-tag">${ic('clock')} Awaiting Client Review</span>`;
    return `
      <div class="job-card" data-job-id="${job.id}">
        <div class="job-card__icon">${job.job_type === 'quick_gig'
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
          : tradeIcon(job.trade)}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">${statusBadge(job.status)}<span>${ic('pin')} ${job.site_address||'—'}</span><span>${date}</span></div>
        </div>
        <div class="job-card__right">
          <span class="job-card__amount">₦${Number(job.amount).toLocaleString()}</span>
          <span class="job-card__amount-hint">Fixed Rate</span>
          ${rightBtn}
        </div>
      </div>`;
  }

  function renderRecentJobs(jobs) {
    const el    = document.getElementById('recent-jobs-list');
    const empty = document.getElementById('recent-empty');
    if (!jobs.length) { if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    el.innerHTML = jobs.map(myJobCardHTML).join('');
    attachMyJobListeners(el);
  }

  function renderMyJobsList(jobs) {
    const filtered = activeFilter === 'all' ? jobs : jobs.filter(j => j.status === activeFilter);
    const el = document.getElementById('my-jobs-list');
    el.innerHTML = filtered.length
      ? filtered.map(myJobCardHTML).join('')
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
    const date = new Date(job.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' });
    return `
      <div class="job-card job-card--open" data-job-id="${job.id}">
        <div class="job-card__icon">${job.job_type === 'quick_gig'
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
          : tradeIcon(job.trade)}</div>
        <div class="job-card__info">
          <p class="job-card__title">${job.title}</p>
          <div class="job-card__meta">
            <span>${job.trade||'General'}</span>
            <span>${ic('pin')} ${job.site_address||'—'}</span>
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

async function openAcceptModal(job) {
  window._activeAcceptJobId = job.id;
  const hasShop = user.profile && user.profile.shop_lat && user.profile.shop_lng;

  modalBody.innerHTML = `
    <p class="modal-title">${job.title}</p>
    <p class="modal-amount">₦${Number(job.amount).toLocaleString()}</p>
    ${statusBadge('open')}
    <div class="modal-divider"></div>
    <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description||'—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">${ic('pin')} ${job.site_address||'—'}</p></div>
    <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade||'—'}</p></div>
    ${job.client_name ? `<div class="modal-field"><p class="modal-field__label">Posted By</p><p class="modal-field__val">${ic('user')} ${job.client_name}</p></div>` : ''}
    <button class="btn btn--secondary btn--wide" style="margin-top:8px" onclick="openChatThread(${job.id}, ${job.client_id})">${ic('comment')} Message Client</button>
    <div class="modal-divider"></div>
    ${hasShop ? `
      <div class="modal-field" style="margin-bottom:10px">
        <p class="modal-field__label">Where will this job happen?</p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer">
            <input type="radio" name="accept-location" value="client_site" checked>
            <span style="font-size:.85rem">${ic('pin')} I'll go to the client's site (${job.site_address||'—'})</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer">
            <input type="radio" name="accept-location" value="worker_shop">
            <span style="font-size:.85rem">${ic('pin')} Client brings it to my shop (${user.profile.shop_address||'Saved location'})</span>
          </label>
        </div>
      </div>` : ''}
    <button class="btn btn--primary btn--wide" id="confirm-accept-btn">Accept at ₦${Number(job.amount).toLocaleString()}</button>
    <div id="bargain-slot"></div>`;
  modalOverlay.classList.add('is-open');

  const acceptBtn = document.getElementById('confirm-accept-btn');
  acceptBtn.addEventListener('click', () => {
    const chosen = hasShop
      ? (document.querySelector('input[name="accept-location"]:checked')?.value || 'client_site')
      : 'client_site';
    acceptJob(job.id, acceptBtn, acceptBtn.textContent, chosen);
  });

  const slot = document.getElementById('bargain-slot');
  slot.innerHTML = `<div style="padding:14px 0;text-align:center;color:var(--text-3);font-size:.8rem">${ic('clock')} Checking offer status…</div>`;

  try {
    const res  = await fetch(`${FLASK}/api/worker/bargain-status?job_id=${job.id}&worker_id=${user.id}`, { credentials: 'include' });
    const data = await res.json();

    if (window._activeAcceptJobId !== job.id) return;

    if (data.pending) {
      if (data.initiated_by === 'client') {
        slot.innerHTML = `
          <div class="notice notice--warning" style="margin-top:16px">
            <p class="notice__title">${ic('alert')} Client sent you an offer — ₦${Number(data.proposed_price).toLocaleString()}</p>
            <p>Respond to it from <strong>My Bargains</strong> before sending your own.</p>
            <button class="btn btn--secondary btn--wide" style="margin-top:10px" onclick="modalOverlay.classList.remove('is-open'); showView('my-bargains')">Go to My Bargains</button>
          </div>`;
      } else {
        slot.innerHTML = `
          <div class="notice notice--warning" style="margin-top:16px">
            <p class="notice__title">${ic('clock')} Waiting for client to respond</p>
            <p>You already sent a counter-offer of ₦${Number(data.proposed_price).toLocaleString()} on this job.</p>
          </div>`;
      }
      return;
    }

    renderBargainBox(slot, job);
  } catch (e) {
    console.error('bargain-status check failed:', e);
    if (window._activeAcceptJobId !== job.id) return;
    renderBargainBox(slot, job);
  }
}

async function acceptJob(jobId, btn, originalText, requestedLocation) {
  if (btn) { btn.disabled = true; btn.textContent = 'Accepting…'; }
  try {
    const res  = await fetch(`${FLASK}/api/worker/accept-job`, {
      method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
      body: JSON.stringify({ job_id:jobId, user_id:user.id, requested_location: requestedLocation || 'client_site' })
    });
    const data = await res.json();
    if (data.success) {
      modalOverlay.classList.remove('is-open');
      await loadMyJobs(); await loadOpenJobs();
      Swal.fire({ title:'Job accepted', text:'Application sent. Wait for client approval.', icon:'success', confirmButtonColor:'#E85C00', ...swalTheme() });
    } else {
      Swal.fire({ title:'Error', text:data.message||'Could not accept job.', icon:'error', ...swalTheme() });
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  } catch {
    Swal.fire({ title:'Network error', text:'Could not reach the server.', icon:'error', ...swalTheme() });
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  }
}

function renderBargainBox(slot, job) {
  slot.innerHTML = `
    <div class="bargain-box">
      <p class="bargain-box__label">Counter-Offer</p>
      <input type="number" id="bargain-price-input" placeholder="Your price, e.g. 12000" min="100" step="100">
      <textarea id="bargain-message-input" placeholder="Optional message to client…"></textarea>
      <button class="btn btn--secondary btn--wide" id="submit-bargain-btn">Send Counter-Offer</button>
      <p class="bargain-box__err" id="bargain-err"></p>
    </div>`;

  const submitBtn = document.getElementById('submit-bargain-btn');
  submitBtn.addEventListener('click', async () => {
    const price = parseFloat(document.getElementById('bargain-price-input').value);
    const msg   = document.getElementById('bargain-message-input').value.trim();
    const errEl = document.getElementById('bargain-err');
    errEl.textContent = '';
    if (!price || price < 100) { errEl.textContent = 'Enter a valid price (min ₦100).'; return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Sending…';
    try {
      const res  = await fetch(`${FLASK}/api/worker/bargain`, {
        method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
        body: JSON.stringify({ job_id:job.id, user_id:user.id, proposed_price:price, message:msg })
      });
      const data = await res.json();
      if (data.success) {
        modalOverlay.classList.remove('is-open');
        Swal.fire({ title:'Offer sent', text:`Counter-offer of ₦${price.toLocaleString()} sent.`, icon:'success', confirmButtonColor:'#E85C00', ...swalTheme() });
      } else {
        errEl.textContent = data.message || 'Could not send offer.';
        submitBtn.disabled = false; submitBtn.textContent = 'Send Counter-Offer';
      }
    } catch { errEl.textContent = 'Network error.'; submitBtn.disabled = false; submitBtn.textContent = 'Send Counter-Offer'; }
  });
}

  /* ══════════════════════════════════════════════
     MY JOB DETAIL MODAL
  ══════════════════════════════════════════════ */
  function openMyJobModal(job) {
    const created  = new Date(job.created_at).toLocaleString('en-NG');
    const verified = job.verified_at ? new Date(job.verified_at).toLocaleString('en-NG') : '—';
    let actionBtn  = '';
    if (job.status === 'assigned') {
      actionBtn = `<button class="btn btn--primary btn--wide" id="modal-complete-btn" data-job-id="${job.id}">${ic('pin')} Submit Proof of Presence</button>`;
    } else if (job.status === 'pending_review') {
      actionBtn = `<div class="notice notice--warning"><p class="notice__title">${ic('clock')} Awaiting Client Approval</p><p>The client will assign or decline your application.</p></div>`;
    } else if (job.status === 'verified') {
      const deadline = job.review_deadline ? new Date(job.review_deadline).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : null;
      actionBtn = `<div class="notice notice--warning"><p class="notice__title">${ic('clock')} Awaiting Client Review</p><p>Proof submitted. ${deadline ? `Auto-releases by <strong>${deadline}</strong>.` : ''}</p></div>`;
    }
    modalBody.innerHTML = `
      <p class="modal-title">${job.title}</p>
      <p class="modal-amount">₦${Number(job.amount).toLocaleString()}</p>
      ${statusBadge(job.status)}
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Description</p><p class="modal-field__val">${job.description||'—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Site Address</p><p class="modal-field__val">${ic('pin')} ${job.site_address||'—'}</p></div>
      <div class="modal-field"><p class="modal-field__label">Trade</p><p class="modal-field__val">${job.trade||'—'}</p></div>
      <div class="modal-divider"></div>
      <div class="modal-field"><p class="modal-field__label">Accepted</p><p class="modal-field__val">${created}</p></div>
      <div class="modal-field"><p class="modal-field__label">Verified At</p><p class="modal-field__val">${verified}</p></div>
      ${job.distance_meters != null ? `<div class="modal-field"><p class="modal-field__label">GPS Distance</p><p class="modal-field__val">${Number(job.distance_meters).toFixed(0)}m from site</p></div>` : ''}
      ${job.transfer_reference ? `<div class="modal-field"><p class="modal-field__label">Transfer Ref</p><p class="modal-field__val" style="font-family:var(--font-mono);font-size:.8rem">${job.transfer_reference}</p></div>` : ''}
      ${actionBtn ? `<div class="modal-actions">${actionBtn}</div>` : ''}`;
    modalOverlay.classList.add('is-open');
    document.getElementById('modal-complete-btn')?.addEventListener('click', () => {
      window.location.href = `/Complete_job/index.html?job_id=${document.getElementById('modal-complete-btn').dataset.jobId}`;
    });
  }

  modalClose?.addEventListener('click', e => { e.stopPropagation(); modalOverlay.classList.remove('is-open'); });
  modalOverlay?.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('is-open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modalOverlay.classList.remove('is-open'); });

  /* ══════════════════════════════════════════════
     EARNINGS
  ══════════════════════════════════════════════ */
  function renderEarnings() {
    const paid        = allMyJobs.filter(j => j.status === 'paid');
    const pending     = allMyJobs.filter(j => ['assigned','pending_verification','verified'].includes(j.status));
    const totalEarned = paid.reduce((s,j) => s + parseFloat(j.amount), 0);
    const withdrawn   = parseFloat((user.profile||{}).total_withdrawn || 0);
    const available   = totalEarned - withdrawn;
    const pendAmt     = pending.reduce((s,j) => s + parseFloat(j.amount), 0);

    document.getElementById('earn-total').textContent   = '₦' + available.toLocaleString();
    document.getElementById('earn-count').textContent   = paid.length;
    document.getElementById('earn-pending').textContent = '₦' + pendAmt.toLocaleString();

    const list = document.getElementById('earnings-list');
    list.innerHTML = paid.length ? paid.map(job => {
      const date = new Date(job.paid_at || job.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
      return `<div class="payment-row">
        <div class="payment-row__icon">${ic('wallet')}</div>
        <div class="payment-row__info"><p class="payment-row__title">${job.title}</p><p class="payment-row__date">${date} · ${job.transfer_reference||'No ref'}</p></div>
        <span class="payment-row__amount">₦${Number(job.amount).toLocaleString()}</span>
      </div>`;
    }).join('') : `<div class="empty-state"><div class="icon-sq">${ic('wallet')}</div><p>No earnings yet.</p></div>`;
  }

  /* ══════════════════════════════════════════════
     PROFILE — FULL UPDATED VERSION
  ══════════════════════════════════════════════ */
  function renderProfile() {
    const p       = user.profile || {};
    const name    = p.name  || user.name  || '—';
    const trade   = p.trade || user.trade || '—';
    const email   = p.email || user.email || '—';
    const phone   = p.phone || '';
    const bio     = p.bio   || '';
    const score   = parseFloat(p.trust_score || 0).toFixed(1);
    const initial = name[0]?.toUpperCase() || 'W';

    // ── Avatar ────────────────────────────────────────────────────────────
    const avatarImg     = document.getElementById('profile-avatar-img');
    const avatarInitial = document.getElementById('profile-avatar-initial');
    // Priority: server path → localStorage cache → initial letter
    const serverPhoto = p.profile_photo_path || null;
    const localPhoto  = localStorage.getItem(`sc-avatar-${user.id}`);
    const photoSrc    = serverPhoto || localPhoto;

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

    // ── Basic info ────────────────────────────────────────────────────────
    document.getElementById('profile-name').textContent  = name;
    document.getElementById('profile-trade').textContent = trade;
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-trust').textContent = score;

    const phoneEl = document.getElementById('profile-phone');
    if (phoneEl) { phoneEl.textContent = phone ? '📞 ' + phone : ''; phoneEl.style.display = phone ? '' : 'none'; }

    const bioEl = document.getElementById('profile-bio');
    if (bioEl) { bioEl.textContent = bio; bioEl.style.display = bio ? '' : 'none'; }

    // ── Skills tags ───────────────────────────────────────────────────────
    const skillsEl = document.getElementById('profile-skills');
    if (skillsEl) {
      const skills = Array.isArray(p.top_skills) ? p.top_skills : [];
      skillsEl.innerHTML = skills.map(s => `<span class="profile-skill-tag">${s}</span>`).join('');
    }

    // ── Certificate ───────────────────────────────────────────────────────
    renderCertButton(p);

    // ── SkillChain Balance ────────────────────────────────────────────────
    const balance = p.escrow_balance != null
    ? parseFloat(p.escrow_balance)
    : Math.max(0, allMyJobs
        .filter(j => j.status === 'paid')
        .reduce((s,j) => s + parseFloat(j.amount||0), 0)
      - parseFloat(p.total_withdrawn || 0));
    const balEl = document.getElementById('profile-balance-val');
    if (balEl) balEl.textContent = balance.toLocaleString();

    // ── Saved bank details ────────────────────────────────────────────────
    const walletBody = document.getElementById('profile-wallet-body');
    if (walletBody) {
      if (p.bank_account_no && p.bank_name) {
        walletBody.innerHTML = `
          <div class="wallet-detail">
            <div class="wallet-detail__icon">${ic('wallet')}</div>
            <div>
              <p class="wallet-detail__num">${p.bank_account_no}</p>
              <p class="wallet-detail__bank">${p.bank_name}${p.bank_account_name ? ' · ' + p.bank_account_name : ''}</p>
            </div>
            <span class="wallet-detail__status"><span class="wallet-dot" style="background:var(--success)"></span> Saved</span>
          </div>`;
      } else {
        walletBody.innerHTML = `<p style="font-size:.82rem;color:var(--text-3);padding:8px 0">No bank account saved yet. You'll be asked when you withdraw.</p>`;
      }
    }

    // ── Verification stats ────────────────────────────────────────────────
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

  /* ── Avatar upload ─────────────────────────────────────────────────────── */
  window.triggerAvatarUpload = function () {
    document.getElementById('avatar-file-input')?.click();
  };

  window.handleAvatarUpload = async function (e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
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

    // Upload to server
    try {
      const fd = new FormData();
      fd.append('user_id', user.id);
      fd.append('photo',   file, file.name || 'avatar.jpg');
      const res  = await fetch(`${FLASK}/api/worker/upload-avatar`, { method:'POST', body:fd, credentials:'include' });
      const data = await res.json();
      if (data.success) {
        user.profile = user.profile || {};
        user.profile.profile_photo = data.path;
        Swal.fire({ title:'Photo saved!', icon:'success', timer:1400, showConfirmButton:false, ...swalTheme() });
      } else {
        Swal.fire({ title:'Upload failed', text:data.message, icon:'error', confirmButtonColor:'#E85C00', ...swalTheme() });
      }
    } catch {
      Swal.fire({ title:'Saved locally only', text:"Couldn't reach server. Photo shows on this device only.", icon:'warning', confirmButtonColor:'#E85C00', ...swalTheme() });
    }
  };

  /* ── Edit Profile modal ────────────────────────────────────────────────── */
  window.openEditProfileModal = async function () {
    const p = user.profile || {};
    const { value: formValues } = await Swal.fire({
      title: 'Edit Profile',
      html: `
  <input id="ep-phone" class="wd-field" placeholder="Phone number (e.g. 08012345678)" value="${p.phone||''}">
  <textarea id="ep-bio" class="wd-field" rows="3" ...>${p.bio||''}</textarea>
  <input id="ep-skills" class="wd-field" ... value="...">
  <button type="button" onclick="Swal.close(); openPinModal();" class="btn btn--secondary btn--wide" style="margin-top:8px">
    🔒 Change Withdraw PIN
  </button>`,
      focusConfirm: false, showCancelButton: true,
      confirmButtonText:'Save Changes', confirmButtonColor:'#E85C00', cancelButtonColor:'#9A968E',
      ...swalTheme(),
      preConfirm: () => ({
        phone:      document.getElementById('ep-phone').value.trim(),
        bio:        document.getElementById('ep-bio').value.trim(),
        top_skills: document.getElementById('ep-skills').value.split(',').map(s=>s.trim()).filter(Boolean)
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
        user.profile = { ...(user.profile||{}), ...formValues };
        renderProfile();
        Swal.fire({ title:'Profile updated', icon:'success', timer:1500, showConfirmButton:false, ...swalTheme() });
      } else {
        Swal.fire({ title:'Update failed', text:data.message, icon:'error', confirmButtonColor:'#E85C00', ...swalTheme() });
      }
    } catch {
      // Endpoint not yet built — save locally and update UI anyway
      user.profile = { ...(user.profile||{}), ...formValues };
      renderProfile();
      Swal.fire({ title:'Saved locally', text:'Will sync when server endpoint is ready.', icon:'info', timer:2000, showConfirmButton:false, ...swalTheme() });
    }
  };

  /* ══════════════════════════════════════════════
     CERTIFICATE
  ══════════════════════════════════════════════ */
  function getCertTier(jobsDone, avgRating) {
    const score = (jobsDone||0) + ((avgRating||0)*4);
    if (score >= 40) return 'gold';
    if (score >= 15) return 'silver';
    return 'bronze';
  }
  const TIER_LABEL = { bronze:'Bronze Certified', silver:'Silver Certified', gold:'Gold Verified' };
  function certVerificationId(workerId) {
    return `SC-${String(workerId||0).padStart(5,'0')}-${(Date.now()%1000000).toString(36).toUpperCase()}`;
  }

  function makeQRSVG(text, size=60) {
    const cells=9, cell=Math.floor(size/cells);
    let hash=0;
    for (let i=0;i<text.length;i++) hash=((hash<<5)-hash+text.charCodeAt(i))|0;
    let squares='';
    for (let r=0;r<cells;r++) for (let c=0;c<cells;c++) {
      const on=((hash>>((r*cells+c)%30))&1)||(r<3&&c<3)||(r<3&&c>5)||(r>5&&c<3);
      if(on) squares+=`<rect x="${c*cell}" y="${r*cell}" width="${cell-1}" height="${cell-1}" rx="1"/>`;
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${squares}</svg>`;
  }

  const TIER_PALETTE = {
    bronze:{ bg:'linear-gradient(145deg,#2C1A08 0%,#1A0F05 100%)', accent:'#D4822A', accent2:'#F0A84A', badge:'linear-gradient(135deg,#C97B28,#E8A050)', border:'rgba(212,130,42,.4)', inner:'rgba(212,130,42,.12)', label:'#F5C98A', sub:'rgba(245,201,138,.6)', metric:'rgba(212,130,42,.15)', skill:'rgba(212,130,42,.18)' },
    silver:{ bg:'linear-gradient(145deg,#141820 0%,#0D1118 100%)', accent:'#8CA0BE', accent2:'#B0C4DE', badge:'linear-gradient(135deg,#6B80A0,#9AAFC8)', border:'rgba(140,160,190,.4)', inner:'rgba(140,160,190,.1)', label:'#C8D8EE', sub:'rgba(200,216,238,.6)', metric:'rgba(140,160,190,.15)', skill:'rgba(140,160,190,.18)' },
    gold:  { bg:'linear-gradient(145deg,#1E1500 0%,#120D00 100%)', accent:'#D4AF37', accent2:'#F0D060', badge:'linear-gradient(135deg,#C9A227,#EDD050)', border:'rgba(212,175,55,.5)', inner:'rgba(212,175,55,.14)', label:'#F5E090', sub:'rgba(245,224,144,.65)', metric:'rgba(212,175,55,.18)', skill:'rgba(212,175,55,.2)' }
  };

  function buildCertDocHTML(profile, tier, verId) {
    const p      = TIER_PALETTE[tier];
    const name   = profile.name  || 'Worker';
    const trade  = profile.trade || 'General';
    const jobs   = profile.jobs_completed || 0;
    const trust  = parseFloat(profile.trust_score||0).toFixed(1);
    const filled = Math.round(profile.trust_score||0);
    const stars  = Array.from({length:5},(_,i)=>`<span style="color:${i<filled?p.accent2:'rgba(255,255,255,.2)'}">${i<filled?'★':'☆'}</span>`).join('');
    const skills = Array.isArray(profile.top_skills)&&profile.top_skills.length ? profile.top_skills : [trade,'GPS Verified','Escrow Payments'];
    const issued = new Date().toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'});
    const tierDesc = { bronze:'Completing their first verified jobs on SkillChain.', silver:'Consistently delivering GPS-verified, escrow-secured work.', gold:'An elite verified artisan with an outstanding trust record.' }[tier];

    const serverPhoto = profile.profile_photo_path || null;
    const localPhoto  = localStorage.getItem(`sc-avatar-${profile.id||user?.id}`);
    const photoSrc    = serverPhoto || localPhoto;
    const avatarHTML  = photoSrc
      ? `<div class="cert-photo" style="background-image:url(${photoSrc})"></div>`
      : `<div class="cert-photo cert-photo--initial" style="background:${p.metric}">${name[0]?.toUpperCase()}</div>`;

    return `
      <div class="cert-doc cert-doc--${tier}" id="cert-doc-printable" style="background:${p.bg};border-color:${p.border}">
        <div class="cert-corner cert-corner--tl" style="border-color:${p.accent}"></div>
        <div class="cert-corner cert-corner--tr" style="border-color:${p.accent}"></div>
        <div class="cert-corner cert-corner--bl" style="border-color:${p.accent}"></div>
        <div class="cert-corner cert-corner--br" style="border-color:${p.accent}"></div>
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
        <div class="cert-identity" style="border-bottom:1px solid ${p.inner}">
          <p class="cert-name" style="color:${p.label}">${name}</p>
          <p class="cert-trade" style="color:${p.accent2}">${trade}</p>
          <p class="cert-desc" style="color:${p.sub}">${tierDesc}</p>
        </div>
        <div class="cert-metrics">
          <div class="cert-metric" style="background:${p.metric};border-color:${p.inner}"><div class="cert-metric__val" style="color:${p.accent2}">${jobs}</div><div class="cert-metric__label" style="color:${p.sub}">Jobs Done</div></div>
          <div class="cert-metric" style="background:${p.metric};border-color:${p.inner}"><div class="cert-metric__val" style="color:${p.accent2}">${trust}</div><div class="cert-metric__label" style="color:${p.sub}">Trust Score</div></div>
          <div class="cert-metric" style="background:${p.metric};border-color:${p.inner}"><div class="cert-metric__val" style="font-size:1rem;letter-spacing:1px">${stars}</div><div class="cert-metric__label" style="color:${p.sub}">Rating</div></div>
        </div>
        <div class="cert-skills">${skills.map(s=>`<span class="cert-skill" style="background:${p.skill};border-color:${p.inner};color:${p.label}">${s}</span>`).join('')}</div>
        <div class="cert-footer" style="border-top:1px solid ${p.inner}">
          <div class="cert-footer__id" style="color:${p.sub}">
            <span style="font-size:.6rem;letter-spacing:.1em">CERTIFICATE ID</span><br>
            <strong style="color:${p.label};font-size:.76rem;font-family:var(--font-mono)">${verId}</strong><br>
            <span style="font-size:.64rem">Issued ${issued} · GPS-authenticated · Escrow-secured</span>
          </div>
          <div class="cert-qr" style="border-color:${p.inner}">
            <div style="color:${p.accent}">${makeQRSVG(verId,54)}</div>
            <p style="font-size:.54rem;color:${p.sub};margin-top:4px;text-align:center">Scan to verify</p>
          </div>
        </div>
      </div>`;
  }


  async function loadMyBargains() {
  try {
    const res = await fetch(`${FLASK}/api/worker/my-bargains?user_id=${user.id}`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    renderMyBargainsList(data.bargains || []);
  } catch (e) { console.error('loadMyBargains:', e); }
}

function bargainStatusBadge(status) {
  const labels = { pending: 'Pending', accepted: 'Accepted', rejected: 'Declined' };
  return `<span class="badge badge--${status === 'accepted' ? 'verified' : status === 'rejected' ? 'disputed' : 'pending_verification'}">${labels[status] || status}</span>`;
}

function renderMyBargainsList(bargains) {
  const el = document.getElementById('my-bargains-list');
  if (!el) return;
  if (!bargains.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon-sq">${ic('box')}</div><p>No offers yet.</p></div>`;
    return;
  }
  el.innerHTML = bargains.map(b => {
    const isClientOffer = b.initiated_by === 'client' || b.initiated_by === null;
    const isPending      = b.status === 'pending';
    const offerLabel = isClientOffer ? 'Client offers' : 'Your offer';

    let actionArea = '';
    if (isPending && isClientOffer) {
      actionArea = `<div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn--success btn--sm" onclick="acceptClientOffer(${b.job_id}, ${b.id})">${ic('check')} Accept</button>
        <button class="btn btn--danger btn--sm" onclick="rejectClientOffer(${b.job_id}, ${b.id})">${ic('x')} Reject</button>
      </div>`;
    } else if (isPending && !isClientOffer) {
      actionArea = `<p style="font-size:.75rem;color:var(--text-3);margin-top:10px">Awaiting client response</p>`;
    }
    // resolved bargains (accepted/rejected/declined/cancelled) → no action area at all, just the status badge

    return `
    <div class="job-card" style="cursor:default">
      <div class="job-card__icon">${tradeIcon(b.trade)}</div>
      <div class="job-card__info">
        <p class="job-card__title">${b.job_title}</p>
        <div class="job-card__meta">
          ${bargainStatusBadge(b.status)}
          <span>Original: ₦${b.original_amount.toLocaleString()}</span>
          <span>${offerLabel}: ₦${b.proposed_price.toLocaleString()}</span>
        </div>
        ${b.status === 'rejected' && b.client_suggested_price ? `
          <div class="notice notice--warning" style="margin-top:10px">
            <p>Client suggested <strong>₦${b.client_suggested_price.toLocaleString()}</strong> instead.</p>
          </div>` : ''}
        ${actionArea}
      </div>
    </div>`;
  }).join('');
}

async function resendBargainAt(jobId, price) {
  const res = await fetch(`${FLASK}/api/worker/bargain`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ job_id: jobId, user_id: user.id, proposed_price: price, message: 'Updated offer per your suggestion' })
  });
  const data = await res.json();
  if (data.success) {
    await loadMyBargains();
    Swal.fire({ title: 'New offer sent', icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
  } else {
    Swal.fire({ title: 'Error', text: data.message, icon: 'error', ...swalTheme() });
  }
}

  function renderCertButton(profile) {
    const container = document.getElementById('profile-cert-area');
    if (!container || !profile) return;
    const jobs  = profile.jobs_completed || 0;
    const trust = parseFloat(profile.trust_score || 0);
    const tier = profile.cert_tier || 'bronze';
    container.innerHTML = `
      <button class="cert-trigger-btn cert-trigger-btn--${tier}" onclick="openCertModal()">
        ${ic('shield').replace('width="46" height="46"','width="16" height="16"')} View My ${TIER_LABEL[tier].replace(' Certified','').replace(' Verified','')} Certificate
      </button>`;
    window._certProfile = { ...profile, id: profile.id || user.id };
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
      overlay.addEventListener('click', e => { if (e.target===overlay) closeCertModal(); });
      document.addEventListener('keydown', e => { if (e.key==='Escape') closeCertModal(); });
    }
    document.getElementById('cert-content').innerHTML = buildCertDocHTML(
      window._certProfile||{}, window._certTier||'bronze', window._certVerId||certVerificationId(user.id)
    );
    overlay.classList.add('is-open');
  }

  function closeCertModal() { document.getElementById('cert-modal-overlay')?.classList.remove('is-open'); }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src=src; s.onload=resolve; s.onerror=reject;
      document.head.appendChild(s);
    });
  }

async function checkShopLocation() {
  const p = user.profile || {};
  if (!p.shop_lat || !p.shop_lng) showShopLocationBanner();
}

function showShopLocationBanner() {
  if (sessionStorage.getItem('shoploc-banner-dismissed')) return;
  if (document.getElementById('shoploc-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'shoploc-banner';
  banner.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:9998;background:linear-gradient(90deg,#E85C00,#ffb066);color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:center;gap:16px;font-size:0.9rem;font-weight:500;box-shadow:0 4px 20px rgba(232,92,0,0.3);">
      <span style="display:inline-flex;align-items:center;gap:6px">${ic('pin')} Set your shop location so clients can find and hire you nearby.</span>
      <button onclick="showView('profile'); document.getElementById('shoploc-banner')?.remove(); document.body.style.paddingTop='';" style="background:#fff;color:#E85C00;border:none;padding:8px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;white-space:nowrap;">Set Location</button>
      <button onclick="dismissShopLocationBanner()" style="background:transparent;color:rgba(255,255,255,0.85);border:none;font-size:1.2rem;cursor:pointer;padding:4px;">✕</button>
    </div>`;
  document.body.style.paddingTop = document.getElementById('pin-banner') ? '104px' : '52px';
  document.body.appendChild(banner);
}

function dismissShopLocationBanner() {
  document.getElementById('shoploc-banner')?.remove();
  document.body.style.paddingTop = document.getElementById('pin-banner') ? '52px' : '';
  sessionStorage.setItem('shoploc-banner-dismissed', '1');
}
window.dismissShopLocationBanner = dismissShopLocationBanner;


  async function downloadCertificate() {
    const btn = document.getElementById('cert-download-btn');
    const orig = btn.innerHTML;
    btn.disabled=true; btn.innerHTML=`<span class="spinner spinner--dark"></span> Preparing…`;
    try {
      if (!window.html2canvas) await loadScriptOnce(HTML2CANVAS_URL);
      const node   = document.getElementById('cert-doc-printable');
      const canvas = await window.html2canvas(node, { backgroundColor:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#ffffff', scale:2, useCORS:true });
      const link   = document.createElement('a');
      link.download = `SkillChain-Certificate-${window._certVerId||'worker'}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link); link.click(); link.remove();
    } catch (e) {
      console.error('downloadCertificate:', e);
      Swal.fire({ title:'Could not generate download', text:'Please try again.', icon:'error', ...swalTheme() });
    } finally { btn.disabled=false; btn.innerHTML=orig; }
  }


async function acceptClientOffer(jobId, bargainId) {
  const res = await fetch(`${FLASK}/api/worker/respond-bargain`, {   
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ bargain_id: bargainId, user_id: user.id, action: 'accept' })
  });
  const data = await res.json();
  if (data.success) {
    await loadMyBargains();
    Swal.fire({ title: 'Offer accepted!', text: 'Job assigned to you.', icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
  } else {
    Swal.fire({ title: 'Error', text: data.message, icon: 'error', ...swalTheme() });
  }
}

async function rejectClientOffer(jobId, bargainId) {
  const { isConfirmed } = await Swal.fire({
    title: 'Reject this offer?',
    text: 'The client will be notified and can choose to send a new offer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Reject',
    confirmButtonColor: '#DC2626',
    cancelButtonColor: '#9A968E',
    ...swalTheme()
  });
  if (!isConfirmed) return;

  const res = await fetch(`${FLASK}/api/worker/respond-bargain`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ bargain_id: bargainId, user_id: user.id, action: 'reject' })
  });
  const data = await res.json();
  if (data.success) {
    await loadMyBargains();
    Swal.fire({ title: 'Offer rejected', icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
  } else {
    Swal.fire({ title: 'Error', text: data.message, icon: 'error', ...swalTheme() });
  }
}

/* ══════════════════════════════════════════════
   WITHDRAW PIN CHECK & BANNER
════════════════════════════════════════════════ */
async function checkWithdrawPin() {
  try {
    const res = await fetch(`${FLASK}/api/worker/pin-status?user_id=${user.id}`, {
      credentials: 'include'
    });
    const data = await res.json();
    if (data.pin_set === false) showPinBanner();
  } catch (e) { console.error('checkWithdrawPin:', e); }
}

function showPinBanner() {
  if (sessionStorage.getItem('pin-banner-dismissed')) return;
  if (document.getElementById('pin-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pin-banner';
  banner.innerHTML = `
    <div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#FF4D2E,#ff8c66);color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:center;gap:16px;font-size:0.9rem;font-weight:500;box-shadow:0 4px 20px rgba(255,77,46,0.3);">
      <span style="display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" stroke-width="2"/></svg>Secure your earnings, set a withdraw PIN to protect your payouts.</span>
      <button onclick="openPinModal()" style="background:#fff;color:#FF4D2E;border:none;padding:8px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;white-space:nowrap;">Set PIN</button>
      <button onclick="dismissPinBanner()" style="background:transparent;color:rgba(255,255,255,0.8);border:none;font-size:1.2rem;cursor:pointer;padding:4px;">✕</button>
    </div>`;

  document.body.style.paddingTop = '52px';
  document.body.appendChild(banner);
}

function dismissPinBanner() {
  document.getElementById('pin-banner')?.remove();
  document.body.style.paddingTop = '';
  sessionStorage.setItem('pin-banner-dismissed', '1');
}

async function openPinModal(onComplete) {
  const { value: formValues, isConfirmed } = await Swal.fire({
    title: 'Set Withdraw PIN',
    html: `
      <p style="color:var(--text-2);font-size:.82rem;margin-bottom:14px;text-align:left">
        This PIN is required every time you withdraw funds. Choose 4–6 digits.
      </p>
      <input type="password" id="pin-new" class="wd-field" placeholder="New PIN (4–6 digits)" maxlength="6" inputmode="numeric">
      <input type="password" id="pin-confirm" class="wd-field" placeholder="Confirm PIN" maxlength="6" inputmode="numeric">`,
    confirmButtonText: 'Save PIN',
    confirmButtonColor: '#E85C00',
    showCancelButton: true,
    cancelButtonColor: '#9A968E',
    didOpen: () => {
      document.getElementById('forgot-pin-link')?.addEventListener('click', async (e) => {
        e.preventDefault();
        Swal.close();
        await requestPinReset();
      });
    },
    ...swalTheme(),
    preConfirm: () => {
      const p1 = document.getElementById('pin-new').value;
      const p2 = document.getElementById('pin-confirm').value;
      if (!p1 || p1.length < 4) { Swal.showValidationMessage('PIN must be 4–6 digits'); return false; }
      if (!/^\d+$/.test(p1)) { Swal.showValidationMessage('PIN must be numbers only'); return false; }
      if (p1 !== p2) { Swal.showValidationMessage('PINs do not match'); return false; }
      return { pin: p1 };
    }
  });

  if (!isConfirmed || !formValues) return;

  try {
    const res = await fetch(`${FLASK}/api/worker/set-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: user.id, new_pin: formValues.pin })
    });
    const data = await res.json();
    if (data.success) {
      dismissPinBanner();
      Swal.fire({ title: 'PIN saved!', text: 'Your withdrawals are now protected.', icon: 'success', confirmButtonColor: '#E85C00', timer: 1500, showConfirmButton: false, ...swalTheme() });
      if (onComplete) onComplete(); // resume withdraw flow
    } else {
      Swal.fire({ title: 'Error', text: data.message, icon: 'error', ...swalTheme() });
    }
  } catch {
    Swal.fire({ title: 'Network error', icon: 'error', ...swalTheme() });
  }
}

/* ══ Emoji picker ══ */
const EMOJI_LIST = [
  '😀','😂','🥰','😍','😊','😉','😎','🤔','😅','😭',
  '😢','😡','🙏','👍','👎','👏','🙌','💪','🤝','✌️',
  '❤️','🔥','⭐','✅','❌','⏰','📍','💰','💵','🎉',
  '👋','🙂','😴','😱','🤗','😇','🥲','😌','🚗','🏠',
  '🛠️','📦','🧹','👕','🛵','🏗️','✨','🙌','😬','🤞'
];

function toggleEmojiPanel() {
  const panel = document.getElementById('emoji-panel');
  const btn   = document.getElementById('chat-emoji-btn');
  if (!panel) return;
  const opening = !panel.classList.contains('is-open');
  panel.classList.toggle('is-open', opening);
  btn?.classList.toggle('is-active', opening);
  if (opening && !panel.dataset.built) {
    panel.innerHTML = EMOJI_LIST.map(e => `<button type="button" class="emoji-panel__btn">${e}</button>`).join('');
    panel.dataset.built = '1';
    panel.querySelectorAll('.emoji-panel__btn').forEach(b => {
      b.addEventListener('click', () => insertEmoji(b.textContent));
    });
  }
}

function insertEmoji(emoji) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end   = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
  const pos = start + emoji.length;
  input.setSelectionRange(pos, pos);
  input.focus();
}

document.getElementById('chat-emoji-btn')?.addEventListener('click', e => {
  e.stopPropagation();
  toggleEmojiPanel();
});
document.addEventListener('click', e => {
  const panel = document.getElementById('emoji-panel');
  const btn   = document.getElementById('chat-emoji-btn');
  if (panel?.classList.contains('is-open') && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.remove('is-open');
    btn?.classList.remove('is-active');
  }
});

async function requestPinReset() {
  await fetch(`${FLASK}/api/worker/forgot-pin`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ email: user.email })
  });

  const { value: formValues, isConfirmed } = await Swal.fire({
    title: 'Reset Withdraw PIN',
    html: `
      <p style="font-size:.82rem;color:var(--text-2);margin-bottom:14px;text-align:left">Check your email for a 6-digit code.</p>
      <input id="rp-token" class="wd-field" placeholder="6-digit code" maxlength="6" inputmode="numeric">
      <input type="password" id="rp-new-pin" class="wd-field" placeholder="New PIN (4–6 digits)" maxlength="6" inputmode="numeric">`,
    confirmButtonText: 'Reset PIN', confirmButtonColor: '#E85C00',
    showCancelButton: true, ...swalTheme(),
    preConfirm: () => {
      const token = document.getElementById('rp-token').value.trim();
      const pin   = document.getElementById('rp-new-pin').value.trim();
      if (!token || !pin) { Swal.showValidationMessage('Both fields are required'); return false; }
      return { token, pin };
    }
  });
  if (!isConfirmed || !formValues) return;

  const res  = await fetch(`${FLASK}/api/worker/reset-pin`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ email: user.email, token: formValues.token, new_pin: formValues.pin })
  });
  const data = await res.json();
  Swal.fire({ title: data.success ? 'PIN reset' : 'Error', text: data.message, icon: data.success ? 'success' : 'error', confirmButtonColor: '#E85C00', ...swalTheme() });
}
window.requestPinReset = requestPinReset;

window.openPinModal = openPinModal;
window.dismissPinBanner = dismissPinBanner;

  window.openWithdrawModal   = openWithdrawModal;
  window.openCertModal       = openCertModal;
  window.closeCertModal      = closeCertModal;
  window.downloadCertificate = downloadCertificate;
  window.openEditProfileModal = openEditProfileModal;
  window.triggerAvatarUpload  = triggerAvatarUpload;
  window.handleAvatarUpload   = handleAvatarUpload;
  window.resendBargainAt = resendBargainAt;
  window.openChatThread = openChatThread;
  window.openClientPublicProfile = openClientPublicProfile;
  window.acceptClientOffer = acceptClientOffer;
  window.rejectClientOffer = rejectClientOffer;
  window.showView = showView;
  
  let currentChatJobId = null;
let currentChatOtherId = null;
let chatPollInterval = null;

let vvHandler = null;

function scrollChatToBottom() {
  const messages = document.getElementById('chat-messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

function attachKeyboardHandler() {
  if (!window.visualViewport) return;
  vvHandler = () => {
    if (window.innerWidth > 640) return; // desktop unaffected
    scrollChatToBottom();
  };
  window.visualViewport.addEventListener('resize', vvHandler);
}

function detachKeyboardHandler() {
  if (window.visualViewport && vvHandler) {
    window.visualViewport.removeEventListener('resize', vvHandler);
  }
  vvHandler = null;
}
document.getElementById('chat-input')?.addEventListener('focus', () => {
  setTimeout(() => {
    const messages = document.getElementById('chat-messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, 300);
});

async function openChatThread(jobId, otherId) {

  document.getElementById('modal-overlay')?.classList.remove('is-open');
  document.getElementById('worker-modal-overlay')?.classList.remove('is-open');
  currentChatJobId = jobId;
  currentChatOtherId = otherId;

  document.getElementById('chat-modal-overlay').classList.add('is-open');
  document.getElementById('chat-messages').innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:.8rem">Loading…</div>`;

  document.getElementById('chat-send-offer-btn').style.display = 
  (user.role === 'client' || window.SC_ACTIVE_ROLE === 'client') ? '' : 'none';

  await loadChatHeader(otherId);
  await loadChatMessages();

  clearInterval(chatPollInterval);
  chatPollInterval = setInterval(loadChatMessages, 5000);
  attachKeyboardHandler();
}

function closeChatThread() {
  document.getElementById('chat-modal-overlay').classList.remove('is-open');
  clearInterval(chatPollInterval);
  chatPollInterval = null;
  currentChatJobId = null;
  currentChatOtherId = null;
  detachKeyboardHandler();
  document.getElementById('emoji-panel')?.classList.remove('is-open');
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

      closeChatThread();

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
  if (!currentChatJobId) return;
  const { value: price, isConfirmed } = await Swal.fire({
    title: 'Send Price Offer',
    text: 'This sends a formal, trackable price offer for this job.',
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
    const res = await fetch(`${FLASK}/api/worker/bargain`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ job_id: currentChatJobId, user_id: user.id, proposed_price: price, message: 'Sent via chat' })
    });
    const data = await res.json();
    if (data.success) {
      Swal.fire({ title: 'Offer sent', text: `₦${Number(price).toLocaleString()} sent to the client.`, icon: 'success', confirmButtonColor: '#E85C00', ...swalTheme() });
    } else {
      Swal.fire({ title: 'Could not send offer', text: data.message, icon: 'error', ...swalTheme() });
    }
  } catch (e) {
    Swal.fire({ title: 'Network error', icon: 'error', ...swalTheme() });
  }
});
async function openWithdrawModal() {
  // ── Check PIN first ───────────────────────────────────────────────────
  let pinSet = false;
  try {
    const pinRes = await fetch(`${FLASK}/api/worker/pin-status?user_id=${user.id}`, { credentials: 'include' });
    const pinData = await pinRes.json();
    pinSet = pinData.pin_set === true;
  } catch (e) { console.error('pin-check:', e); }

  if (!pinSet) {
    // Force them to set PIN before they can even see the withdraw form
    openPinModal(() => openWithdrawModal()); // retry after PIN is set
    return;
  }

  Swal.fire({ title:'Loading banks…', allowOutsideClick:false, ...swalTheme(), didOpen:()=>Swal.showLoading() });
  try {
    const [profileRes, banksRes] = await Promise.all([
      fetch(`${FLASK}/api/worker/profile?user_id=${user.id}`, { credentials:'include' }),
      fetch(`${FLASK}/api/banks`, { credentials:'include' })
    ]);
    const profileData = await profileRes.json();
    const banksData   = await banksRes.json();
    const profile     = profileData.profile || profileData || {};
    const banks       = banksData.banks || [];
    Swal.close();

    if (!banks.length) {
      Swal.fire({ title:'Bank list unavailable', text:'Could not load banks. Please try again.', icon:'warning', confirmButtonColor:'#E85C00', ...swalTheme() });
      return;
    }

    const hasSaved       = profile.bank_account_no && profile.bank_code;
    const bankOptionsHTML = banks.map(b=>`<option value="${b.code}" ${profile.bank_code===b.code?'selected':''}>${b.name}</option>`).join('');

    await Swal.fire({
      title:'Withdraw to Bank',
      html:`
        <p style="color:var(--text-2);font-size:.82rem;margin-bottom:14px;text-align:left">Funds arrive in your bank within 1–5 minutes.</p>
        <select id="wd-bank-code" class="wd-field"><option value="">Select your bank</option>${bankOptionsHTML}</select>
        <input id="wd-account-no" maxlength="10" placeholder="10-digit account number" value="${profile.bank_account_no||''}" class="wd-field">
        <div id="wd-acct-name" class="wd-acct-name"></div>
        <input type="number" id="wd-amount" min="100" placeholder="Amount in ₦ (min ₦100)" class="wd-field">
        <input type="password" id="wd-pin" maxlength="6" placeholder="Withdraw PIN" class="wd-field" inputmode="numeric">`,
      confirmButtonText:'Withdraw Now', confirmButtonColor:'#E85C00',
      showCancelButton:true, cancelButtonText:'Cancel', cancelButtonColor:'#9A968E',
      ...swalTheme(),
      didOpen: () => {
        let t = null;
        async function tryVerify() {
          const acct   = document.getElementById('wd-account-no').value.trim();
          const bank   = document.getElementById('wd-bank-code').value;
          const nameEl = document.getElementById('wd-acct-name');
          if (acct.length===10 && bank) {
            nameEl.style.color='#D97706'; nameEl.textContent='Verifying account…';
            try {
              const res  = await fetch(`${FLASK}/api/verify-account?account_no=${acct}&bank_code=${bank}`, {credentials:'include'});
              const data = await res.json();
              if (data.success) { nameEl.style.color='#16A34A'; nameEl.textContent=data.account_name; nameEl.dataset.verified='true'; nameEl.dataset.accountName=data.account_name; }
              else { nameEl.style.color='#DC2626'; nameEl.textContent=data.message||'Account not found'; nameEl.dataset.verified='false'; nameEl.dataset.accountName=''; }
            } catch { nameEl.style.color='#DC2626'; nameEl.textContent='Could not verify — check connection'; nameEl.dataset.verified='false'; }
          } else { nameEl.textContent=''; nameEl.dataset.verified='false'; }
        }
        document.getElementById('wd-account-no').addEventListener('input', ()=>{ clearTimeout(t); t=setTimeout(tryVerify,700); });
        document.getElementById('wd-bank-code').addEventListener('change',  ()=>{ clearTimeout(t); t=setTimeout(tryVerify,300); });
        if (hasSaved) tryVerify();
      },
      preConfirm: () => {
        const amount   = document.getElementById('wd-amount')?.value;
        const bankCode = document.getElementById('wd-bank-code')?.value;
        const acctNo   = document.getElementById('wd-account-no')?.value?.trim();
        const pin      = document.getElementById('wd-pin')?.value?.trim();
        const nameEl   = document.getElementById('wd-acct-name');
        const bankSel  = document.getElementById('wd-bank-code');
        const bankName = bankSel?.options[bankSel.selectedIndex]?.text||'';
        if (!bankCode)                      { Swal.showValidationMessage('Please select your bank'); return false; }
        if (!acctNo||acctNo.length!==10)    { Swal.showValidationMessage('Enter a valid 10-digit account number'); return false; }
        if (!amount||Number(amount)<100)    { Swal.showValidationMessage('Minimum withdrawal is ₦100'); return false; }
        if (!pin||pin.length<4)             { Swal.showValidationMessage('Enter your withdraw PIN'); return false; }
        return { amount, bankCode, accountNo:acctNo, bankName, acctName:nameEl?.dataset.accountName||'', pin };
      }
    }).then(async result => {
      if (!result.isConfirmed||!result.value) return;
      const { amount, bankCode, accountNo, bankName, acctName, pin } = result.value;
      Swal.fire({ title:'Processing…', text:'Sending withdrawal request.', allowOutsideClick:false, ...swalTheme(), didOpen:()=>Swal.showLoading() });
      try {
        const res  = await fetch(`${FLASK}/api/worker/withdraw`, {
          method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
          body: JSON.stringify({ user_id:user.id, amount:Number(amount), bank_code:bankCode, account_no:accountNo, bank_name:bankName, account_name:acctName, pin })
        });
        const data = await res.json();

        // ── Catch "needs PIN setup" fallback ─────────────────────────────
        if (!data.success && data.needs_pin_setup) {
          Swal.close();
          openPinModal(() => openWithdrawModal());
          return;
        }

        Swal.fire({ title:data.success?'Withdrawal initiated':'Failed', text:data.message, icon:data.success?'success':'error', confirmButtonColor:'#E85C00', ...swalTheme() });
        if (data.success) {
          user.profile = user.profile||{};
          user.profile.total_withdrawn = (parseFloat(user.profile.total_withdrawn)||0) + Number(amount);
          renderStats(user.profile);
          renderEarnings();
        }
      } catch { Swal.fire({ title:'Network error', text:'Could not reach the server.', icon:'error', confirmButtonColor:'#E85C00', ...swalTheme() }); }
    });
  } catch (e) {
    Swal.close();
    Swal.fire({ title:'Error', text:'Something went wrong loading the form.', icon:'error', ...swalTheme() });
  }
}

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
   WORKER MODAL CLOSE HANDLERS  (client profile)
════════════════════════════════════════════════ */
const workerModalClose = document.getElementById('worker-modal-close');

workerModalClose?.addEventListener('click', e => {
  e.stopPropagation();
  workerModalOverlay.classList.remove('is-open');
});

workerModalOverlay?.addEventListener('click', e => {
  if (e.target === workerModalOverlay) workerModalOverlay.classList.remove('is-open');
});

// Also close with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') workerModalOverlay.classList.remove('is-open');
});



  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */
  async function init() {
    const ok = loadUser();
    if (!ok) return;
    await Promise.all([loadProfile(), loadMyJobs()]);
    if (user.profile) renderStats(user.profile);
    checkWithdrawPin();
    checkShopLocation();
    setInterval(loadMyJobs, 15_000);
    setInterval(loadConversations, 15_000);
    heartbeatInterval = setInterval(() => {
  if (!window.USER_ID) return;
  fetch(`${FLASK}/api/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: window.USER_ID }),
    credentials: 'include'
  }).catch(() => {});
}, 120000);  
  }
  init();

})();

/* ══════════════════════════════════════════════════════════════════
   ROLE SWITCH MODULE — injected into same file for simplicity
   Polls for window.FLASK + window.USER_ID set by the IIFE above
══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const WORKER_URL = 'https://skillchain-frontend-omega.vercel.app/Worker_dashboard/index.html';
  const CLIENT_URL = 'https://skillchain-frontend-omega.vercel.app/Client_dashboard/index.html';

  function waitForGlobals(cb, n) {
  n = n || 0;
  if (window.FLASK && window.USER_ID) {
    console.log('[role-switch] globals found at attempt', n, '— USER_ID:', window.USER_ID);
    cb();
    return;
  }
  if (n > 200) { console.warn('[role-switch] globals never appeared after 200 attempts'); return; }
  setTimeout(() => waitForGlobals(cb, n + 1), 200);
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

      if (target === 'worker') { await doSwitch('worker'); return; }
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

    window.openWorkerPublicProfile = function(workerId) {
    Swal.fire({
      title: 'Coming soon',
      text: 'Viewing other artisan profiles will be available in a later update.',
      icon: 'info',
      confirmButtonColor: '#E85C00',
      ...swalTheme()
    });
  };

  
  function init() {
  waitForGlobals(async () => {
    try {
      console.log('[role-switch] globals ready — USER_ID:', window.USER_ID, 'FLASK:', window.FLASK);
      const res  = await fetch(`${window.FLASK}/api/switch-role/me?user_id=${window.USER_ID}`, { credentials:'include' });
      const data = await res.json();
      console.log('[role-switch] API response:', data);
      if (data.error || (!data.can_switch_to_client && !data.can_switch_to_worker)) return;
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
init();
})();