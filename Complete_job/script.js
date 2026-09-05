(function () {
  'use strict';

  const FLASK      = 'https://skillchain-backend-gce5.onrender.com';
  const LOGIN_PAGE = '/Login/index.html';
  const params        = new URLSearchParams(location.search);
  const JOB_ID         = params.get('job_id');
  const JOB_WORKER_ID  = params.get('job_worker_id');
  const IS_GIG_SLOT    = !!JOB_WORKER_ID;

  const userData = JSON.parse(localStorage.getItem('userData') || 'null');
  if (!userData) { location.replace(LOGIN_PAGE); }
  const USER_ID   = userData?.id;

  // ── State ─────────────────────────────────────────
  let workerLat    = null, workerLng = null;
  let workerAcc    = null;
  let mediaStream  = null, mediaRecorder = null;
  let recordedBlob = null, chunks = [];
  let imgFiles     = [];
  let jobData      = null;
  let gpsLocked    = null;
  let gpsWatcher   = null;
  let gpsSamples   = [];

  // Geofence radius — matches backend (150m). Never blocks submission —
  // it's advisory: a worker outside this range is flagged for the client's
  // review, but can always submit. Budget Android phones commonly drift
  // 20–100m, so a hard block here would punish honest workers with weak GPS.
  const FENCE_RADIUS_M     = 150;
  const MAX_ACCEPT_ACC_M   = 200;
  const GPS_SAMPLES_NEEDED = 3;

  // ── DOM helpers ───────────────────────────────────
  const $ = id => document.getElementById(id);

  const stepGps      = $('step-gps');
  const stepVideo    = $('step-video');
  const stepPhotos   = $('step-photos');
  const gpsBadge     = $('gps-badge');
  const videoBadge   = $('video-badge');
  const recOverlay   = $('rec-overlay');
  const recTrack     = $('rec-track');
  const recFill      = $('rec-fill');
  const recTime      = $('rec-time');
  const submitZone   = $('submit-zone');
  const escrowNotice = $('escrow-notice');

  function setStep(n) {
    document.querySelectorAll('.stepper__step').forEach(el => {
      const step = parseInt(el.dataset.step, 10);
      el.classList.toggle('is-done', step < n);
      el.classList.toggle('is-active', step === n);
    });
  }

  // ── Load job details ──────────────────────────────
    async function loadJob() {
    if (!JOB_ID && !JOB_WORKER_ID) {
      $('job-title-display').textContent   = 'No job ID in URL';
      $('job-address-display').textContent = 'Return to dashboard and click Complete again';
      return;
    }

    try {
      let src;
      if (IS_GIG_SLOT) {
        const res  = await fetch(`${FLASK}/api/worker/my-gig-slots?user_id=${USER_ID}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        src = (data.slots || []).find(s => s.id == JOB_WORKER_ID);
      } else {
        const res  = await fetch(`${FLASK}/api/worker/jobs?user_id=${USER_ID}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        src = (data.jobs || []).find(j => j.id == JOB_ID);
      }

      jobData = src;

      if (!jobData) {
        $('job-title-display').textContent   = 'Job not found or not assigned to you';
        $('job-address-display').textContent = IS_GIG_SLOT ? `Slot ID: ${JOB_WORKER_ID} — check dashboard` : `Job ID: ${JOB_ID} — check dashboard`;
        return;
      }

      $('job-title-display').textContent   = jobData.title || 'Untitled Job';
      $('job-amount-display').textContent  = '₦' + Number(jobData.amount || 0).toLocaleString();

      const atShop = jobData.work_location_type === 'worker_shop';
      $('job-address-display').textContent = atShop
        ? '📍 At your shop'
        : '📍 ' + (jobData.site_address || '—');

      const lat = atShop ? jobData.shop_lat : jobData.site_lat;
      const lng = atShop ? jobData.shop_lng : jobData.site_lng;
      $('fence-coords-text').textContent = (lat && lng)
        ? `Reference: ${atShop ? 'your shop' : 'client site'} · must be within ${FENCE_RADIUS_M}m`
        : 'Reference location not set for this job';

    } catch (e) {
      console.error('loadJob error:', e);
      $('job-title-display').textContent   = 'Could not load job';
      $('job-address-display').textContent = 'Check your connection and try again';
    }

    await checkEscrow();
  }

  // ── Escrow check (also used by poll) ─────────────
    async function checkEscrow() {
    try {
      const idParam = IS_GIG_SLOT ? `job_worker_id=${JOB_WORKER_ID}` : `job_id=${JOB_ID}`;
      const res  = await fetch(
        `${FLASK}/api/job/escrow-status?${idParam}&user_id=${USER_ID}&_=${Date.now()}`,
        { credentials: 'include' }
      );
      if (!res.ok) return false;
      const d = await res.json();

      if (d.escrow_paid) {
        escrowNotice.className = 'escrow-notice is-paid';
        escrowNotice.innerHTML = `
          <span class="escrow-notice__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <div>
            <strong>Escrow funded</strong>
            <p>Client has paid ₦${Number(d.amount || 0).toLocaleString()}. You can submit proof now.</p>
          </div>`;
        stepGps.classList.remove('is-inactive');
        return true;
      } else {
        const received = d.escrow_amount_received;
        const needed   = Number(d.amount || 0);
        escrowNotice.className = 'escrow-notice';
        escrowNotice.innerHTML = `
          <span class="escrow-notice__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
          </span>
          <div>
            <strong>Awaiting client payment</strong>
            <p>Client must transfer ₦${needed.toLocaleString()} to fund escrow before you can proceed.
              ${received ? `<br><span style="font-size:.7rem;opacity:.75">Received so far: ₦${Number(received).toLocaleString()}</span>` : ''}
            </p>
          </div>`;
        stepGps.classList.add('is-inactive');
        return false;
      }
    } catch (e) {
      console.error('checkEscrow:', e);
      return false;
    }
  }

  // ── STEP 1: GPS capture ───────────────────────────
  function startGpsWatch() {
    if (!navigator.geolocation) {
      $('gps-result').innerHTML = `<div class="gps-card is-bad"><p class="gps-card__line">Geolocation is not supported by your browser.</p></div>`;
      return;
    }

    const btn = $('btn-get-gps');
    btn.textContent = 'Getting location…';
    btn.disabled    = true;
    gpsSamples      = [];

    if (gpsWatcher !== null) {
      navigator.geolocation.clearWatch(gpsWatcher);
      gpsWatcher = null;
    }

    gpsWatcher = navigator.geolocation.watchPosition(
      pos => {
        const acc = Math.round(pos.coords.accuracy);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (acc > MAX_ACCEPT_ACC_M) {
          $('gps-result').innerHTML = `
            <div class="gps-card is-warn">
              <p class="gps-card__line">Weak signal (±${acc}m accuracy)</p>
              <p class="gps-card__note">Move outside or near a window. Waiting for better signal…</p>
            </div>`;
          return;
        }

        gpsSamples.push({ lat, lng, acc });
        if (gpsSamples.length > GPS_SAMPLES_NEEDED) gpsSamples.shift();

        if (gpsSamples.length < GPS_SAMPLES_NEEDED) {
          $('gps-result').innerHTML = `
            <div class="gps-card">
              <p class="gps-card__line" style="color:var(--text-2)">Improving fix… (${gpsSamples.length}/${GPS_SAMPLES_NEEDED} samples, ±${acc}m)</p>
            </div>`;
          return;
        }

        let totalWeight = 0, avgLat = 0, avgLng = 0, bestAcc = Infinity;
        gpsSamples.forEach(s => {
          const w = 1 / s.acc;
          totalWeight += w;
          avgLat += s.lat * w;
          avgLng += s.lng * w;
          if (s.acc < bestAcc) bestAcc = s.acc;
        });
        avgLat /= totalWeight;
        avgLng /= totalWeight;

        workerLat = avgLat;
        workerLng = avgLng;
        workerAcc = bestAcc;

        const accLabel = bestAcc <= 20 ? 'Excellent' : bestAcc <= 50 ? 'Good' : bestAcc <= 100 ? 'Fair' : 'Weak';

        $('gps-result').innerHTML = `
          <div class="gps-card is-good">
            <p class="gps-card__line">Location confirmed · ${accLabel} (±${Math.round(bestAcc)}m)</p>
            <p class="gps-card__coords">${avgLat.toFixed(6)}, ${avgLng.toFixed(6)} · averaged ${GPS_SAMPLES_NEEDED} samples</p>
            ${bestAcc > 80 ? `<p class="gps-card__note">Accuracy is moderate. Moving outdoors will improve it — you can still proceed.</p>` : ''}
          </div>`;

        gpsBadge.textContent = 'Done';
        gpsBadge.className   = 'badge badge--done';
        setStep(2);

        stepVideo.classList.remove('is-inactive');
        stepPhotos.classList.remove('is-inactive');

        btn.textContent = 'Refresh Location';
        btn.disabled    = false;

        checkReady();
      },

      err => {
        const msgs = {
          1: 'Location permission denied. Allow location access in your browser settings.',
          2: 'GPS signal unavailable. Move outdoors or near a window and try again.',
          3: 'GPS timed out. Move outdoors, then tap Retry.'
        };
        $('gps-result').innerHTML = `<div class="gps-card is-bad"><p class="gps-card__line">${msgs[err.code] || err.message}</p></div>`;
        btn.textContent = 'Retry Location';
        btn.disabled    = false;
        gpsSamples = [];
      },

      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    );
  }

  $('btn-get-gps')?.addEventListener('click', () => { gpsSamples = []; startGpsWatch(); });

  // ── STEP 2: Camera ────────────────────────────────
  $('btn-open-cam')?.addEventListener('click', async () => {
    try {
      if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }

      mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});

      const preview = $('video-preview');
      preview.srcObject = mediaStream;
      preview.style.display = 'block';

      $('recorded-preview').style.display = 'none';
      $('btn-open-cam').classList.add('hidden');
      $('btn-record').classList.remove('hidden');

    } catch (e) {
      console.error('Camera error:', e);
      let msg = e.message;
      if (e.name === 'NotAllowedError')  msg = 'Camera/microphone permission denied. Please allow both and try again.';
      if (e.name === 'NotFoundError')    msg = 'No camera found on this device.';
      if (e.name === 'NotReadableError') msg = 'Camera is in use by another app.';
      Swal.fire({ title: 'Camera error', text: msg, icon: 'error', confirmButtonColor: '#e85c00', background: '#171513', color: '#f3efe9' });
    }
  });

  $('btn-record')?.addEventListener('click', () => {
    if (!mediaStream || !mediaStream.active) {
      Swal.fire({ title: 'Camera not open', text: "Click 'Open Camera' first.", icon: 'warning', confirmButtonColor: '#e85c00', background: '#171513', color: '#f3efe9' });
      return;
    }

    gpsLocked = { lat: workerLat, lng: workerLng, acc: workerAcc, ts: Date.now() };
    chunks = [];
    recordedBlob = null;

    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
      .find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : {});
    } catch (e) {
      Swal.fire({ title: 'Could not start recording', text: e.message, icon: 'error', confirmButtonColor: '#e85c00', background: '#171513', color: '#f3efe9' });
      return;
    }

    mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(chunks, { type: mime || 'video/webm' });
      $('recorded-preview').src = URL.createObjectURL(recordedBlob);
      $('recorded-preview').style.display = 'block';
      $('video-preview').style.display = 'none';
      $('video-preview').srcObject = null;
      recOverlay.classList.remove('is-active');
      recTrack.classList.remove('is-active');
      $('btn-record').classList.add('hidden');
      $('btn-retake').classList.remove('hidden');
      videoBadge.textContent = 'Done';
      videoBadge.className = 'badge badge--done';
      setStep(3);
      if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
      checkReady();
    };

    mediaRecorder.start(100);
    $('btn-record').classList.add('hidden');
    recOverlay.classList.add('is-active');
    recTrack.classList.add('is-active');
    recFill.style.width = '100%';

    let secs = 10;
    recTime.textContent = `${secs}s`;
    const iv = setInterval(() => {
      secs--;
      recTime.textContent = `${secs}s`;
      recFill.style.width = `${(secs / 10) * 100}%`;
      if (secs <= 0) { clearInterval(iv); if (mediaRecorder?.state === 'recording') mediaRecorder.stop(); }
    }, 1000);
  });

  $('btn-retake')?.addEventListener('click', () => {
    recordedBlob = null;
    gpsLocked    = null;
    chunks       = [];

    $('btn-retake').classList.add('hidden');
    $('btn-open-cam').classList.remove('hidden');
    $('recorded-preview').style.display = 'none';
    $('recorded-preview').src           = '';

    videoBadge.textContent = 'Pending';
    videoBadge.className   = 'badge badge--pending';
    setStep(2);

    submitZone.classList.remove('is-visible');
    $('fence-result-box').innerHTML = '';
  });

  // ── STEP 3: Photo upload ──────────────────────────
  $('img-zone')?.addEventListener('click', () => $('img-input')?.click());

  $('img-input')?.addEventListener('change', () => {
    Array.from($('img-input').files || []).forEach(f => { if (imgFiles.length < 5) imgFiles.push(f); });
    $('img-input').value = '';
    renderImgPreviews();
  });

  function renderImgPreviews() {
    const box = $('img-previews');
    if (!box) return;
    box.innerHTML = '';
    imgFiles.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'img-thumb';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      const rm = document.createElement('button');
      rm.className   = 'img-thumb__rm';
      rm.textContent = '✕';
      rm.type        = 'button';
      rm.onclick = () => { imgFiles.splice(i, 1); renderImgPreviews(); };
      div.append(img, rm);
      box.appendChild(div);
    });
  }

  // ── Submit readiness check ────────────────────────
  function checkReady() {
    if (workerLat !== null && recordedBlob !== null) {
      submitZone.classList.add('is-visible');
      setTimeout(() => submitZone.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }

  // ── SUBMIT proof ──────────────────────────────────
  $('btn-submit')?.addEventListener('click', async () => {
    if (!workerLat || !workerLng) {
      Swal.fire({ title: 'Location not captured', text: 'Complete Step 1 first.', icon: 'warning', confirmButtonColor: '#e85c00', background: '#171513', color: '#f3efe9' });
      return;
    }
    if (!recordedBlob) {
      Swal.fire({ title: 'No video recorded', text: 'Complete Step 2 first.', icon: 'warning', confirmButtonColor: '#e85c00', background: '#171513', color: '#f3efe9' });
      return;
    }

    const submitBtn  = $('btn-submit');
    const submitText = $('submit-text');
    const submitSpin = $('submit-spin');

    submitText.style.display = 'none';
    submitSpin.classList.add('is-active');
    submitBtn.disabled = true;

    const lat = gpsLocked ? gpsLocked.lat : workerLat;
    const lng = gpsLocked ? gpsLocked.lng : workerLng;

    if (!lat || !lng) {
      Swal.fire({ title: 'Location missing', text: 'Please redo Step 1 (Location) and Step 2 (Video) before submitting.', icon: 'error', confirmButtonColor: '#e85c00', background: '#171513', color: '#f3efe9' });
      submitText.style.display = 'inline';
      submitSpin.classList.remove('is-active');
      submitBtn.disabled = false;
      return;
    }

    const fd = new FormData();
    if (IS_GIG_SLOT) fd.append('job_worker_id', JOB_WORKER_ID);
    else             fd.append('job_id', JOB_ID);
    fd.append('user_id',   USER_ID);
    fd.append('proof_lat', lat);
    fd.append('proof_lng', lng);

    const videoExt = recordedBlob.type.includes('mp4') ? '.mp4' : '.webm';
    fd.append('files', recordedBlob, `proof_video${videoExt}`);
    imgFiles.forEach((f, i) => {
      const ext = f.name.match(/\.\w+$/)?.[0] || '.jpg';
      fd.append('files', f, `photo_${i}${ext}`);
    });

    try {
      const mRes = await fetch(`${FLASK}/api/job/upload-media`, { method: 'POST', body: fd, credentials: 'include' });
      if (!mRes.ok) {
        const errText = await mRes.text();
        throw new Error(`upload-media failed (${mRes.status}): ${errText.slice(0, 200)}`);
      }
      const mData = await mRes.json();

      const resultBox = $('fence-result-box');

      if (!mData.success) {
        resultBox.innerHTML = `
          <div class="fence-result fence-result--fail">
            <span class="fence-result__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
            </span>
            <div>
              <p class="fence-result__title">Upload Failed</p>
              <p class="fence-result__msg">${mData.message || 'Unknown error'}</p>
            </div>
          </div>`;
        return;
      }

      // ── This never blocks — every worker proceeds to verification. ──
      // within_fence only changes the tone of the message shown here.
      const dist = mData.distance_m != null ? Math.round(mData.distance_m) : null;

      if (mData.within_fence) {
        resultBox.innerHTML = `
          <div class="fence-result fence-result--pass">
            <span class="fence-result__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <div>
              <p class="fence-result__title">Within range</p>
              <p class="fence-result__msg">You're ${dist != null ? dist + 'm' : ''} from the reference location. Submitting for verification…</p>
            </div>
          </div>`;
      } else {
        resultBox.innerHTML = `
          <div class="fence-result fence-result--flag">
            <span class="fence-result__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
            </span>
            <div>
              <p class="fence-result__title">Distance flagged — submitting anyway</p>
              <p class="fence-result__msg">
                You're ${dist != null ? dist + 'm' : 'an unknown distance'} from the reference location
                (usual range is ${FENCE_RADIUS_M}m). This won't stop your submission — the client will
                see this note and can review your proof before approving.
              </p>
            </div>
          </div>`;
      }

      // Always proceed to verification — flagged or not.
      const vFd = new FormData();
      if (IS_GIG_SLOT) vFd.append('job_worker_id', JOB_WORKER_ID);
      else             vFd.append('job_id', JOB_ID);
      vFd.append('user_id',    USER_ID);
      vFd.append('worker_lat', lat);
      vFd.append('worker_lng', lng);
      vFd.append('video',      recordedBlob, `proof${videoExt}`);

      const vRes = await fetch(`${FLASK}/api/verify-job`, { method: 'POST', body: vFd, credentials: 'include' });
      if (!vRes.ok) {
        const vErr = await vRes.text();
        throw new Error(`verify-job failed (${vRes.status}): ${vErr.slice(0, 200)}`);
      }
      const vData = await vRes.json();

      submitZone.classList.remove('is-visible');
      $('rating-prompt').classList.add('is-visible');
      $('rating-prompt').scrollIntoView({ behavior: 'smooth', block: 'center' });

      Swal.fire({
        title: 'Submitted',
        html: `<p>${vData.message || 'Your proof was submitted.'}</p>`,
        icon: 'success',
        confirmButtonColor: '#e85c00',
        background: '#171513', color: '#f3efe9'
      });

    } catch (e) {
      console.error('Submit error:', e);
      Swal.fire({
        title: 'Submission Failed',
        text:  e.message || 'Please check your connection and try again.',
        icon:  'error',
        confirmButtonColor: '#e85c00',
        background: '#171513', color: '#f3efe9'
      });
    } finally {
      submitText.style.display = 'inline';
      submitSpin.classList.remove('is-active');
      submitBtn.disabled = false;
    }
  });

  // ── Init ──────────────────────────────────────────
  loadJob();

  const escrowPoll = setInterval(async () => {
    const funded = await checkEscrow();
    if (funded) clearInterval(escrowPoll);
  }, 15_000);

})();