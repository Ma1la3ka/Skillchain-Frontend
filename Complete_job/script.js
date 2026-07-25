(function () {
  'use strict';

  const FLASK      = 'https://skillchain-backend-gce5.onrender.com';
  const LOGIN_PAGE = '/Login/index.html';
  const params     = new URLSearchParams(location.search);
  const JOB_ID     = params.get('job_id');

  const userData = JSON.parse(localStorage.getItem('userData') || 'null');
  if (!userData) { location.replace(LOGIN_PAGE); }
  const USER_ID   = userData?.id;

  // ── State ─────────────────────────────────────────
  let workerLat    = null, workerLng = null;
  let workerAcc    = null;                 // best accuracy reading so far (metres)
  let mediaStream  = null, mediaRecorder = null;
  let recordedBlob = null, chunks = [];
  let imgFiles     = [];
  let jobData      = null;
  let gpsLocked    = null;   // { lat, lng, acc, ts } — locked at record-start
  let gpsWatcher   = null;   // watchPosition ID — runs silently in background
  let gpsSamples   = [];     // rolling buffer of recent fixes for averaging

  // Geofence radius — 150m for Nigerian urban GPS conditions.
  // Budget Android phones (Tecno, Infinix, Itel) drift 20-60m in built-up areas.
  // 100m rejects workers standing right at the site. 150m still proves presence.
  const FENCE_RADIUS_M     = 150;
  // Reject fix entirely if accuracy worse than this (cell-tower-only positioning)
  const MAX_ACCEPT_ACC_M   = 200;
  // Samples to average before confirming a reading (reduces random noise ~40%)
  const GPS_SAMPLES_NEEDED = 3;

  // ── DOM helpers ───────────────────────────────────
  const $ = id => document.getElementById(id);

  const stepGps      = $('step-gps');
  const stepVideo    = $('step-video');
  const stepPhotos   = $('step-photos');
  const gpsBadge     = $('gps-badge');
  const videoBadge   = $('video-badge');
  const recBar       = $('rec-bar');
  const recFill      = $('rec-fill');
  const recTime      = $('rec-time');
  const submitZone   = $('submit-zone');
  const escrowNotice = $('escrow-notice');

  // ── Load job details ──────────────────────────────
  async function loadJob() {
    if (!JOB_ID) {
      $('job-title-display').textContent   = 'No job ID in URL';
      $('job-address-display').textContent = 'Return to dashboard and click Complete again';
      return;
    }

    try {
      const res  = await fetch(`${FLASK}/api/worker/jobs?user_id=${USER_ID}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Use == not === because JOB_ID is string, j.id is int
      jobData = (data.jobs || []).find(j => j.id == JOB_ID);

      if (!jobData) {
        $('job-title-display').textContent   = 'Job not found or not assigned to you';
        $('job-address-display').textContent = `Job ID: ${JOB_ID} — check dashboard`;
        console.warn('Available job IDs:', data.jobs?.map(j => j.id));
        return;
      }

      $('job-title-display').textContent   = jobData.title || 'Untitled Job';
      $('job-address-display').textContent = '📍 ' + (jobData.site_address || '—');
      $('job-amount-display').textContent  = '₦' + Number(jobData.amount || 0).toLocaleString();

      const lat = jobData.site_lat;
      const lng = jobData.site_lng;
      $('fence-coords-text').textContent = (lat && lng)
        ? `Geofence: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} — must be within ${FENCE_RADIUS_M}m`
        : 'Geofence: coordinates not set for this job';

    } catch (e) {
      console.error('loadJob error:', e);
      $('job-title-display').textContent   = 'Could not load job';
      $('job-address-display').textContent = 'Check Flask console for errors';
    }

    // Always check escrow after loading job
    await checkEscrow();
  }

  // ── Escrow check (also used by poll) ─────────────
  async function checkEscrow() {
    try {
      const res  = await fetch(
        `${FLASK}/api/job/escrow-status?job_id=${JOB_ID}&user_id=${USER_ID}&_=${Date.now()}`,
        { credentials: 'include' }
      );
      if (!res.ok) return false;
      const d = await res.json();

      if (d.escrow_paid) {
        escrowNotice.className = 'escrow-notice paid';
        escrowNotice.innerHTML = `
          <span class="escrow-notice__icon">✅</span>
          <div>
            <strong>Escrow funded</strong>
            <p style="margin-top:3px;color:var(--text-2)">
              Client has paid ₦${Number(d.amount || 0).toLocaleString()}. You can now submit proof.
            </p>
          </div>`;
        stepGps.classList.remove('inactive');
        return true;

      } else {
        const received = d.escrow_amount_received;
        const needed   = Number(d.amount || 0);
        escrowNotice.className = 'escrow-notice';
        escrowNotice.innerHTML = `
          <span class="escrow-notice__icon">⚠️</span>
          <div>
            <strong style="color:#f59e0b">Awaiting client payment</strong>
            <p style="margin-top:3px;color:var(--text-2)">
              Client must transfer ₦${needed.toLocaleString()} to fund escrow before you can proceed.
              ${received ? `<br><span style="font-size:.72rem;color:#5a5550">Received so far: ₦${Number(received).toLocaleString()}</span>` : ''}
            </p>
          </div>`;
        stepGps.classList.add('inactive');
        return false;
      }
    } catch (e) {
      console.error('checkEscrow:', e);
      return false;
    }
  }

  // ── STEP 1: GPS capture ───────────────────────────
  //
  // Strategy:
  //  1. Use watchPosition (not getCurrentPosition) so the fix improves over time
  //  2. Accept a cached fix up to 10s old — avoids the cold-start timeout problem
  //     on cheap Android while still being fresh enough to be meaningful
  //  3. Reject fixes with accuracy > 200m (cell-tower-only, useless for geofencing)
  //  4. Collect GPS_SAMPLES_NEEDED consecutive good fixes and AVERAGE them —
  //     reduces random noise by ~40% which is the single biggest practical improvement
  //  5. Keep watching silently after the first confirmed reading so coords stay fresh
  //     (silent background update — UI only shows confirmed reads)
  //  6. Warn user clearly about accuracy so they can move outside / to a window

  function startGpsWatch() {
    if (!navigator.geolocation) {
      $('gps-result').innerHTML = `
        <p style="color:var(--danger);font-size:.82rem;margin-top:.5rem">
          ❌ Geolocation is not supported by your browser.
        </p>`;
      return;
    }

    const btn = $('btn-get-gps');
    btn.textContent = '⏳ Getting GPS…';
    btn.disabled    = true;
    gpsSamples      = [];

    // Stop any existing watcher before starting a new one
    if (gpsWatcher !== null) {
      navigator.geolocation.clearWatch(gpsWatcher);
      gpsWatcher = null;
    }

    gpsWatcher = navigator.geolocation.watchPosition(
      pos => {
        const acc = Math.round(pos.coords.accuracy);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // ── Reject fix if accuracy is too poor ──────────────────────────
        if (acc > MAX_ACCEPT_ACC_M) {
          $('gps-result').innerHTML = `
            <div class="gps-display" style="background:var(--bg3);border-radius:8px;padding:.75rem 1rem">
              <p style="color:#fbbf24;font-size:.82rem;font-weight:600">
                ⚠️ Weak signal (±${acc}m accuracy)
              </p>
              <p style="font-size:.75rem;color:var(--text-3);margin-top:3px">
                Move outside or near a window. Waiting for better signal…
              </p>
            </div>`;
          // Don't add this sample — keep waiting
          return;
        }

        // ── Add sample to rolling buffer ─────────────────────────────────
        gpsSamples.push({ lat, lng, acc });

        // Keep only the last GPS_SAMPLES_NEEDED readings
        if (gpsSamples.length > GPS_SAMPLES_NEEDED) {
          gpsSamples.shift();
        }

        // ── Show live progress before we have enough samples ────────────
        if (gpsSamples.length < GPS_SAMPLES_NEEDED) {
          $('gps-result').innerHTML = `
            <div class="gps-display" style="background:var(--bg3);border-radius:8px;padding:.75rem 1rem">
              <p style="color:var(--text-2);font-size:.82rem">
                📡 Improving fix… (${gpsSamples.length}/${GPS_SAMPLES_NEEDED} samples, ±${acc}m)
              </p>
            </div>`;
          return;
        }

        // ── We have enough samples — compute weighted average ────────────
        // Weight each sample by inverse of its accuracy (more accurate = more weight)
        let totalWeight = 0, avgLat = 0, avgLng = 0, bestAcc = Infinity;

        gpsSamples.forEach(s => {
          const w = 1 / s.acc;   // better accuracy → higher weight
          totalWeight += w;
          avgLat      += s.lat * w;
          avgLng      += s.lng * w;
          if (s.acc < bestAcc) bestAcc = s.acc;
        });

        avgLat /= totalWeight;
        avgLng /= totalWeight;

        // ── Confirm the reading ──────────────────────────────────────────
        workerLat = avgLat;
        workerLng = avgLng;
        workerAcc = bestAcc;

        // Accuracy tier label for the UI
        const accLabel = bestAcc <= 20  ? '🟢 Excellent'
                       : bestAcc <= 50  ? '🟢 Good'
                       : bestAcc <= 100 ? '🟡 Fair'
                       :                  '🟠 Weak';

        $('gps-result').innerHTML = `
          <div class="gps-display ok">
            <p class="gps-display__line">
              ✅ Location confirmed (${accLabel} · ±${Math.round(bestAcc)}m)
            </p>
            <p class="gps-display__coords">
              ${avgLat.toFixed(6)}, ${avgLng.toFixed(6)}
              · averaged ${GPS_SAMPLES_NEEDED} samples
            </p>
            ${bestAcc > 80 ? `
            <p style="font-size:.72rem;color:#fbbf24;margin-top:5px">
              ⚠️ Accuracy is moderate. Moving outdoors will improve it.
              You can still proceed — the fence radius accounts for this.
            </p>` : ''}
          </div>`;

        gpsBadge.textContent = 'DONE';
        gpsBadge.className   = 'step-badge step-badge--done';

        stepVideo.classList.remove('inactive');
        stepPhotos.classList.remove('inactive');

        btn.textContent = '📍 Refresh GPS';
        btn.disabled    = false;

        checkReady();

        // ── Keep watching silently to stay fresh ────────────────────────
        // We don't stop watchPosition — it keeps improving coords in the
        // background so gpsLocked at record-start gets the best available fix.
      },

      err => {
        // Error handler — give actionable messages per error code
        const msgs = {
          1: 'Location permission denied. Please allow location access in your browser settings.',
          2: 'GPS signal unavailable. Move outdoors or near a window and try again.',
          3: 'GPS timed out. Move outdoors, then tap Retry.'
        };
        const msg = msgs[err.code] || err.message;

        $('gps-result').innerHTML = `
          <p style="color:var(--danger);font-size:.82rem;margin-top:.5rem">❌ ${msg}</p>`;

        btn.textContent = '📍 Retry GPS';
        btn.disabled    = false;

        // Clear samples so retry starts fresh
        gpsSamples = [];
      },

      {
        enableHighAccuracy: true,
        timeout:            20000,  // 20s — more forgiving than 15s for slow cold starts
        maximumAge:         10000   // accept a cached fix up to 10s old.
                                    // This avoids the cold-start stall on cheap Androids
                                    // while still being recent enough to matter.
                                    // NOT 0 — that forces fresh fix every time and is
                                    // the main cause of timeouts on budget phones.
      }
    );
  }

  $('btn-get-gps')?.addEventListener('click', () => {
    // Reset samples so re-tap always starts a fresh averaging run
    gpsSamples = [];
    startGpsWatch();
  });

  // ── STEP 2: Camera ────────────────────────────────
  $('btn-open-cam')?.addEventListener('click', async () => {
    try {
      // Stop any existing stream first
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      const preview = $('video-preview');
      preview.srcObject = mediaStream;
      preview.style.display = 'block';

      $('recorded-preview').style.display = 'none';
      $('btn-open-cam').classList.add('hidden');
      $('btn-record').classList.remove('hidden');

    } catch (e) {
      console.error('Camera error:', e);
      // Provide helpful message for common errors
      let msg = e.message;
      if (e.name === 'NotAllowedError')    msg = 'Camera permission denied. Please allow camera access and try again.';
      if (e.name === 'NotFoundError')      msg = 'No camera found on this device.';
      if (e.name === 'NotReadableError')   msg = 'Camera is in use by another app.';
      alert('Camera error: ' + msg);
    }
  });
  $('btn-record')?.addEventListener('click', () => {
    if (!mediaStream || !mediaStream.active) {
      alert("Camera not open. Click 'Open Camera' first.");
      return;
    }

    // Lock the CURRENT best averaged reading at the moment recording starts.
    // workerLat/workerLng are kept fresh by the silent watchPosition background loop.
    gpsLocked = { lat: workerLat, lng: workerLng, acc: workerAcc, ts: Date.now() };
    chunks = [];
    recordedBlob = null;

    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
      .find(m => MediaRecorder.isTypeSupported(m)) || '';

    try {
      mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : {});
    } catch (e) {
      alert('Could not start recording: ' + e.message);
      return;
    }

    mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(chunks, { type: mime || 'video/webm' });
      $('recorded-preview').src = URL.createObjectURL(recordedBlob);
      $('recorded-preview').style.display = 'block';
      $('video-preview').style.display = 'none';
      $('video-preview').srcObject = null;
      recBar.style.display = 'none';
      $('btn-record').classList.add('hidden');
      $('btn-retake').classList.remove('hidden');
      videoBadge.textContent = 'DONE';
      videoBadge.className = 'step-badge step-badge--done';
      if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
      checkReady();
    };

    mediaRecorder.start(100);
    $('btn-record').classList.add('hidden');
    recBar.style.display = 'block';
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

    videoBadge.textContent = 'PENDING';
    videoBadge.className   = 'step-badge step-badge--pending';

    submitZone.classList.remove('visible');
    $('fence-result-box').style.display = 'none';
  });

  // ── STEP 3: Photo upload ──────────────────────────
  $('img-zone')?.addEventListener('click', () => $('img-input')?.click());

  $('img-input')?.addEventListener('change', () => {
    Array.from($('img-input').files || []).forEach(f => {
      if (imgFiles.length < 5) imgFiles.push(f);
    });
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
      submitZone.classList.add('visible');
      setTimeout(() => submitZone.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }

  // ── SUBMIT proof ──────────────────────────────────
  $('btn-submit')?.addEventListener('click', async () => {
    if (!workerLat || !workerLng) {
      alert('GPS not captured. Complete Step 1 first.');
      return;
    }
    if (!recordedBlob) {
      alert('No video recorded. Complete Step 2 first.');
      return;
    }

    const submitBtn  = $('btn-submit');
    const submitText = $('submit-text');
    const submitSpin = $('submit-spin');

    submitText.style.display = 'none';
    submitSpin.style.display = 'inline-block';
    submitBtn.disabled       = true;
// the location proof is based on the GPS coordinates at the time of recording, so we use gpsLocked (set at record start) if available, otherwise fallback to current workerLat/workerLng
    const lat = gpsLocked ? gpsLocked.lat : workerLat;
    const lng = gpsLocked ? gpsLocked.lng : workerLng;

    
    if (!lat || !lng) {
      alert('GPS coordinates are missing. Please redo Step 1 (GPS) and Step 2 (Video) before submitting.');
      submitText.style.display = 'inline';
      submitSpin.style.display = 'none';
      submitBtn.disabled = false;
      return;
    }
    const fd = new FormData();
    fd.append('job_id',    JOB_ID);
    fd.append('user_id',   USER_ID);
    fd.append('proof_lat', lat);
    fd.append('proof_lng', lng);

    // Add video
    const videoExt = recordedBlob.type.includes('mp4') ? '.mp4' : '.webm';
    fd.append('files', recordedBlob, `proof_video${videoExt}`);

    // Add photos
    imgFiles.forEach((f, i) => {
      const ext = f.name.match(/\.\w+$/)?.[0] || '.jpg';
      fd.append('files', f, `photo_${i}${ext}`);
    });

    try {
      // Step A: Upload media + run geofence check
      const mRes  = await fetch(`${FLASK}/api/job/upload-media`, {
        method: 'POST', body: fd, credentials: 'include'
      });

      if (!mRes.ok) {
        const errText = await mRes.text();
        throw new Error(`upload-media failed (${mRes.status}): ${errText.slice(0, 200)}`);
      }

      const mData = await mRes.json();
      console.log('[upload-media response]', mData);

      const resultBox = $('fence-result-box');
      resultBox.style.display = 'block';

      if (!mData.success) {
        resultBox.innerHTML = `
          <div class="fence-result fence-result--fail">
            <span class="fence-result__icon">❌</span>
            <div>
              <p class="fence-result__title" style="color:var(--danger)">Upload Failed</p>
              <p class="fence-result__msg">${mData.message || 'Unknown error'}</p>
            </div>
          </div>`;
        return;
      }

      if (mData.within_fence) {
        resultBox.innerHTML = `
          <div class="fence-result fence-result--pass">
            <span class="fence-result__icon">✅</span>
            <div>
              <p class="fence-result__title" style="color:var(--success)">Within Geofence</p>
              <p class="fence-result__msg">
                You are ${Math.round(mData.distance_m || 0)}m from the job site.
                Submitting for verification and payment release…
              </p>
            </div>
          </div>`;

        // Step B: Trigger verification + payout
        const vFd = new FormData();
        vFd.append('job_id',     JOB_ID);
        vFd.append('user_id',    USER_ID);
        vFd.append('worker_lat', lat);
        vFd.append('worker_lng', lng);
        vFd.append('video',      recordedBlob, `proof${videoExt}`);

        const vRes  = await fetch(`${FLASK}/api/verify-job`, {
          method: 'POST', body: vFd, credentials: 'include'
        });

        if (!vRes.ok) {
          const vErr = await vRes.text();
          throw new Error(`verify-job failed (${vRes.status}): ${vErr.slice(0, 200)}`);
        }

        const vData = await vRes.json();
        console.log('[verify-job response]', vData);

        if (vData.verified) {
          $('rating-prompt').style.display = 'block';
          Swal.fire({
            title: '💸 Payment Released!',
            html: `
              <p>Job verified! Payment sent to your Squad wallet.</p>
              ${vData.transfer_reference
                ? `<p style="font-family:monospace;font-size:.8rem;margin-top:8px;color:#a09890">Ref: ${vData.transfer_reference}</p>`
                : ''}`,
            icon: 'success',
            confirmButtonColor: '#e85c00',
            background: '#181614', color: '#f0ede8'
          });
        } else {
          resultBox.innerHTML = `
            <div class="fence-result fence-result--fail">
              <span class="fence-result__icon">⚠️</span>
              <div>
                <p class="fence-result__title" style="color:#fbbf24">Verification Pending</p>
                <p class="fence-result__msg">${vData.message || 'Could not verify at this time.'}</p>
              </div>
            </div>`;
        }

      } else {
        // Outside geofence
        const dist = mData.distance_m ? Math.round(mData.distance_m) : '?';
        resultBox.innerHTML = `
          <div class="fence-result fence-result--fail">
            <span class="fence-result__icon">❌</span>
            <div>
              <p class="fence-result__title" style="color:var(--danger)">Outside Geofence</p>
              <p class="fence-result__msg">
                You are <strong>${dist}m</strong> from the job site (must be within 100m).<br>
                <span style="color:#fbbf24">Move closer and resubmit. Media was saved but payment is on hold.</span>
              </p>
            </div>
          </div>`;

        Swal.fire({
          title: '📍 Too Far Away',
          text:  `You are ${dist}m from the job site. Move within 100m and try again.`,
          icon:  'warning',
          confirmButtonColor: '#e85c00',
          background: '#181614', color: '#f0ede8'
        });
      }

    } catch (e) {
      console.error('Submit error:', e);
      Swal.fire({
        title: 'Submission Failed',
        text:  e.message || 'Check Flask console for details.',
        icon:  'error',
        confirmButtonColor: '#e85c00',
        background: '#181614', color: '#f0ede8'
      });
    } finally {
      submitText.style.display = 'inline';
      submitSpin.style.display = 'none';
      submitBtn.disabled       = false;
    }
  });

  // ── Init ──────────────────────────────────────────
  loadJob();

  // Poll escrow every 15s — stops once funded
  const escrowPoll = setInterval(async () => {
    const funded = await checkEscrow();
    if (funded) clearInterval(escrowPoll);
  }, 15_000);

})();